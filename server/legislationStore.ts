import { Pool } from 'pg';
import fs from 'fs';

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
  fileUrl?: string; // endpoint para mostrar el archivo original
  fileNormalized?: string; // ruta física normalizada en el VPS
  score?: number;
}

// Base documental en el VPS (override por env para otros entornos).
const DOCS_BASE = process.env.LEGISLATION_DOCS_BASE || '/srv/backend_documentos';

/**
 * Ruta directa del archivo según tipo_de_norma (siempre estilo POSIX: los archivos
 * viven en el VPS Linux aunque el backend corra en Windows para desarrollo):
 * Legislacion → /srv/backend_documentos/<title>
 * Jurisprudencia → /srv/backend_documentos/Jurisprudencia/<title>
 * Devuelve null si el título permitiría escapar de la base (path traversal).
 */
export function fileNormalizedFor(title: string, tipoDeNorma: string): string | null {
  if (!title) return null;
  const sub = tipoDeNorma === 'Jurisprudencia' ? 'Jurisprudencia/' : '';
  const rel = title.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel || rel.split('/').includes('..')) return null;
  return `${DOCS_BASE}/${sub}${rel}`;
}

/** URL pública del archivo (conserva el directorio real para que los assets
 *  relativos del HTML resuelvan). Se sirve vía express.static en /api/legislation/docs. */
export function fileHrefFor(title: string, tipoDeNorma: string): string | null {
  if (!title) return null;
  const sub = tipoDeNorma === 'Jurisprudencia' ? 'Jurisprudencia/' : '';
  const rel = title.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel || rel.split('/').includes('..')) return null;
  const href = `/api/legislation/docs/${sub}${rel}`.replace(/\/+/g, '/');
  return href.split('/').map((seg, i) => (i < 3 ? seg : encodeURIComponent(seg))).join('/');
}

/** Columnas mínimas para resolver el archivo (sin traer el content). */
export async function getLegislationFileInfo(id: number): Promise<{ id: number; title: string; tipoDeNorma: string } | null> {
  const p = getPool();
  if (!p || !Number.isInteger(id)) return null;
  try {
    const r = await p.query(
      { text: 'SELECT id, title, tipo_de_norma FROM public.html_docs WHERE id = $1', values: [id], query_timeout: 10000 } as any
    );
    if (r.rows.length === 0) return null;
    return { id: r.rows[0].id, title: r.rows[0].title, tipoDeNorma: r.rows[0].tipo_de_norma || 'Legislacion' };
  } catch (err: any) {
    console.error('[Legislation] fileInfo falló:', err?.message || err);
    return null;
  }
}

/** true si el archivo físico existe (para decidir si mostrar el botón "ver original"). */
export function legislationFileExists(title: string, tipoDeNorma: string): boolean {
  const fp = fileNormalizedFor(title, tipoDeNorma);
  if (!fp) return false;
  try {
    return fs.existsSync(fp);
  } catch {
    return false;
  }
}

const TEXT_EXTS = new Set(['.html', '.htm', '.txt', '.xml', '.css', '.json']);

/**
 * Lee el contenido del archivo físico desde fileNormalized.
 * Texto (html/txt/...) → { kind:'text', content }; PDF/binario → { kind:'pdf', fileUrl }.
 */
export async function readLegislationFile(id: number): Promise<
  | { kind: 'text'; content: string; fileName: string; fileNormalized: string }
  | { kind: 'pdf'; fileUrl: string; fileName: string; fileNormalized: string }
  | null
