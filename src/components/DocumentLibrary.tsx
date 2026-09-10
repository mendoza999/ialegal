import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ExternalLink, Trash2, CheckCircle, Clock, FileText, Tag, Sparkles, PlusCircle, Scale, Filter } from 'lucide-react';
import { TaxDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRama } from '../context/RamaContext';

interface DocumentLibraryProps {
  onSelectDocumentForChat: (doc: TaxDocument) => void;
  onOpenUploadModal: () => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onSelectDocumentForChat,
  onOpenUploadModal
}) => {
  const { isAdmin } = useAuth();
  const { addNotification } = useNotifications();
  const { selectedRama } = useRama();

  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterByRamaOnly, setFilterByRamaOnly] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/documents`);
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Deseas eliminar "${title}" de la base de conocimiento?`)) return;

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        addNotification({
          title: 'Documento Eliminado',
          message: `Se ha retirado "${title}" de los índices vectoriales y de Neo4j.`,
          type: 'info'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;

    const matchesRama = !filterByRamaOnly || !selectedRama?.id || (doc.ramaId || 'f5fa96ce-2733-44df-914a-c298aab14215') === selectedRama.id;

    return matchesSearch && matchesCategory && matchesRama;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Scale className="h-3.5 w-3.5" />
            <span>Biblioteca Jurídica • {selectedRama?.nombre || 'General'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Acervo Bibliográfico y Tratados ({selectedRama?.nombre || 'Derecho'})
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Libros y tratados procesados, segmentados por capítulos y páginas para consultas RAG y análisis dogmático de alta fidelidad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterByRamaOnly(!filterByRamaOnly)}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterByRamaOnly
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-white/10 border-white/20 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{filterByRamaOnly ? `Filtrando: ${selectedRama?.nombre}` : 'Ver Todas las Ramas'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUploadModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Incorporar Nuevo PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por libro, autor, norma o etiqueta..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'codigo_tributario', label: 'Código Tributario' },
            { id: 'impuesto_renta', label: 'Impuesto a la Renta' },
            { id: 'igv_iva', label: 'IGV / Consumo' },
            { id: 'procedimientos', label: 'Procedimientos' },
            { id: 'constitucional', label: 'Constitucional' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedCategory === cat.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Documents */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <BookOpen className="h-10 w-10 mx-auto text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No se encontraron documentos con los criterios de búsqueda.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className="flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400/80 dark:hover:border-amber-600/80 p-6 shadow-xs hover:shadow-lg transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {doc.categoryLabel}
                  </span>
                  <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Indexado</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    {doc.author} • {doc.year}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {doc.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {doc.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer & Stats */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span>{doc.totalPages} Páginas ({doc.chunksCount} Chunks)</span>
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {doc.entitiesCount} Entidades (relaciones)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectDocumentForChat(doc)}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Consultar en Chat</span>
                  </button>

                  <a
                    href={import.meta.env.BASE_URL + 'api/documents/view/' + doc.id}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Ver archivo completo"
                  >
                    <FileText className="h-4 w-4" />
                  </a>

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Eliminar de la base"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
