import React, { useState } from 'react';
import { 
  BookOpen, 
  Copy, 
  Check, 
  Bookmark, 
  Sparkles, 
  Scale, 
  ExternalLink, 
  HardDrive, 
  FileText,
  Tag,
  Globe
} from 'lucide-react';
import { DoctrinalEntry } from '../types';
import { 
  getDocumentOriginalUrl, 
  getDocumentSourceInfo, 
  formatFormalLegalCitation,
  getArticleSearchUrl,
  getJurisprudenceSearchUrl 
} from '../utils/documentLinks';

interface DoctrinalCardProps {
  entry: DoctrinalEntry;
  onOpenReader: (entry: DoctrinalEntry) => void;
  onExtractAiFicha: (entry: DoctrinalEntry) => void;
  onSaveCitation: (entry: DoctrinalEntry) => void;
  onFilterByArticle: (article: string) => void;
  isSaved?: boolean;
}

export const DoctrinalCard: React.FC<DoctrinalCardProps> = ({
  entry,
  onOpenReader,
  onExtractAiFicha,
  onSaveCitation,
  onFilterByArticle,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const docInfo = getDocumentSourceInfo(entry);

  const handleCopyCitation = async () => {
    const citation = formatFormalLegalCitation(entry);
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying citation:', err);
    }
  };

  return (
    <article className="bg-[#111114] rounded-xl border border-[#222226] hover:border-[#D4AF37]/60 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Header Banner */}
      <div className="bg-[#0D0D10] px-5 py-3 border-b border-[#222226] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {entry.isDriveSource ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#12231A] text-emerald-400 border border-emerald-800/60 font-mono">
              <HardDrive className="w-3 h-3 mr-1 text-emerald-400" />
              Libro en Google Drive
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#1A1A1E] text-[#D4AF37] border border-[#D4AF37]/40 font-mono">
              <Scale className="w-3 h-3 mr-1 text-[#D4AF37]" />
              Doctrina & Tratado
            </span>
          )}

          <span className="text-[11px] font-medium text-[#888] bg-[#16161A] px-2 py-0.5 rounded border border-[#222226]">
            {entry.category}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#666] font-mono">
          <a
            href={docInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-[11px] text-[#D4AF37] hover:text-[#f1cb5b] bg-[#1A1A1E] px-2 py-0.5 rounded border border-[#222226] hover:border-[#D4AF37]/40 transition-colors"
            title="Abrir enlace directo al documento original"
          >
            <Globe className="w-3 h-3" />
            <span>{docInfo.label}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span>•</span>
          <span className="text-[#888]">{entry.year}</span>
          {entry.pageNumber && (
            <>
              <span>•</span>
              <span className="text-[#888]">{entry.pageNumber}</span>
            </>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col space-y-4">
        
        {/* Title & Author */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 
              onClick={() => onOpenReader(entry)}
              className="text-lg sm:text-xl font-serif font-bold text-white hover:text-[#D4AF37] cursor-pointer transition-colors leading-snug"
            >
              {entry.title}
            </h2>
            <a
              href={docInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-[#16161A] text-[#888] hover:text-[#D4AF37] border border-[#222226] hover:border-[#D4AF37]/50 transition-colors flex-shrink-0"
              title="Abrir documento original en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center space-x-2 text-sm text-[#888] mt-1.5 flex-wrap">
            <span className="font-semibold text-[#CCC]">{entry.author}</span>
            {entry.publisher && (
              <>
                <span>—</span>
                <span className="italic text-xs text-[#888]">{entry.publisher}</span>
              </>
            )}
          </div>
          {entry.institution && (
            <div className="mt-2 text-xs font-semibold text-[#D4AF37] bg-[#1A1A1E] inline-block px-2.5 py-0.5 rounded border border-[#222226]">
              Institución: {entry.institution}
            </div>
          )}
        </div>

        {/* Ratio Dogmática / Tesis Doctrinal Box */}
        <div className="bg-[#16161A] border-l-2 border-[#D4AF37] rounded-r-lg p-4 text-[#D1D1D1] space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Ratio Dogmática / Tesis Central:</span>
          </div>
          <p className="text-sm font-serif italic leading-relaxed text-[#EDEDED]">
            "{entry.ratioDoctrinal}"
          </p>
        </div>

        {/* Key Excerpt */}
        {entry.keyExcerpt && (
          <div className="space-y-1 text-sm text-[#BBB]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">
              Extracto y Fundamento Jurídico:
            </div>
            <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans leading-relaxed line-clamp-4 bg-[#0E0E11] p-3 rounded-lg border border-[#222226]">
              {entry.keyExcerpt}
            </p>
          </div>
        )}

        {/* Linked Articles & Jurisprudence */}
        <div className="space-y-2 pt-2 border-t border-[#222226]">
          {entry.linkedArticles && entry.linkedArticles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#666] mr-1 flex items-center">
                <Tag className="w-3 h-3 mr-1 text-[#D4AF37]" /> Normativa:
              </span>
              {entry.linkedArticles.map((art) => (
                <div key={art} className="inline-flex items-center">
                  <button
                    onClick={() => onFilterByArticle(art)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-l bg-[#16161A] text-[#CCC] hover:border-[#D4AF37]/60 hover:text-white border border-r-0 border-[#222226] transition-colors"
                    title={`Filtrar por ${art}`}
                  >
                    {art}
                  </button>
                  <a
                    href={getArticleSearchUrl(art)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-r bg-[#1A1A1E] text-[#888] hover:text-[#D4AF37] border border-[#222226] hover:border-[#D4AF37]/40 transition-colors"
                    title={`Consultar texto de ${art} en legislación oficial`}
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {entry.jurisprudenceReferences && entry.jurisprudenceReferences.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#666] mr-1 flex items-center">
                <Scale className="w-3 h-3 mr-1 text-blue-400" /> Jurisprudencia:
              </span>
              {entry.jurisprudenceReferences.map((ref) => (
                <a
                  key={ref}
                  href={getJurisprudenceSearchUrl(ref)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[#121824] hover:bg-[#1a2538] text-blue-300 border border-[#1e3a5f] hover:border-blue-400 transition-colors"
                  title="Ver jurisprudencia en repositorio oficial"
                >
                  <span>{ref}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Keywords */}
        {entry.keywords && entry.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.keywords.map((kw) => (
              <span
                key={kw}
                className="text-[10px] px-2 py-0.5 rounded bg-[#16161A] text-[#666] border border-[#222226]"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

      </div>

      {/* Footer Actions Toolbar */}
      <div className="bg-[#0D0D10] px-5 py-3 border-t border-[#222226] flex items-center justify-between flex-wrap gap-2 text-xs">
        
        {/* Left Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenReader(entry)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#D4AF37] text-[#0A0A0C] hover:bg-[#c5a030] font-bold text-xs uppercase tracking-wider transition-colors shadow"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lector & Visor</span>
          </button>

          <a
            href={docInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[#16161A] text-[#D4AF37] hover:bg-[#1A1A1E] border border-[#222226] hover:border-[#D4AF37]/50 font-semibold transition-colors text-xs"
            title={`Abrir documento original en ${docInfo.label}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Original</span>
          </a>

          <button
            onClick={() => onExtractAiFicha(entry)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[#16161A] text-[#888] hover:text-white hover:bg-[#1A1A1E] border border-[#222226] hover:border-[#D4AF37]/30 font-medium transition-colors text-xs"
            title="Generar Ficha Doctrinal estructurada con IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Ficha IA</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCitation}
            className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
              copied
                ? 'bg-[#12231A] border-emerald-700/60 text-emerald-400'
                : 'bg-[#16161A] border-[#222226] text-[#888] hover:text-white hover:border-[#D4AF37]/40'
            }`}
            title="Copiar cita jurídica con enlace al documento"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#666]" />
                <span>Copiar Cita</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSaveCitation(entry)}
            className={`p-1.5 rounded border transition-colors ${
              isSaved
                ? 'bg-[#1A1A1E] border-[#D4AF37] text-[#D4AF37]'
                : 'bg-[#16161A] border-[#222226] text-[#666] hover:text-[#D4AF37] hover:border-[#D4AF37]/40'
            }`}
            title={isSaved ? 'Cita guardada en tu repertorio' : 'Guardar cita en mis marcadores'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        </div>

      </div>
    </article>
  );
};

