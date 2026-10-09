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
 * Búsqueda VECTORIAL pura (pgvector <=> con bge-m3). [] si falla o no hay embeddings.
 */
async function vectorSearch(p: Pool, q: string, limit: number): Promise<any[]> {
  const vec = await embedQuery(q);
  if (!vec) return [];
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
  return r.rows;
}

/**
 * Búsqueda LÉXICA por etapas rápidas (la BD es remota: cada página de más cuesta):
 * 1) frase exacta 2) si vacía, todas-las-palabras (AND) 3) si vacía, similarity %.
 * Cada etapa trae LIMIT directo (probado: vuelve al instante) y ordena por fecha.
 * Sin similarity() en SQL: sobre miles de candidatos en tabla de GBs hace timeout.
 */
async function trigramSearch(p: Pool, q: string, limit: number): Promise<any[]> {
  const base = `id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma, left(content, 1200) AS head`;
  const order = `ORDER BY fecha_publicacion DESC NULLS LAST, id DESC LIMIT $`;
  const run = (text: string, values: any[]) =>
    p.query({ text, values, query_timeout: 25000 } as any);

  // 1. Frase exacta (cubre también consultas de 1 palabra). Score 2.
  try {
    const r = await run(
      `SELECT ${base}, 2 AS score FROM public.html_docs
       WHERE (sumilla ILIKE $1 ESCAPE '!' OR content ILIKE $1 ESCAPE '!')
       ${order}2`,
      [`%${likeEscape(q)}%`, limit]
    );
    if (r.rows.length > 0) return r.rows;
  } catch (err: any) {
    console.warn('[Legislation] Frase exacta falló:', err?.message || err);
  }

  // 2. Todas las palabras (AND). Score 1.
  const words = queryWords(q);
  if (words.length > 0) {
    try {
      const vals: any[] = [];
      const andConds = words.map((w) => {
        vals.push(`%${likeEscape(w)}%`);
        const ph = `$${vals.length}`;
        return `(sumilla ILIKE ${ph} ESCAPE '!' OR content ILIKE ${ph} ESCAPE '!')`;
      });
      vals.push(limit);
      const r = await run(
        `SELECT ${base}, 1 AS score FROM public.html_docs
         WHERE ${andConds.join(' AND ')}
         ORDER BY fecha_publicacion DESC NULLS LAST, id DESC LIMIT $${vals.length}`,
        vals
      );
      if (r.rows.length > 0) return r.rows;
    } catch (err: any) {
      console.warn('[Legislation] AND de palabras falló:', err?.message || err);
    }
  }

  // 3. Similarity % legado (último recurso).
  try {
    const r = await run(
      `SELECT ${base}, greatest(similarity(sumilla, $1), similarity(content, $1)) AS score
       FROM public.html_docs
       WHERE sumilla % $1 OR content % $1
       ORDER BY score DESC LIMIT $2`,
      [q, Math.min(limit, 10)]
    );
    return r.rows;
  } catch (err: any) {
    console.warn('[Legislation] Similarity falló:', err?.message || err);
    return [];
  }
}

/** Escapa comodines de LIKE (usando ESCAPE '!'). */
function likeEscape(s: string): string {
  return s.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

/** Palabras significativas de la consulta (para el AND léxico). */
function queryWords(q: string): string[] {
  return q
    .split(/\s+/)
    .map((w) => w.replace(/[^a-záéíóúñü0-9]/gi, ''))
    .filter((w) => w.length > 2)
    .slice(0, 8);
}

/**
 * Búsqueda HÍBRIDA: corre vectorial + léxica en paralelo y fusiona con
 * Reciprocal Rank Fusion (RRF, k=60). Lo que ambos rankings rescatan sube primero;
 * si un ranking falla o viene vacío, el otro sostiene el resultado.
 */
export async function searchLegislationHybrid(query: string, limit = 6): Promise<LegislationDoc[]> {
  const p = getPool();
  if (!p || !query.trim()) return [];
  const q = query.trim().slice(0, 500);
  const N = Math.max(limit * 2, 10);

  let vecRows: any[] = [];
  let triRows: any[] = [];
  try {
    [vecRows, triRows] = await Promise.all([
      vectorSearch(p, q, N).catch((err) => {
        console.warn('[Legislation] Vector falló en híbrida:', err?.message || err);
        return [];
      }),
      trigramSearch(p, q, N).catch((err) => {
        console.warn('[Legislation] Trigram falló en híbrida:', err?.message || err);
        return [];
      }),
    ]);
  } catch (err: any) {
    console.error('[Legislation] Híbrida falló:', err?.message || err);
    return [];
  }

  const K = 60;
  const fused = new Map<number, { row: any; score: number }>();
  const vote = (rows: any[]) => {
    rows.forEach((row, rank) => {
      const prev = fused.get(row.id);
      const s = 1 / (K + rank + 1);
      if (prev) prev.score += s;
      else fused.set(row.id, { row, score: s });
    });
  };
  vote(vecRows);
  vote(triRows);

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({ ...mapRow(row), score }));
}

/**
 * Búsqueda semántica para el RAG federado: ahora híbrida (vectorial + léxica con RRF).
 * Misma firma de antes: los llamadores no cambian.
 */
export async function searchLegislationSemantic(query: string, limit = 4): Promise<LegislationDoc[]> {
  return searchLegislationHybrid(query, limit);
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
    const qt = params.q.trim();
    const orParts: string[] = [];
    const phrasePh = push(`%${likeEscape(qt)}%`);
    orParts.push(`(sumilla ILIKE ${phrasePh} ESCAPE '!' OR content ILIKE ${phrasePh} ESCAPE '!')`);
    const words = queryWords(qt);
    if (words.length > 0) {
      const andParts = words.map((w) => {
        const ph = push(`%${likeEscape(w)}%`);
        return `(sumilla ILIKE ${ph} ESCAPE '!' OR content ILIKE ${ph} ESCAPE '!')`;
      });
      orParts.push(`(${andParts.join(' AND ')})`);
    }
    conds.push(`(${orParts.join(' OR ')})`);
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
