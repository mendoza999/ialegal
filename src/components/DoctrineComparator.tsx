import React, { useState } from 'react';
import { GitCompare, Sparkles, RefreshCw, Scale, BookOpen, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const COMPARISON_TOPICS = [
  {
    topic: 'Criterio del Devengado Tributario vs. Devengo Contable (NIIF 15)',
    authors: 'Walker Villanueva, Dino Jarach, Ruiz de Castilla',
  },
  {
    topic: 'Norma XVI y Cláusula Antielusiva General vs. Economía de Opción Legítima',
    authors: 'Jorge Bravo Cucci, Humberto Medrano, Carmen Robles',
  },
  {
    topic: 'Principio de Causalidad y Necesidad del Gasto (Art. 37 LIR)',
    authors: 'Francisco Ruiz de Castilla, Armando Zolezzi, Luis Durán',
  },
  {
    topic: 'Hipótesis de Incidencia Tributaria y Hecho Imponible',
    authors: 'Geraldo Ataliba, Héctor Villegas, Dino Jarach',
  },
  {
    topic: 'Neutralidad del IGV y Requisitos del Crédito Fiscal',
    authors: 'César Talledo Mazú, Walker Villanueva, Enrique Vidal',
  },
];

export const DoctrineComparator: React.FC = () => {
  const [topic, setTopic] = useState(COMPARISON_TOPICS[0].topic);
  const [customTopic, setCustomTopic] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompare = async (targetTopic?: string) => {
    const finalTopic = targetTopic || customTopic || topic;
    if (!finalTopic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/ai/compare-doctrines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: finalTopic,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al generar la comparación doctrinal.');
      }

      const data = await res.json();
      setResult(data.comparison);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al procesar la comparación.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-serif font-bold text-white flex items-center space-x-2">
          <GitCompare className="w-6 h-6 text-[#D4AF37]" />
          <span>Comparador de Posturas Doctrinales & Dogmáticas</span>
        </h1>
        <p className="text-sm text-[#888]">
          Analiza y contrapone las diferentes corrientes doctrinales de tratadistas tributarios nacionales e internacionales sobre temas nodales del Derecho Tributario.
        </p>
      </div>

      {/* Selector Box */}
      <div className="bg-[#111114] rounded-2xl border border-[#222226] p-6 shadow-xl space-y-5">
        
        {/* Preset Topics */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#888]">
            Selecciona una controversia doctrinal:
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {COMPARISON_TOPICS.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setTopic(item.topic);
                  setCustomTopic('');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  topic === item.topic && !customTopic
                    ? 'bg-[#1A1A1E] border-[#D4AF37] shadow'
                    : 'bg-[#16161A] border-[#222226] hover:border-[#D4AF37]/50'
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    {item.topic}
                  </div>
                  <div className="text-[11px] text-[#888] mt-0.5 font-mono">
                    Autores de referencia: {item.authors}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTopic(item.topic);
                    setCustomTopic('');
                    handleCompare(item.topic);
                  }}
                  className="ml-3 px-3 py-1.5 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  Comparar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Topic Input */}
        <div className="pt-3 border-t border-[#222226] space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#888]">
            O escribe un tema o controversia doctrinal personalizada:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Ej: Postura sobre la deducibilidad de gastos de vehículos de dirección: Ruiz de Castilla vs Criterio SUNAT..."
              className="flex-1 px-4 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-xs sm:text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => handleCompare(customTopic)}
              disabled={isLoading || (!customTopic && !topic)}
              className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 shadow"
            >
              {isLoading ? 'Generando...' : 'Analizar'}
            </button>
          </div>
        </div>

      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/50 text-rose-300 p-4 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Results Box */}
      {result && (
        <div className="bg-[#111114] rounded-2xl border border-[#222226] shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#222226] flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-base font-serif font-bold text-white">
                Dictamen Comparativo Doctrinal
              </h2>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#16161A] border border-[#222226] hover:bg-[#1A1A1E] text-xs font-medium text-[#CCC] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#666]" />
                  <span>Copiar Comparación</span>
                </>
              )}
            </button>
          </div>

          <div className="prose prose-invert max-w-none text-[#D1D1D1] text-sm leading-relaxed">
            <div className="markdown-body">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
