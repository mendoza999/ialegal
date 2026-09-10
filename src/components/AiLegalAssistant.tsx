import React, { useState } from 'react';
import { Sparkles, Send, X, MessageSquare, RefreshCw, Scale } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { HtmlBook } from '../types';

interface AiLegalAssistantProps {
  books: HtmlBook[];
}

export const AiLegalAssistant: React.FC<AiLegalAssistantProps> = ({ books }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Send some context from the books index
      const contextDocuments = books.slice(0, 10).map((b) => ({
        title: b.title,
        author: b.author,
        category: b.category,
        snippet: b.abstract,
      }));

      const res = await fetch(import.meta.env.BASE_URL + 'api/ai/tax-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          focusTopic: 'DERECHO TRIBUTARIO GENERAL',
          contextDocuments,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al consultar al Asistente Jurídico.');
      }

      const data = await res.json();
      setResponse(data.answer);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado al procesar la consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] p-4 rounded-full shadow-2xl shadow-[#D4AF37]/20 transition-transform hover:scale-105 z-50 flex items-center justify-center"
        title="Consultar al Asistente Tributario IA"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] h-[600px] max-h-[80vh] max-w-[90vw] bg-[#111114] border border-[#222226] rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222226] bg-[#1A1A1E] rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0A0A0C]" />
          </div>
          <div>
            <h3 className="text-sm font-serif font-bold text-white">Asistente Tributario</h3>
            <p className="text-[10px] text-[#D4AF37]">Impulsado por IA Gemini</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#888] hover:text-white p-1 rounded-lg hover:bg-[#222226] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Intro Message */}
        <div className="bg-[#1A1A1E] rounded-2xl rounded-tl-none p-3 border border-[#222226] text-sm text-[#D1D1D1] shadow-md max-w-[85%]">
          Hola, soy tu asistente jurídico. Puedes consultarme cualquier duda sobre doctrina, jurisprudencia o normativa tributaria y te responderé con un dictamen dogmático.
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/50 text-rose-300 p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="bg-[#1A1A1E] rounded-2xl rounded-tl-none p-4 border border-[#222226] text-sm text-[#D1D1D1] shadow-md max-w-[95%]">
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#333]">
              <Scale className="w-4 h-4 text-[#D4AF37]" />
              <span className="font-bold text-xs text-white">Dictamen Generado</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none markdown-body">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 text-[#888] text-xs px-2 py-1">
            <RefreshCw className="w-3 h-3 animate-spin text-[#D4AF37]" />
            <span>Analizando bibliografía y generando respuesta...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#222226] bg-[#111114] rounded-b-2xl">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Escribe tu consulta tributaria..."
            rows={2}
            className="w-full bg-[#1A1A1E] border border-[#333] rounded-xl py-3 pl-3 pr-12 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF37] resize-none"
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 bottom-2 p-2 bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
