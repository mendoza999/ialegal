import React, { useState, useEffect, useCallback } from 'react';
import { Search, CalendarDays, FileText, ChevronLeft, ChevronRight, X, Scale, Tag } from 'lucide-react';
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface LegislationResult {
  id: number;
  title: string;
  sumilla: string | null;
  excerpt: string;
  tipoNorma: any;
  fechaPublicacion: string | null;
  tipoDeNorma: string;
}

const PAGE_SIZE = 20;

export const LegislationLibrary: React.FC = () => {
  const [q, setQ] = useState('');
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [tipo, setTipo] = useState('');
  const [results, setResults] = useState<LegislationResult[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function toSafeHtml(raw?: string) {
    if (!raw) return '';
    let html = raw;

    // 1) Si viene escapado (&lt;p&gt;), lo decodifica
    if (/&lt;\/?[a-z][\s\S]*?&gt;/i.test(html)) {
      const t = document.createElement('textarea');
      t.innerHTML = html;
      html = t.value;
    }

    // 2) Texto plano → HTML con estructura legal: encabezados (Artículo, Título,
    // Capítulo, Sección, Disposición…), párrafos y saltos de línea
    if (!/<\/?[a-z][\s\S]*>/i.test(html)) {
      html = html
        .split(/\n{2,}/)
        .map(block => {
          const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
          return lines.map(line => {
            if (/^(art[íi]culo\s+\S+|cap[íi]tulo\s+\S+|t[íi]tulo\s+\S+|secci[óo]n\s+\S+|disposici[óo]n\s+\S+|anexo\s*\S*|considerando|por cuanto|decreta|resuelve)\b/i.test(line)) {
              return `<h4>${line}</h4>`;
            }
            return `<p>${line}</p>`;
          }).join('');
        })
        .join('');
    }

    // 3) Limpia scripts y atributos peligrosos
    return DOMPurify.sanitize(html);
  }


  const runSearch = useCallback(async (nextOffset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (fechaInicial) params.set('fecha_inicial', fechaInicial);
      if (fechaFinal) params.set('fecha_final', fechaFinal);
      if (tipo.trim()) params.set('tipo', tipo.trim());
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(nextOffset));
      const res = await fetch(`${import.meta.env.BASE_URL}api/legislation/search?${params.toString()}`);
      const data = await res.json();
      if (data?.success) {
        setResults(data.results || []);
        setTotal(data.total || 0);
        setOffset(data.offset || 0);
      }
    } catch (err) {
      console.error('Error buscando normativa:', err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [q, fechaInicial, fechaFinal, tipo]);

  // Carga inicial: últimas normas publicadas
  useEffect(() => {
    runSearch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/legislation/${id}`);
      const data = await res.json();
      if (data?.success) setDetail(data.doc);
    } catch (err) {
      console.error('Error obteniendo norma:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const contentHtml = useMemo(() => toSafeHtml(detail?.content), [detail?.content]);

  return (
    <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
      <div className="flex items-center space-x-2">
        <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-bold">Normativa Vigente</h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
          Normas Legales
        </span>
      </div>

      {/* Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Texto (sumilla o contenido)</span>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(0); }}
              placeholder="Ej. gratificaciones, IGV…"
              className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Fecha inicial</span>
            <input
              type="date"
              value={fechaInicial}
              onChange={e => setFechaInicial(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Fecha final</span>
            <input
              type="date"
              value={fechaFinal}
              onChange={e => setFechaFinal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-500"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Tipo de norma</span>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-emerald-500"
            >
              <option value="">Todas</option>
              <option value="Jurisprudencia">Jurisprudencia</option>
              <option value="Legislacion">Legislacion</option>
            </select>
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => runSearch(0)}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{loading ? 'Buscando…' : 'Buscar normas'}</span>
          </button>
          {(q || fechaInicial || fechaFinal || tipo) && (
            <button
              onClick={() => { setQ(''); setFechaInicial(''); setFechaFinal(''); setTipo(''); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Limpiar
            </button>
          )}
          {searched && (
            <span className="text-[11px] text-slate-400 ml-auto">{total} resultado{total === 1 ? '' : 's'}</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          Solo fecha inicial = normas publicadas ese día · Ambas fechas = rango inclusivo.
        </p>
      </div>

      {/* Resultados */}
      <div className="space-y-2">
        {results.map(r => (
          <div
            key={r.id}
            onClick={() => openDetail(r.id)}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer transition-all shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold leading-snug">{r.title}</p>
              {r.fechaPublicacion && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold whitespace-nowrap shrink-0">
                  <CalendarDays className="h-3 w-3" />
                  <span>{r.fechaPublicacion}</span>
                </span>
              )}
            </div>
            {(r.sumilla || r.excerpt) && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {r.sumilla || r.excerpt}
              </p>
            )}
            <div className="flex items-center space-x-2 mt-1.5">
              <span className="inline-flex items-center space-x-1 text-[10px] text-slate-400">
                <Tag className="h-3 w-3" />
                <span>{r.tipoDeNorma}</span>
              </span>
            </div>
          </div>
        ))}
        {searched && results.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-slate-400 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            Sin resultados. Si la base de normativa no está configurada (LEGISLATION_DATABASE_URL), el chat sigue funcionando solo con doctrina.
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-3 text-xs font-semibold">
          <button
            onClick={() => runSearch(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-slate-500">Pág. {currentPage} de {totalPages}</span>
          <button
            onClick={() => runSearch(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total || loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Detalle */}
      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs" onClick={() => setDetailId(null)}>
          <div
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{detail?.title || `Norma #${detailId}`}</h3>
                  <p className="text-xs text-slate-500">
                    {detail?.tipoDeNorma || ''}{detail?.fechaPublicacion ? ` · Pub. ${detail.fechaPublicacion}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm leading-relaxed">
              {detailLoading && <p className="text-slate-400">Cargando norma…</p>}
              {detail?.sumilla && (
                <p className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-[13px] italic">
                  {detail.sumilla}
                </p>
              )}
              {contentHtml && (
                <div
                  className="leg-content max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
