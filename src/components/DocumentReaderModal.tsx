import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Bookmark, 
  Scale, 
  Maximize2, 
  Minimize2, 
  Type, 
  FileText,
  Layers,
  HardDrive,
  Globe,
  Download
} from 'lucide-react';
import { DoctrinalEntry, AiFichaResult } from '../types';
import { 
  getDocumentOriginalUrl, 
  getDocumentSourceInfo, 
  formatFormalLegalCitation,
  getArticleSearchUrl,
  getJurisprudenceSearchUrl 
} from '../utils/documentLinks';

interface DocumentReaderModalProps {
  entry: DoctrinalEntry | null;
  onClose: () => void;
  onSaveCitation: (entry: DoctrinalEntry, customNote?: string) => void;
  isSaved?: boolean;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  entry,
  onClose,
  onSaveCitation,
  isSaved = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'reader' | 'document'>('reader');
  
  const [aiFicha, setAiFicha] = useState<AiFichaResult | null>(null);
  const [isGeneratingFicha, setIsGeneratingFicha] = useState(false);
  const [fichaError, setFichaError] = useState<string | null>(null);
  const [userNote, setUserNote] = useState('');

  useEffect(() => {
    // Reset state when entry changes
    setAiFicha(null);
    setFichaError(null);
    setUserNote('');
    setActiveTab(entry?.driveFileId ? 'document' : 'reader');
  }, [entry?.id]);

  if (!entry) return null;

  const docInfo = getDocumentSourceInfo(entry);

