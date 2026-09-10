import React, { useState } from 'react';
import { 
  Bookmark, 
  Copy, 
  Trash2, 
  Download, 
  Check, 
  BookOpen, 
  FileText, 
  ExternalLink,
  Globe,
  HardDrive,
  Tag
} from 'lucide-react';
import { SavedCitation, DoctrinalEntry } from '../types';
import { 
  getDocumentOriginalUrl, 
  getDocumentSourceInfo, 
  formatFormalLegalCitation 
} from '../utils/documentLinks';

interface SavedCitationsModalProps {
  savedCitations: SavedCitation[];
  onRemoveCitation: (id: string) => void;
  onClearAll: () => void;
  allEntries?: DoctrinalEntry[];
  onOpenReader?: (entry: DoctrinalEntry) => void;
}

export const SavedCitationsModal: React.FC<SavedCitationsModalProps> = ({
  savedCitations,
  onRemoveCitation,
  onClearAll,
  allEntries = [],
  onOpenReader,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const getEntryForCitation = (c: SavedCitation): DoctrinalEntry => {
    const matched = allEntries.find((e) => e.id === c.entryId);
    if (matched) return matched;

    return {
      id: c.entryId,
      title: c.title,
      author: c.author,
      year: c.year,
      category: c.category || 'DOCTRINA GENERAL Y PRINCIPIOS',
      institution: c.institution || 'Doctrina Tributaria',
      linkedArticles: c.linkedArticles || [],
      ratioDoctrinal: c.citationText,
      keyExcerpt: c.citationText,
      pageNumber: c.pageNumber,
      keywords: c.tags || ['Doctrina'],
      sourceUrl: c.sourceUrl,
      originalDocumentUrl: c.originalDocumentUrl,
      driveViewLink: c.driveViewLink,
      driveDownloadLink: c.driveDownloadLink,
      isDriveSource: !!c.driveViewLink,
    };
  };

  const handleCopySingle = async (c: SavedCitation) => {
    const formalCitation = formatFormalLegalCitation(c);
    try {
      await navigator.clipboard.writeText(formalCitation);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyAllMarkdown = async () => {
    const fullText = savedCitations
      .map((c, idx) => {
        const docUrl = getDocumentOriginalUrl(c);
        const formalCitation = formatFormalLegalCitation(c);
        return `### ${idx + 1}. [${c.title}](${docUrl}) — ${c.author} (${c.year})\n\n- **Citación Jurídica:** ${formalCitation}\n- **Enlace al Documento Original:** [${docUrl}](${docUrl})\n\n**Extracto Doctrinal:**\n> "${c.citationText}"\n\n${
          c.personalNotes ? `**Apuntes de Investigación:**\n${c.personalNotes}\n\n` : ''
        }---\n`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadFile = () => {
    const fullText = `# Repertorio de Citas & Fichas Doctrinales Tributarias\nGenerado desde: Portal Tributario Jurídico\nFecha: ${new Date().toLocaleDateString()}\nTotal de Citas: ${savedCitations.length}\n\n` +
      savedCitations
        .map((c, idx) => {
          const docUrl = getDocumentOriginalUrl(c);
          const formalCitation = formatFormalLegalCitation(c);
          return `## ${idx + 1}. ${c.title}\n- **Autor:** ${c.author} (${c.year})\n- **Citación APA / Legal:** ${formalCitation}\n- **Documento Original:** [Abrir Documento](${docUrl})\n\n> "${c.citationText}"\n\n${
            c.personalNotes ? `*Apuntes del Investigador:*\n${c.personalNotes}\n\n` : ''
          }\n---\n`;
        })
        .join('\n');

    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas-doctrinales-tributarias-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center space-x-2">
            <Bookmark className="w-6 h-6 text-[#D4AF37] fill-current" />
            <span>Mis Citas & Fichas Doctrinales Guardadas</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#888]">
            {savedCitations.length} referencias y extractos vinculados a sus fuentes y documentos originales.
          </p>
        </div>

        {savedCitations.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <button
              onClick={handleCopyAllMarkdown}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded bg-[#16161A] border border-[#222226] text-[#CCC] hover:bg-[#1A1A1E] text-xs font-semibold shadow transition-colors"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#888]" />}
              <span>{copiedAll ? 'Copiado' : 'Copiar Todo'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] text-xs font-bold uppercase tracking-wider shadow transition-colors"
            >
              <Download className="w-4 h-4 text-[#0A0A0C]" />
              <span>Exportar (.MD)</span>
            </button>

            <button
              onClick={onClearAll}
              className="p-2 rounded text-[#666] hover:text-rose-400 hover:bg-[#16161A] transition-colors"
              title="Borrar todas las citas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {savedCitations.length === 0 ? (
        <div className="bg-[#111114] rounded-2xl border border-[#222226] p-12 text-center space-y-4 shadow-xl">
          <Bookmark className="w-12 h-12 text-[#333] mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-serif font-bold text-white">
              No tienes citas guardadas aún
            </h2>
            <p className="text-xs text-[#666] max-w-sm mx-auto">
              Navega por el Repertorio Doctrinal o por la biblioteca de Google Drive y haz clic en el ícono de marcador para guardar extractos con enlace directo al documento original.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {savedCitations.map((c) => {
            const docInfo = getDocumentSourceInfo(c);
            const entryForReader = getEntryForCitation(c);

            return (
              <div
                key={c.id}
                className="bg-[#111114] rounded-xl border border-[#222226] p-5 shadow-lg space-y-4 hover:border-[#D4AF37]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <a
                      href={docInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base sm:text-lg font-serif font-bold text-white hover:text-[#D4AF37] transition-colors inline-flex items-baseline space-x-1.5 group"
                    >
                      <span>{c.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#888] group-hover:text-[#D4AF37] inline opacity-70" />
                    </a>
                    <div className="text-xs text-[#888] mt-0.5 flex items-center space-x-2 flex-wrap">
                      <span className="font-semibold text-[#CCC]">{c.author}</span>
                      <span>({c.year})</span>
                      <span>•</span>
                      <span>Guardado el {c.dateSaved}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopySingle(c)}
                      className="p-1.5 rounded bg-[#16161A] border border-[#222226] hover:bg-[#1A1A1E] text-[#888] hover:text-white transition-colors"
                      title="Copiar cita jurídica con enlace"
                    >
                      {copiedId === c.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => onRemoveCitation(c.id)}
                      className="p-1.5 rounded bg-[#16161A] border border-[#222226] hover:bg-rose-950/30 text-[#888] hover:text-rose-400 transition-colors"
                      title="Eliminar de guardados"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Direct Action Links to View Original Document & Reader */}
                <div className="flex items-center space-x-2 flex-wrap gap-2 pt-1 border-t border-[#222226]">
                  <a
                    href={docInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Documento Original</span>
                  </a>

                  {onOpenReader && (
                    <button
                      onClick={() => onOpenReader(entryForReader)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#16161A] hover:bg-[#1A1A1E] text-[#CCC] hover:text-white border border-[#222226] text-xs font-semibold transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Abrir en Visor Integrado</span>
                    </button>
                  )}

                  <span className="text-[11px] font-mono text-emerald-400 bg-[#12231A] px-2.5 py-1 rounded border border-emerald-800/40 flex items-center space-x-1">
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    <span>{docInfo.label}</span>
                  </span>
                </div>

                {/* APA Citation Box with Hyperlinked Source */}
                <div className="bg-[#0E0E11] p-3 rounded-lg border border-[#222226] text-xs font-mono text-[#D4AF37] space-y-1">
                  <span className="font-bold text-[#888] block font-sans uppercase text-[10px]">
                    Citación Formal Referenciada:
                  </span>
                  <div>
                    <span>{c.author.toUpperCase()} ({c.year}). {c.title}. </span>
                    <a
                      href={docInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[#D4AF37] hover:text-[#f6d773] inline-flex items-center space-x-1"
                    >
                      <span>Recuperado de Google Drive (Carpeta Tributario): {docInfo.url}</span>
                      <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </a>
                  </div>
                </div>

                {/* Citation text */}
                {c.citationText && (
                  <div className="text-xs text-[#CCC] italic font-serif bg-[#16161A] p-3 rounded-lg border border-[#222226]">
                    "{c.citationText}"
                  </div>
                )}

                {/* Personal Notes if present */}
                {c.personalNotes && (
                  <div className="bg-[#121824] p-3 rounded-lg border border-[#1e3a5f] text-xs space-y-1">
                    <div className="font-bold text-blue-300 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Mis Apuntes de Investigación:</span>
                    </div>
                    <p className="text-blue-100 font-sans">{c.personalNotes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