> {
  const info = await getLegislationFileInfo(id);
  if (!info) return null;
  const fp = fileNormalizedFor(info.title, info.tipoDeNorma);
  if (!fp) return null;
  const ext = fp.slice(fp.lastIndexOf('.')).toLowerCase();
  const fileUrl = fileHrefFor(info.title, info.tipoDeNorma) || undefined;
  if (TEXT_EXTS.has(ext)) {
    try {
      const content = await fs.promises.readFile(fp, 'utf-8');
      return { kind: 'text', content, fileName: info.title, fileNormalized: fp };
    } catch {
      return null;
    }
  }
  // PDF u otro binario: se muestra vía URL estática
  try {
    await fs.promises.access(fp, fs.constants.R_OK);
  } catch {
    return null;
  }
  if (!fileUrl) return null;
  return { kind: 'pdf', fileUrl, fileName: info.title, fileNormalized: fp };
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
  const tipoDeNorma = r.tipo_de_norma || 'Legislacion';
  return {
    id: r.id,
    title: r.title,
    sumilla,
    excerpt,
    tipoNorma: r.tipo_norma ?? null,
    fechaPublicacion: r.fecha_publicacion
      ? new Date(r.fecha_publicacion).toISOString().slice(0, 10)
      : null,
    tipoDeNorma,
    fileUrl: fileHrefFor(r.title, tipoDeNorma) || undefined,
    fileNormalized: fileNormalizedFor(r.title, tipoDeNorma) || undefined,
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
): Promise<{ results: LegislationDoc[]; total: number; limit: number; offset: number; latestOnly?: boolean; latestDate?: string }> {
  const limit = Math.min(Math.max(params.limit || 20, 1), 100);
  const offset = Math.max(params.offset || 0, 0);
  const p = getPool();
  if (!p) return { results: [], total: 0, limit, offset };

  const conds: string[] = [];
  const baseVals: any[] = [];
  const basePush = (v: any) => { baseVals.push(v); return `$${baseVals.length}`; };
  let phraseVal: string | null = null;
  let wordVals: string[] = [];

  const di = params.fechaInicial;
  const df = params.fechaFinal;
  if (di && df) {
    conds.push(`fecha_publicacion BETWEEN ${basePush(di)}::date AND ${basePush(df)}::date`);
  } else if (di) {
    conds.push(`fecha_publicacion = ${basePush(di)}::date`);
  } else if (df) {
    conds.push(`fecha_publicacion <= ${basePush(df)}::date`);
  }
  if (params.q && params.q.trim()) {
    const qt = params.q.trim();
    phraseVal = `%${likeEscape(qt)}%`;
    wordVals = queryWords(qt).map((w) => `%${likeEscape(w)}%`);
  }
  if (params.tipo && params.tipo.trim()) {
    conds.push(`tipo_de_norma = ${basePush(params.tipo.trim())}`);
  }
  // Sin ningún parámetro: solo los registros de la ÚLTIMA fecha disponible
  const defaultLatest = conds.length === 0 && phraseVal === null && wordVals.length === 0;
  if (defaultLatest) {
    conds.push(`fecha_publicacion = (SELECT MAX(fecha_publicacion) FROM public.html_docs)`);
  }
  // Cada etapa arma SU propio SQL con SU propio array de valores (nada compartido).
  const likePair = (ph: string) => `(sumilla ILIKE ${ph} ESCAPE '!' OR content ILIKE ${ph} ESCAPE '!')`;
  const nBase = baseVals.length;
  const at = (i: number) => `$${nBase + i}`; // placeholders relativos tras los baseVals
  const baseWhere = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  const andBase = (extra: string) => (baseWhere ? `${baseWhere} AND ${extra}` : `WHERE ${extra}`);
  const phraseCond = phraseVal !== null ? likePair(at(1)) : '';
  const wordAndCond = wordVals.length > 0
    ? `(${wordVals.map((_, k) => likePair(at(2 + k))).join(' AND ')})`
    : '';
  // Conteo con filtro completo (sin ORDER BY: rápido aunque haya miles de matches)
  const countWhere = phraseCond
    ? andBase(wordAndCond ? `(${phraseCond} OR ${wordAndCond})` : phraseCond)
    : baseWhere;
  const countVals = [...baseVals];
  if (phraseVal !== null) countVals.push(phraseVal);
  countVals.push(...wordVals);
  const selectCols = `id, title, sumilla, tipo_norma, fecha_publicacion, tipo_de_norma, left(content, 1200) AS head`;
  const orderLim = `ORDER BY fecha_publicacion DESC NULLS LAST, id DESC LIMIT ${limit} OFFSET ${offset}`;

  try {
    // Filas por etapas (igual que la rama léxica híbrida): frase, si vacía AND de palabras.
    // Cada etapa combina baseVals + sus valores (los conds ya vienen numerados con at()).
    let rows: any[] = [];
    if (phraseVal !== null) {
      const r = await p.query(
        {
          text: `SELECT ${selectCols} FROM public.html_docs ${andBase(phraseCond)} ${orderLim}`,
          values: [...baseVals, phraseVal],
          query_timeout: 25000,
        } as any
      );
      rows = r.rows;
    }
    if (rows.length === 0 && wordVals.length > 0) {
      const wCond = `(${wordVals.map((_, k) => likePair(`$${nBase + k + 1}`)).join(' AND ')})`;
      const r = await p.query(
        {
          text: `SELECT ${selectCols} FROM public.html_docs ${andBase(wCond)} ${orderLim}`,
          values: [...baseVals, ...wordVals],
          query_timeout: 25000,
        } as any
      );
      rows = r.rows;
    }
    if (rows.length === 0 && !phraseCond && !wordAndCond) {
      const r = await p.query(
        {
          text: `SELECT ${selectCols} FROM public.html_docs ${baseWhere} ${orderLim}`,
          values: baseVals,
          query_timeout: 25000,
        } as any
      );
      rows = r.rows;
    }
    const cnt = await p.query(
      { text: `SELECT count(*)::int AS total FROM public.html_docs ${countWhere}`, values: countVals, query_timeout: 25000 } as any
    );
    const mapped = rows.map(mapRow);
    return {
      results: mapped, total: cnt.rows[0]?.total || 0, limit, offset,
      ...(defaultLatest ? { latestOnly: true as const, latestDate: mapped[0]?.fechaPublicacion || undefined } : {}),
    };
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
    const tipoDeNorma = row.tipo_de_norma || 'Legislacion';
    return {
      id: row.id,
      title: row.title,
      sumilla: row.sumilla,
      tipoNorma: row.tipo_norma,
      fechaPublicacion: row.fecha_publicacion
        ? new Date(row.fecha_publicacion).toISOString().slice(0, 10)
        : null,
      tipoDeNorma,
      fileUrl: fileHrefFor(row.title, tipoDeNorma) || undefined,
      fileNormalized: fileNormalizedFor(row.title, tipoDeNorma) || undefined,
      hasFile: legislationFileExists(row.title, tipoDeNorma),
      content: row.content,
    };
  } catch (err: any) {
    console.error('[Legislation] getById falló:', err?.message || err);
    return null;
  }
}
