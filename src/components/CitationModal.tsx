import React, { useState } from 'react';
import { X, BookOpen, User, Hash, ExternalLink, Bookmark, ShieldCheck, Check, FileText } from 'lucide-react';
import { Citation } from '../types';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  citation,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const handleCopyCitation = () => {
    const textToCopy = `"${citation.quote}"\n\nFuente: ${citation.docTitle} (${citation.author}), Capítulo: ${citation.chapter}, Página ${citation.page}. Base Normativa: ${citation.legalBasis || 'Derecho Tributario'}.`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cita Bibliográfica y Verificación RAG
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Página {citation.page} • Relevancia semántica {citation.relevanceScore}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3">
              <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Libro / Tratado</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {citation.docTitle}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3">
              <User className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Autor / Doctrina</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {citation.author}
                </p>
              </div>
            </div>
          </div>

          {/* Chapter & Page Details */}
          <div className="px-4 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Hash className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold">{citation.chapter}</span>
            </div>
            <span className="font-mono font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/50">
              Pág. {citation.page}
            </span>
          </div>

          {/* Quoted Text */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Fragmento Textual Indexado
            </span>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-l-4 border-amber-600 dark:border-amber-500 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed italic">
              "{citation.quote}"
            </div>
          </div>

          {/* Legal Basis / Articles */}
          {citation.legalBasis && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center space-x-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Normas y Artículos Concordados:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{citation.legalBasis}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <a
            href={import.meta.env.BASE_URL + 'api/documents/view/' + citation.docId}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Ver Documento Completo</span>
            <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCitation}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
              <span>{copied ? 'Copiado al portapapeles' : 'Copiar Cita'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
