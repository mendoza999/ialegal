import React, { useState } from 'react';
import { X, BookPlus, Sparkles, Check, AlertCircle } from 'lucide-react';
import { DoctrinalEntry, TaxCategory } from '../types';
import { useRama } from '../context/RamaContext';

interface AddDoctrinalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEntry: (entry: DoctrinalEntry) => void;
}

const CATEGORIES: TaxCategory[] = [
  'IMPUESTO A LA RENTA',
  'IMPUESTO GENERAL A LAS VENTAS (IGV)',
  'CÓDIGO TRIBUTARIO',
  'PROCEDIMIENTOS Y FISCALIZACIÓN',
  'INFRACCIONES Y SANCIONES',
  'DOCTRINA GENERAL Y PRINCIPIOS',
  'DERECHO TRIBUTARIO INTERNACIONAL',
  'TRIBUTACIÓN MUNICIPAL Y SECTORIAL',
];

export const AddDoctrinalModal: React.FC<AddDoctrinalModalProps> = ({
  isOpen,
  onClose,
  onAddEntry,
}) => {
  const { selectedRama } = useRama();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState<number>(2024);
  const [category, setCategory] = useState<TaxCategory>('IMPUESTO A LA RENTA');
  const [institution, setInstitution] = useState('');
  const [linkedArticles, setLinkedArticles] = useState('');
  const [ratioDoctrinal, setRatioDoctrinal] = useState('');
  const [keyExcerpt, setKeyExcerpt] = useState('');
  const [keywords, setKeywords] = useState('');
  const [jurisprudence, setJurisprudence] = useState('');
  const [driveFileIdOrUrl, setDriveFileIdOrUrl] = useState('');
  const [drivePath, setDrivePath] = useState('Mi unidad / ');
  const [publisher, setPublisher] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !ratioDoctrinal.trim()) {
      setError('Por favor completa los campos obligatorios (Título, Autor y Ratio Doctrinal).');
      return;
    }

    let parsedDriveId = driveFileIdOrUrl.trim();
    let driveLink = '';
    if (parsedDriveId.includes('drive.google.com/file/d/')) {
      const match = parsedDriveId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        parsedDriveId = match[1];
      }
    }
    if (parsedDriveId) {
      driveLink = `https://drive.google.com/file/d/${parsedDriveId}/view`;
    }

    const newEntry: DoctrinalEntry = {
      id: `doc_custom_${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      year: year || 2024,
      ramaId: selectedRama?.id,
      category,
      publisher: publisher.trim() || 'Fondo Editorial Jurídico',
      institution: institution.trim() || 'Doctrina General',
      linkedArticles: linkedArticles
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      ratioDoctrinal: ratioDoctrinal.trim(),
      keyExcerpt: keyExcerpt.trim() || ratioDoctrinal.trim(),
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      jurisprudenceReferences: jurisprudence
        .split(',')
        .map((j) => j.trim())
        .filter(Boolean),
      driveFileId: parsedDriveId || undefined,
      driveViewLink: driveLink || undefined,
      driveDownloadLink: parsedDriveId ? `https://drive.google.com/uc?export=download&id=${parsedDriveId}` : undefined,
      drivePath: drivePath.trim() || undefined,
      sourceUrl: driveLink || undefined,
      originalDocumentUrl: driveLink || undefined,
      isDriveSource: true,
    };

    onAddEntry(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111114] border border-[#222226] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#222226] flex items-center justify-between bg-[#16161A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] border border-[#BF092F] flex items-center justify-center text-[#BF092F] shadow">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-serif font-bold text-white">
                  Agregar Obra al Repertorio Doctrinal
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#BF092F] text-[#0A0A0C] font-bold uppercase">
                  Privilegio Admin
                </span>
              </div>
              <p className="text-xs text-[#888]">
                Registra un libro, tratado o tesis dogmática para toda la comunidad
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Título de la Obra o Tratado *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. La Hipótesis de Incidencia Tributaria"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Año de Publicación
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2024)}
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Autor Principal *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ej. Geraldo Ataliba / Jorge Bravo Cucci"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Materia / Categoría Tributaria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaxCategory)}
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Institución Jurídica Dogmática
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ej. Hecho Imponible / Causalidad / Devengado"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Artículos Legales Vinculados (separados por coma)
              </label>
              <input
                type="text"
                value={linkedArticles}
                onChange={(e) => setLinkedArticles(e.target.value)}
                placeholder="Ej. Art. 37 LIR, Art. 57 LIR, Art. 62 Código Tributario"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
              Tesis o Ratio Doctrinal Central *
            </label>
            <textarea
              required
              rows={3}
              value={ratioDoctrinal}
              onChange={(e) => setRatioDoctrinal(e.target.value)}
              placeholder="Resume la tesis dogmática central sostenida por el autor respecto a la controversia o institución..."
              className="w-full p-3 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
              Extracto Textual / Cita Relevante
            </label>
            <textarea
              rows={2}
              value={keyExcerpt}
              onChange={(e) => setKeyExcerpt(e.target.value)}
              placeholder="Cita textual de la obra para fines de fundamentación jurídica y citación..."
              className="w-full p-3 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Palabras Clave (separadas por coma)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Ej. Causalidad, Gasto deducible, SUNAT"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                RTFs / Jurisprudencia Vinculada
              </label>
              <input
                type="text"
                value={jurisprudence}
                onChange={(e) => setJurisprudence(e.target.value)}
                placeholder="Ej. RTF 01234-1-2022, STC 00022-2020-PI"
                className="w-full px-3 py-2 bg-[#16161A] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F]"
              />
            </div>
          </div>

          {/* Google Drive Repository Links & Editorial */}
          <div className="p-3.5 bg-[#16161A] rounded-xl border border-[#222226] space-y-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BF092F] flex items-center space-x-1.5">
              <span>📁 Repositorio Google Drive (Carpeta Tributario)</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                  Enlace o ID de Archivo en Google Drive
                </label>
                <input
                  type="text"
                  value={driveFileIdOrUrl}
                  onChange={(e) => setDriveFileIdOrUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1Abc..."
                  className="w-full px-3 py-2 bg-[#0E0E11] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                  Ruta en Google Drive
                </label>
                <input
                  type="text"
                  value={drivePath}
                  onChange={(e) => setDrivePath(e.target.value)}
                  placeholder="Mi unidad / Tributario / ..."
                  className="w-full px-3 py-2 bg-[#0E0E11] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">
                Editorial / Publicación
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Ej. Fondo Editorial Jurídico / Editorial Themis"
                className="w-full px-3 py-2 bg-[#0E0E11] border border-[#222226] rounded-xl text-white focus:outline-none focus:border-[#BF092F] text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#222226]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#16161A] hover:bg-[#1A1A1E] text-[#888] border border-[#222226]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider shadow"
            >
              Guardar en Repertorio
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
