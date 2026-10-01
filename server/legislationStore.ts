import { Pool } from 'pg';

// Acceso a la 2da BD Postgres (tabla public.html_docs).
// Nunca tumba el chat: sin LEGISLATION_DATABASE_URL o con la BD caída,
// todas las funciones devuelven [] / vacío y el RAG sigue solo con doctrina.

export interface LegislationDoc {
  id: number;
  title: string;
  sumilla: string | null;
  excerpt: string; // texto plano: sumilla o inicio del content sin HTML
  tipoNorma: any; // json
  fechaPublicacion: string | null; // YYYY-MM-DD
  tipoDeNorma: string;
  score?: number;
}

let pool: Pool | null = null;

function getPool(): Pool | null {
  const url = process.env.LEGISLATION_DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => console.error('[Legislation] Pool error:', err?.message || err));
  }
  return pool;
}

/** Quita etiquetas HTML y colapsa espacios (content viene con HTML). */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapRow(r: any): LegislationDoc {
  const sumilla: string | null = r.sumilla || null;
  const excerpt = (sumilla || stripHtml(r.head || r.content || '')).slice(0, 600);
  return {
    id: r.id,
    title: r.title,
    sumilla,
    excerpt,
    tipoNorma: r.tipo_norma ?? null,
    fechaPublicacion: r.fecha_publicacion
      ? new Date(r.fecha_publicacion).toISOString().slice(0, 10)
      : null,
    tipoDeNorma: r.tipo_de_norma || 'Legislacion',
    score: typeof r.score === 'number' ? r.score : undefined,
  };
}

/** Embebe la consulta con bge-m3 vía HuggingFace Inference API (1024 dims). Null si falla. */
async function embedQuery(text: string): Promise<number[] | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-m3', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text.slice(0, 2000) }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[Legislation] HF bge-m3 falló (${res.status}). Uso trigram.`);
      return null;
    }
    const data: any = await res.json();
    const vec = Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : null;
    if (!vec || vec.length < 100) return null;
    return vec as number[];
  } catch (err: any) {
    console.warn('[Legislation] HF bge-m3 error, uso trigram:', err?.message || err);
    return null;
  }
}

/**
 * Búsqueda semántica para el RAG federado: pgvector <=> con bge-m3,
 * con fallback a trigramas (similarity sobre sumilla/content).
 */
export async function searchLegislationSemantic(query: string, limit = 4): Promise<LegislationDoc[]> {
  const p = getPool();
  if (!p || !query.trim()) return [];
  const q = query.trim().slice(0, 500);

  // 1. Vector (pgvector). Si falta la extensión o falla HF → cae al trigram.
  try {
    const vec = await embedQuery(q);
    if (vec) {
      const literal = `[${vec.join(',')}]`;
      const r = await p.query(
        {
          text: `SELECT id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma,
                        left(content, 1200) AS head,
                        1 - (embedding <=> $1::vector) AS score
                 FROM public.html_docs
                 ORDER BY embedding <=> $1::vector
                 LIMIT $2`,
          values: [literal, limit],
          query_timeout: 15000,
        } as any
      );
      if (r.rows.length > 0) return r.rows.map(mapRow);
    }
  } catch (err: any) {
    console.warn('[Legislation] Vector search falló, uso trigram:', err?.message || err);
  }

  // 2. Trigram (usa idx_sumilla_trgm / idx_content_trgm existentes).
  try {
    const r = await p.query(
      {
        text: `SELECT id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma,
                      left(content, 1200) AS head,
                      greatest(similarity(sumilla, $1), similarity(content, $1)) AS score
               FROM public.html_docs
               WHERE sumilla % $1 OR content % $1
               ORDER BY score DESC
               LIMIT $2`,
        values: [q, limit],
        query_timeout: 15000,
      } as any
    );
    return r.rows.map(mapRow);
  } catch (err: any) {
    console.error('[Legislation] Trigram search falló:', err?.message || err);
    return [];
  }
}

export interface StructuredSearchParams {
  q?: string;
  fechaInicial?: string; // YYYY-MM-DD: sola → igualdad; con final → rango
  fechaFinal?: string; // YYYY-MM-DD
  tipo?: string; // filtra tipo_de_norma
  limit?: number;
  offset?: number;
}

/**
 * Búsqueda estructurada del tab Normativa:
 * - solo fecha_inicial → normas publicadas ESE DÍA
 * - ambas fechas → rango inclusivo BETWEEN
 * - q → sumilla ILIKE %q% OR content ILIKE %q%
 */
export async function searchLegislationStructured(
  params: StructuredSearchParams
): Promise<{ results: LegislationDoc[]; total: number; limit: number; offset: number }> {
  const limit = Math.min(Math.max(params.limit || 20, 1), 100);
  const offset = Math.max(params.offset || 0, 0);
  const p = getPool();
  if (!p) return { results: [], total: 0, limit, offset };

  const conds: string[] = [];
  const vals: any[] = [];
  const push = (v: any) => { vals.push(v); return `$${vals.length}`; };

  const di = params.fechaInicial;
  const df = params.fechaFinal;
  if (di && df) {
    conds.push(`fecha_publicacion BETWEEN ${push(di)}::date AND ${push(df)}::date`);
  } else if (di) {
    conds.push(`fecha_publicacion = ${push(di)}::date`);
  } else if (df) {
    conds.push(`fecha_publicacion <= ${push(df)}::date`);
  }
  if (params.q && params.q.trim()) {
    const ph = push(`%${params.q.trim()}%`);
    conds.push(`(sumilla ILIKE ${ph} OR content ILIKE ${ph})`);
  }
  if (params.tipo && params.tipo.trim()) {
    conds.push(`tipo_de_norma = ${push(params.tipo.trim())}`);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';

  try {
    const [rows, cnt] = await Promise.all([
      p.query(
        {
          text: `SELECT id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma,
                        left(content, 1200) AS head
                 FROM public.html_docs ${where}
                 ORDER BY fecha_publicacion DESC NULLS LAST, id DESC
                 LIMIT ${limit} OFFSET ${offset}`,
          values: vals,
          query_timeout: 15000,
        } as any
      ),
      p.query(
        { text: `SELECT count(*)::int AS total FROM public.html_docs ${where}`, values: vals, query_timeout: 15000 } as any
      ),
    ]);
    return { results: rows.rows.map(mapRow), total: cnt.rows[0]?.total || 0, limit, offset };
  } catch (err: any) {
    console.error('[Legislation] Structured search falló:', err?.message || err);
    return { results: [], total: 0, limit, offset };
  }
}

/** Detalle completo de una norma (tab Normativa / modal). Content con HTML original. */
export async function getLegislationById(id: number): Promise<any | null> {
  const p = getPool();
  if (!p || !Number.isInteger(id)) return null;
  try {
    const r = await p.query(
      {
        text: `SELECT id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma, content
               FROM public.html_docs WHERE id = $1`,
        values: [id],
        query_timeout: 15000,
      } as any
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    return {
      id: row.id,
      title: row.title,
      sumilla: row.sumilla,
      tipoNorma: row.tipo_norma,
      fechaPublicacion: row.fecha_publicacion
        ? new Date(row.fecha_publicacion).toISOString().slice(0, 10)
        : null,
      tipoDeNorma: row.tipo_de_norma,
      content: row.content,
    };
  } catch (err: any) {
    console.error('[Legislation] getById falló:', err?.message || err);
    return null;
  }
}