  const handleCopyCitation = async () => {
    const citation = formatFormalLegalCitation(entry);
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateAiFicha = async () => {
    setIsGeneratingFicha(true);
    setFichaError(null);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/ai/extract-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          author: entry.author,
          textSnippet: `${entry.ratioDoctrinal}\n\n${entry.keyExcerpt}\n\nInstitución: ${entry.institution}\nNormativa: ${entry.linkedArticles.join(', ')}`,
        }),
      });

      if (!res.ok) {
        throw new Error('No se pudo generar la ficha doctrinal con IA.');
      }

      const data = await res.json();
      if (data.ficha) {
        setAiFicha(data.ficha);
      }
    } catch (err: any) {
      console.error('Error generating AI Ficha:', err);
      setFichaError(err.message || 'Error al procesar la ficha doctrinal.');
    } finally {
      setIsGeneratingFicha(false);
    }
  };

  const getThemeClasses = () => {
    if (readingTheme === 'sepia') return 'bg-[#181612] text-[#E0D8C8] border-[#383226]';
    if (readingTheme === 'dark') return 'bg-[#0A0A0C] text-[#D1D1D1] border-[#222226]';
    return 'bg-[#0E0E11] text-[#D1D1D1] border-[#222226]';
  };

  const getFontSizeClass = () => {
    if (fontSize === 'large') return 'text-base sm:text-lg leading-relaxed';
    if (fontSize === 'xl') return 'text-lg sm:text-xl leading-loose';
    return 'text-sm sm:text-base leading-relaxed';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div 
        className={`bg-[#0D0D10] rounded-2xl shadow-2xl border border-[#222226] flex flex-col w-full transition-all duration-300 overflow-hidden ${
          isFullscreen 
            ? 'h-[98vh] max-w-[98vw]' 
            : 'h-[90vh] max-w-6xl'
        }`}
      >
        
        {/* Modal Header */}
        <div className="bg-[#0D0D10] text-[#D1D1D1] px-5 py-3.5 flex items-center justify-between border-b border-[#222226]">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-[#16161A] border border-[#BF092F]/60 flex items-center justify-center text-[#BF092F] flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-serif font-bold text-white truncate">
                {entry.title}
              </h2>
              <div className="text-xs text-[#888]">
                {entry.author} ({entry.year}) • {entry.category}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <a
              href={docInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors shadow"
              title={`Abrir documento original en ${docInfo.label}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Documento Original</span>
              <span className="sm:hidden">Original</span>
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#16161A] transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#888] hover:text-rose-400 hover:bg-[#16161A] transition-colors"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls & Navigation Tabs Bar */}
        <div className="bg-[#111114] px-5 py-2 flex items-center justify-between border-b border-[#222226] text-xs flex-wrap gap-2">
          
          {/* Viewer Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('reader')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'reader'
                  ? 'bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]/50'
                  : 'bg-[#16161A] text-[#888] hover:text-white border border-[#222226]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Transcripción & Ratio</span>
            </button>

            <button
              onClick={() => setActiveTab('document')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1.5 ${
                activeTab === 'document'
                  ? 'bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]/50'
                  : 'bg-[#16161A] text-[#888] hover:text-white border border-[#222226]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visor de Documento / PDF</span>
            </button>
          </div>

          {/* Reader Preferences & Actions */}
          <div className="flex items-center space-x-3">
            {activeTab === 'reader' && (
              <>
                <div className="flex items-center space-x-1 bg-[#16161A] rounded p-0.5 border border-[#222226]">
                  <button
                    onClick={() => setFontSize('normal')}
                    className={`px-2 py-0.5 rounded text-xs ${fontSize === 'normal' ? 'bg-[#BF092F] text-[#0A0A0C] font-bold' : 'text-[#888] hover:text-white'}`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-0.5 rounded text-xs ${fontSize === 'large' ? 'bg-[#BF092F] text-[#0A0A0C] font-bold' : 'text-[#888] hover:text-white'}`}
                  >
                    A+
                  </button>
                  <button
                    onClick={() => setFontSize('xl')}
                    className={`px-2 py-0.5 rounded text-xs ${fontSize === 'xl' ? 'bg-[#BF092F] text-[#0A0A0C] font-bold' : 'text-[#888] hover:text-white'}`}
                  >
                    A++
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setReadingTheme('light')}
                    className={`w-5 h-5 rounded-full bg-[#1A1A1E] border ${readingTheme === 'light' ? 'border-[#BF092F] ring-2 ring-[#BF092F]/50' : 'border-[#333]'}`}
                    title="Modo Carbón"
                  />
                  <button
                    onClick={() => setReadingTheme('sepia')}
                    className={`w-5 h-5 rounded-full bg-[#2B2317] border ${readingTheme === 'sepia' ? 'border-[#BF092F] ring-2 ring-[#BF092F]/50' : 'border-[#333]'}`}
                    title="Modo Sepia"
                  />
                  <button
                    onClick={() => setReadingTheme('dark')}
                    className={`w-5 h-5 rounded-full bg-[#050507] border ${readingTheme === 'dark' ? 'border-[#BF092F] ring-2 ring-[#BF092F]/50' : 'border-[#333]'}`}
                    title="Modo Negro Puro"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleCopyCitation}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#16161A] hover:bg-[#1A1A1E] border border-[#222226] text-[#CCC] font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#666]" />}
              <span>{copied ? 'Copiado' : 'Copiar Cita'}</span>
            </button>

            <button
              onClick={() => onSaveCitation(entry, userNote)}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded font-medium transition-colors ${
                isSaved
                  ? 'bg-[#1A1A1E] border border-[#BF092F] text-[#BF092F]'
                  : 'bg-[#16161A] hover:bg-[#1A1A1E] border border-[#222226] text-[#CCC]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span>{isSaved ? 'Guardado' : 'Guardar en Mis Citas'}</span>
            </button>
          </div>

        </div>

        {/* Modal Split Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Document Reader / Drive Embed (7 Cols) */}
          <div className={`lg:col-span-7 p-6 overflow-y-auto border-r border-[#222226] ${getThemeClasses()}`}>
            
            {activeTab === 'document' ? (
              <div className="space-y-4">
                <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-[#12231A] text-emerald-400 border border-emerald-800/50 flex-shrink-0">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">Repositorio Google Drive: Carpeta Tributario</span>
                        <span className="px-2 py-0.5 rounded bg-[#12231A] text-emerald-400 font-mono text-[10px] border border-emerald-800/40">
                          Sincronizado
                        </span>
                      </div>
                      <span className="text-[#888] font-mono text-[11px] truncate max-w-md block mt-0.5">
                        {docInfo.path}
                      </span>
                    </div>
                  </div>

                  <a
                    href={docInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-xl bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider flex-shrink-0 transition-colors shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir en Google Drive</span>
                  </a>
                </div>

                {entry.driveFileId ? (
                  <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-[#222226] bg-[#0A0A0C] shadow-inner">
                    <iframe
                      src={`https://drive.google.com/file/d/${entry.driveFileId}/preview`}
                      className="w-full h-full border-0"
                      title={entry.title}
                      allow="autoplay"
                    />
                  </div>
                ) : (
                  <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-[#222226] bg-[#0E0E11] p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <HardDrive className="w-12 h-12 text-[#BF092F]" />
                    <div className="max-w-md space-y-2">
                      <h3 className="text-base font-serif font-bold text-white">
                        Archivo en Repositorio Tributario (Google Drive)
                      </h3>
                      <p className="text-xs text-[#888]">
                        Ubicación: <strong className="text-[#CCC] font-mono">{docInfo.path}</strong>. Haz clic para abrir el archivo directamente en Google Drive.
                      </p>
                    </div>
                    <a
                      href={docInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors shadow-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ver Archivo en Google Drive</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* Doctrinal Text Reader Section */
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#BF092F]">
                      {entry.category} • {entry.institution}
                    </span>
                    <a
                      href={docInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[11px] text-[#BF092F] hover:text-[#F0A9B8] font-mono"
                    >
                      <span>{docInfo.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-serif font-bold mt-1 text-white">
                    {entry.title}
                  </h1>
                  <div className="text-sm text-[#888] mt-1">
                    Por <strong className="text-[#CCC]">{entry.author}</strong> ({entry.year})
                    {entry.publisher && ` — ${entry.publisher}`}
                  </div>
                </div>

                {/* Ratio Dogmática Box */}
                <div className="bg-[#16161A] border-l-2 border-[#BF092F] p-4 rounded-r-xl space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#BF092F] flex items-center space-x-1.5">
                    <Scale className="w-4 h-4 text-[#BF092F]" />
                    <span>Ratio Dogmática y Tesis de la Obra:</span>
                  </div>
                  <p className="font-serif italic text-[#EDEDED] leading-relaxed text-sm sm:text-base">
                    "{entry.ratioDoctrinal}"
                  </p>
                </div>

                {/* Fundamento Doctrinal y Extracto */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#666]">
                    Texto Doctrinal y Fundamentación:
                  </h3>
                  <div className={`font-serif space-y-4 text-[#CCC] ${getFontSizeClass()}`}>
                    <p className="leading-relaxed bg-[#16161A]/40 p-4 rounded-xl border border-[#222226]">
                      {entry.keyExcerpt}
                    </p>
                  </div>
                </div>

                {/* Normas Vinculadas */}
                <div className="space-y-2 pt-4 border-t border-[#222226]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#666]">
                    Normas Jurídicas y Artículos de Aplicación:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {entry.linkedArticles.map((art) => (
                      <a
                        key={art}
                        href={getArticleSearchUrl(art)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#16161A] hover:bg-[#1A1A1E] rounded-lg text-xs font-mono font-medium text-[#CCC] hover:text-[#BF092F] border border-[#222226] hover:border-[#BF092F]/50 transition-colors inline-flex items-center space-x-1.5"
                        title={`Consultar texto oficial de ${art}`}
                      >
                        <span>📜 {art}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Jurisprudencia TF vinculada */}
                {entry.jurisprudenceReferences && entry.jurisprudenceReferences.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666]">
                      Jurisprudencia y Resoluciones del Tribunal Fiscal:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {entry.jurisprudenceReferences.map((ref) => (
                        <a
                          key={ref}
                          href={getJurisprudenceSearchUrl(ref)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-[#121824] hover:bg-[#1a2538] rounded-lg text-xs font-mono font-medium text-blue-300 hover:text-blue-200 border border-[#1e3a5f] transition-colors inline-flex items-center space-x-1.5"
                          title="Ver jurisprudencia en repositorio oficial"
                        >
                          <span>⚖️ {ref}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Right Column: AI Ficha, Synthesis & Personal Research Notes (5 Cols) */}
          <div className="lg:col-span-5 bg-[#111114] p-6 overflow-y-auto space-y-6">
            
            {/* Direct Document Reference Card */}
            <div className="bg-[#16161A] p-4 rounded-xl border border-[#222226] shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#888] font-bold">
                  Referencia al Documento Fuente
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1A1E] text-[#BF092F] border border-[#222226]">
                  {docInfo.label}
                </span>
              </div>
              <div className="text-xs text-[#CCC] space-y-1">
                <a 
                  href={docInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif font-bold text-white hover:text-[#BF092F] transition-colors inline-flex items-baseline space-x-1"
                >
                  <span>{entry.title}</span>
                  <ExternalLink className="w-3 h-3 text-[#BF092F] inline ml-1" />
                </a>
                <p className="text-[11px] text-[#888]">
                  {entry.author} ({entry.year}) {entry.publisher ? `— ${entry.publisher}` : ''}
                </p>
                <div className="pt-2">
                  <a
                    href={docInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-3 rounded bg-[#1A1A1E] hover:bg-[#222228] text-[#BF092F] hover:text-[#F6C3CD] border border-[#BF092F]/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Documento Original</span>
                  </a>
                </div>
              </div>
            </div>

            {/* AI Ficha Generator Button */}
            <div className="bg-[#16161A] p-4 rounded-xl border border-[#222226] shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-[#BF092F]" />
                  <h3 className="text-sm font-bold text-white">Ficha Doctrinal Estructurada (IA)</h3>
                </div>
                <button
                  onClick={handleGenerateAiFicha}
                  disabled={isGeneratingFicha}
                  className="px-3 py-1.5 rounded bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-1.5 shadow"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingFicha ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingFicha ? 'Analizando...' : aiFicha ? 'Regenerar' : 'Extraer Ficha'}</span>
                </button>
              </div>

              {fichaError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
                  {fichaError}
                </div>
              )}

              {aiFicha ? (
                <div className="space-y-3 pt-2 text-xs text-[#CCC]">
                  <div className="bg-[#0E0E11] p-3 rounded-lg border border-[#222226]">
                    <span className="font-bold text-[#BF092F] block mb-1 font-mono uppercase text-[10px]">Ratio Decidendi / Tesis:</span>
                    <p className="italic font-serif text-white">{aiFicha.ratioDoctrinal}</p>
                  </div>

                  <div>
                    <span className="font-bold text-[#888] block mb-1 uppercase text-[10px] font-mono">Síntesis Dogmática:</span>
                    <p className="text-[#BBB] leading-relaxed">{aiFicha.sintesisDogmatica}</p>
                  </div>

                  {aiFicha.posturasDoctrinales && (
                    <div>
                      <span className="font-bold text-[#888] block mb-1 uppercase text-[10px] font-mono">Corrientes y Discrepancias:</span>
                      <p className="text-[#BBB]">{aiFicha.posturasDoctrinales}</p>
                    </div>
                  )}

                  {aiFicha.citacionAPA && (
                    <div className="bg-[#0E0E11] p-2.5 rounded border border-[#222226] font-mono text-[11px] text-[#888]">
                      <span className="font-bold text-[#BF092F] block mb-0.5">Citación Jurídica Formal:</span>
                      {aiFicha.citacionAPA}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#666]">
                  Haz clic en <strong>Extraer Ficha</strong> para que el motor de inteligencia artificial procese esta obra doctrinal y extraiga su ratio, artículos clave, y síntesis dogmática formal.
                </p>
              )}
            </div>

            {/* Personal Research Notes */}
            <div className="bg-[#16161A] p-4 rounded-xl border border-[#222226] shadow-md space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#888]" />
                <h3 className="text-sm font-bold text-white">Apuntes de Investigación / Caso</h3>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Escribe tus notas, argumentos para tu recurso de reclamación/apelación o reflexiones doctrinales sobre este autor..."
                className="w-full h-28 p-3 text-xs bg-[#0E0E11] text-[#CCC] placeholder-[#555] border border-[#222226] rounded-lg focus:outline-none focus:border-[#BF092F] font-sans"
              />
              <button
                onClick={() => onSaveCitation(entry, userNote)}
                className="w-full py-2 bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center space-x-2 shadow"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>Guardar Apuntes en Mis Citas</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
