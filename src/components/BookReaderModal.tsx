import React, { useState } from 'react';
import { HtmlBook, AiFichaResult } from '../types';
import { X, ExternalLink, Sparkles, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';

interface BookReaderModalProps {
  book: HtmlBook;
  onClose: () => void;
}

export function BookReaderModal({ book, onClose }: BookReaderModalProps) {
  // Construct the URL to the static HTML file
  const fileUrl = `/html/${encodeURIComponent(book.fileName)}`;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<AiFichaResult | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setFicha(null);

    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/ai/extract-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          textSnippet: book.abstract || book.title // Since we don't load the full text here, we pass the abstract or title as context for the AI. In a real scenario we'd pass a chunk of the HTML.
        })
      });

      if (!res.ok) {
        throw new Error('Error al generar la ficha con IA');
      }

      const data = await res.json();
      setFicha(data.ficha);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl w-full max-w-[90vw] h-[90vh] flex overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#222226] bg-[#111114]">
            <div className="flex flex-col">
              <h2 className="text-xl font-serif font-bold text-white line-clamp-1">{book.title}</h2>
              <div className="flex items-center space-x-3 text-xs text-[#888] mt-1">
                <span>{book.author}</span>
                <span>•</span>
                <span className="text-[#BF092F] font-medium">{book.category}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsSidebarOpen(!isSidebarOpen);
                  if (!ficha && !isLoading && !isSidebarOpen) {
                    handleAnalyze();
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isSidebarOpen ? 'bg-[#BF092F] text-[#0A0A0C]' : 'bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]/30 hover:bg-[#222226]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSidebarOpen ? 'Cerrar Panel IA' : 'Analizar con IA'}</span>
              </button>
              <div className="w-px h-6 bg-[#333] mx-2"></div>
              <a 
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#888] hover:text-white hover:bg-[#1A1A1E] rounded-lg transition-colors flex items-center space-x-1"
                title="Abrir en nueva pestaña"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={onClose}
                className="p-2 text-[#888] hover:text-white hover:bg-[#1A1A1E] rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Iframe */}
          <div className="flex-1 bg-white relative">
            <iframe 
              src={fileUrl} 
              className="w-full h-full border-none"
              title={book.title}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>

        {/* AI Sidebar */}
        {isSidebarOpen && (
          <div className="w-96 border-l border-[#222226] bg-[#111114] flex flex-col overflow-y-auto animate-in slide-in-from-right-8">
            <div className="p-4 border-b border-[#222226] flex items-center space-x-2 sticky top-0 bg-[#111114] z-10">
              <Sparkles className="w-5 h-5 text-[#BF092F]" />
              <h3 className="font-serif font-bold text-white">Ficha Doctrinal IA</h3>
            </div>

            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#888] space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#BF092F]" />
                  <span className="text-sm">Analizando documento...</span>
                </div>
              ) : error ? (
                <div className="bg-rose-950/40 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-sm">
                  {error}
                  <button onClick={handleAnalyze} className="block mt-2 text-xs underline">Reintentar</button>
                </div>
              ) : ficha ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#BF092F] mb-2">Ratio Doctrinal</h4>
                    <p className="text-sm text-white bg-[#1A1A1E] p-3 rounded-lg border border-[#333]">
                      {ficha.ratioDoctrinal}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-2">Institución Jurídica</h4>
                    <span className="inline-block px-3 py-1 bg-[#222] border border-[#444] rounded text-sm text-white">
                      {ficha.institucionJuridica}
                    </span>
                  </div>

                  {ficha.articulosVinculados && ficha.articulosVinculados.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-2">Artículos Vinculados</h4>
                      <ul className="list-disc list-inside text-sm text-[#CCC] space-y-1">
                        {ficha.articulosVinculados.map((art, i) => (
                          <li key={i}>{art}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-2">Síntesis Dogmática</h4>
                    <p className="text-sm text-[#CCC] whitespace-pre-wrap">
                      {ficha.sintesisDogmatica}
                    </p>
                  </div>
                  
                  {ficha.posturasDoctrinales && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#888] mb-2">Posturas Doctrinales</h4>
                      <p className="text-sm text-[#CCC] whitespace-pre-wrap">
                        {ficha.posturasDoctrinales}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#BF092F] mb-2">Citación Sugerida</h4>
                    <div className="bg-[#1A1A1E] p-3 rounded-lg border border-[#333] font-mono text-xs text-[#888] break-words">
                      {ficha.citacionAPA}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <button
                    onClick={handleAnalyze}
                    className="px-4 py-2 bg-[#BF092F] text-[#0A0A0C] font-bold rounded-lg hover:bg-[#A10727] transition-colors"
                  >
                    Generar Ficha
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
