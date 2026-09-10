import React from 'react';
import { Search, X, Filter, BookOpen, HardDrive, Layers, Tag } from 'lucide-react';
import { TaxCategory } from '../types';

interface SearchHeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: TaxCategory | 'TODAS';
  setSelectedCategory: (cat: TaxCategory | 'TODAS') => void;
  selectedSource: 'all' | 'drive' | 'doctrina';
  setSelectedSource: (s: 'all' | 'drive' | 'doctrina') => void;
  selectedArticle: string;
  setSelectedArticle: (art: string) => void;
  selectedAuthor: string;
  setSelectedAuthor: (author: string) => void;
  availableAuthors: string[];
  totalResultsCount: number;
  onClearFilters: () => void;
}

const CATEGORIES: (TaxCategory | 'TODAS')[] = [
  'TODAS',
  'CÓDIGO TRIBUTARIO',
  'IMPUESTO A LA RENTA',
  'IMPUESTO GENERAL A LAS VENTAS (IGV)',
  'PROCEDIMIENTOS Y FISCALIZACIÓN',
  'INFRACCIONES Y SANCIONES',
  'DOCTRINA GENERAL Y PRINCIPIOS',
  'DERECHO TRIBUTARIO INTERNACIONAL',
  'TRIBUTACIÓN MUNICIPAL Y SECTORIAL',
];

const POPULAR_ARTICLES = [
  'Art. 37 LIR',
  'Art. 57 LIR',
  'Norma XVI CT',
  'Norma IV CT',
  'Art. 62 CT',
  'Art. 178 CT',
  'Arts. 18 y 19 LIGV',
  'Art. 43 CT',
];

const SUGGESTED_SEARCHES = [
  'Principio de Causalidad',
  'Norma XVI Elusión',
  'Devengado Tributario',
  'Prescripción Acción',
  'Crédito Fiscal Fehaciencia',
  'Responsabilidad Solidaria',
  'Gradualidad Infracción',
];

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSource,
  setSelectedSource,
  selectedArticle,
  setSelectedArticle,
  selectedAuthor,
  setSelectedAuthor,
  availableAuthors,
  totalResultsCount,
  onClearFilters,
}) => {
  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    selectedCategory !== 'TODAS' || 
    selectedSource !== 'all' || 
    selectedArticle !== '' || 
    selectedAuthor !== '';

  return (
    <div className="bg-[#0D0D10] border-b border-[#222226] py-8 px-4 sm:px-6 lg:px-8 text-[#D1D1D1] shadow-inner">
      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* Headline */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#D4AF37] tracking-tight">
            Buscador Especializado de Doctrina & Libros Tributarios
          </h1>
          <p className="text-[#888] text-xs sm:text-sm max-w-2xl mx-auto">
            Explora tratados, ratios dogmáticas, libros en Google Drive y análisis jurisprudencial por conceptos, artículos y autores.
          </p>
        </div>

        {/* Main Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#555]">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por concepto dogmático (ej: causalidad, devengado, Norma XVI, prescripción, crédito fiscal)..."
            className="w-full pl-11 pr-12 py-3.5 bg-[#16161A] text-[#FFF] placeholder-[#555] border border-[#222226] focus:border-[#D4AF37] rounded-xl text-sm sm:text-base focus:outline-none transition-all shadow-lg font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#666] hover:text-[#CCC]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Category Selector */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Layers className="w-3 h-3 text-[#D4AF37]" />
              <span>Rama / Categoría:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full bg-[#16161A] text-[#CCC] text-xs border border-[#222226] rounded-lg px-3 py-2 focus:border-[#D4AF37] focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Source Selector (All, Drive, Doctrina) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1 flex items-center space-x-1">
              <BookOpen className="w-3 h-3 text-[#D4AF37]" />
              <span>Origen de Datos:</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#16161A] p-1 rounded-lg border border-[#222226]">
              <button
                type="button"
                onClick={() => setSelectedSource('all')}
                className={`text-xs py-1 px-2 rounded font-medium transition-colors ${
                  selectedSource === 'all'
                    ? 'bg-[#D4AF37] text-[#0A0A0C] font-bold'
                    : 'text-[#888] hover:text-[#CCC]'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('drive')}
                className={`text-xs py-1 px-2 rounded font-medium transition-colors flex items-center justify-center space-x-1 ${
                  selectedSource === 'drive'
                    ? 'bg-[#D4AF37] text-[#0A0A0C] font-bold'
                    : 'text-[#888] hover:text-[#CCC]'
                }`}
              >
                <HardDrive className="w-3 h-3 inline" />
                <span>Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('doctrina')}
                className={`text-xs py-1 px-2 rounded font-medium transition-colors ${
                  selectedSource === 'doctrina'
                    ? 'bg-[#D4AF37] text-[#0A0A0C] font-bold'
                    : 'text-[#888] hover:text-[#CCC]'
                }`}
              >
                Doctrina
              </button>
            </div>
          </div>

          {/* Author Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-[#D4AF37]" />
              <span>Autor / Tratadista:</span>
            </label>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="w-full bg-[#16161A] text-[#CCC] text-xs border border-[#222226] rounded-lg px-3 py-2 focus:border-[#D4AF37] focus:outline-none cursor-pointer"
            >
              <option value="">Todos los autores ({availableAuthors.length})</option>
              {availableAuthors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Article Filters & Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[#888] font-medium mr-1 flex items-center text-[11px]">
            <Tag className="w-3 h-3 mr-1 text-[#D4AF37]" /> Artículos frecuentes:
          </span>
          {POPULAR_ARTICLES.map((art) => (
            <button
              key={art}
              onClick={() => setSelectedArticle(selectedArticle === art ? '' : art)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                selectedArticle === art
                  ? 'bg-[#D4AF37] text-[#0A0A0C] font-bold border-[#D4AF37]'
                  : 'bg-[#16161A] text-[#888] border-[#222226] hover:border-[#D4AF37]/50 hover:text-white'
              }`}
            >
              {art}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="ml-auto text-[11px] text-[#D4AF37] hover:underline font-medium cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Suggested Searches / Trending */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#666]">
          <span className="text-[11px] text-[#555]">Búsquedas temáticas:</span>
          {SUGGESTED_SEARCHES.map((sug) => (
            <button
              key={sug}
              onClick={() => setSearchQuery(sug)}
              className="text-[11px] px-2 py-0.5 rounded bg-[#16161A] hover:bg-[#1A1A1E] text-[#888] hover:text-[#D4AF37] border border-[#222226] transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Results count banner */}
        <div className="flex items-center justify-between text-xs text-[#666] pt-2 border-t border-[#222226]">
          <div>
            Mostrando <span className="font-semibold text-[#D4AF37]">{totalResultsCount}</span> obras y tesis doctrinales
            {selectedCategory !== 'TODAS' && ` en ${selectedCategory}`}
            {selectedArticle && ` vinculadas a ${selectedArticle}`}
          </div>
        </div>

      </div>
    </div>
  );
};
