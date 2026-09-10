import React, { useState } from 'react';
import { 
  HardDrive, 
  Folder, 
  FileText, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  BookOpen, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  FolderOpen,
  PlusCircle,
  FileCode,
  Download
} from 'lucide-react';
import { DriveItem, DoctrinalEntry, UserProfile } from '../types';
import { formatFileSize, convertDriveFileToDoctrinalEntry } from '../services/driveService';

interface DriveExplorerProps {
  user: UserProfile | null;
  isAdmin?: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
  driveItems: DriveItem[];
  subfolders: DriveItem[];
  currentFolder: DriveItem | null;
  folderHistory: DriveItem[];
  onNavigateFolder: (folder: DriveItem | null) => void;
  onNavigateBack: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  tributarioFoldersList: DriveItem[];
  onSelectTributarioFolder: (folder: DriveItem) => void;
  onOpenFileInReader: (entry: DoctrinalEntry) => void;
  onIndexAllDriveFiles: () => void;
  searchInDrive: string;
  setSearchInDrive: (q: string) => void;
  onPerformDriveSearch: () => void;
}

export const DriveExplorer: React.FC<DriveExplorerProps> = ({
  user,
  isAdmin = false,
  onLogin,
  isLoggingIn,
  driveItems,
  subfolders,
  currentFolder,
  folderHistory,
  onNavigateFolder,
  onNavigateBack,
  isLoading,
  onRefresh,
  tributarioFoldersList,
  onSelectTributarioFolder,
  onOpenFileInReader,
  onIndexAllDriveFiles,
  searchInDrive,
  setSearchInDrive,
  onPerformDriveSearch,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (!user) {
    if (!isAdmin) {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
          <div className="bg-[#111114] rounded-2xl border border-[#222226] p-8 sm:p-12 shadow-xl space-y-6">
            <div className="w-16 h-16 bg-[#1A1A1E] text-[#D4AF37] border border-[#222226] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <HardDrive className="w-8 h-8" />
            </div>
            
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-serif font-bold text-white">
                Biblioteca Digital de Google Drive
              </h2>
              <p className="text-[#888] text-sm leading-relaxed">
                La sincronización con Google Drive está restringida al <strong className="text-[#D4AF37]">Administrador del Sistema</strong>. Cuando un administrador vincule la carpeta <strong className="text-white">"Tributario"</strong>, todo el catálogo doctrinal estará disponible para consulta de los usuarios.
              </p>
            </div>

            <div className="p-3.5 bg-[#16161A] border border-[#222226] rounded-xl text-xs text-[#888] max-w-md mx-auto flex items-center justify-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <span>Inicie sesión como administrador para vincular o actualizar los libros en la nube.</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-[#111114] rounded-2xl border border-[#222226] p-8 sm:p-12 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-[#1A1A1E] text-[#D4AF37] border border-[#222226] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <HardDrive className="w-8 h-8" />
          </div>
          
          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-bold uppercase tracking-wider mb-2">
              Privilegio de Administrador
            </div>
            <h2 className="text-2xl font-serif font-bold text-white">
              Conecta tu Google Drive
            </h2>
            <p className="text-[#888] text-sm">
              Como administrador, vincula tu carpeta <strong className="text-[#D4AF37]">"Tributario"</strong> para leer, indexar y disponibilizar libros, manuales, jurisprudencia y doctrina para todos los investigadores del portal.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] font-bold px-6 py-3 rounded text-xs uppercase tracking-wider shadow-lg transition-all space-x-3 disabled:opacity-50"
            >
              <span>{isLoggingIn ? 'Iniciando autorización...' : 'Autorizar y Conectar Carpeta "Tributario"'}</span>
            </button>
          </div>

          <div className="text-xs text-[#555] max-w-sm mx-auto">
            Se solicitará permiso de solo lectura para acceder a tus archivos tributarios de Google Drive de manera 100% segura.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Banner & Folder Selection */}
      <div className="bg-[#111114] rounded-xl border border-[#222226] p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#1A1A1E] text-[#D4AF37] border border-[#222226] flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-serif font-bold text-white">
                  {currentFolder ? currentFolder.name : 'Carpeta "Tributario" de Google Drive'}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#12231A] text-emerald-400 border border-emerald-800/60 font-mono">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Sincronizado
                </span>
              </div>
              <p className="text-xs text-[#666]">
                {driveItems.length} libros/documentos y {subfolders.length} subcarpetas detectadas
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onIndexAllDriveFiles}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors shadow"
              title="Indexar todos los libros para que aparezcan en el buscador principal con su ratio dogmática"
            >
              <Sparkles className="w-4 h-4 text-[#0A0A0C]" />
              <span>Indexar en Buscador Principal</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded border border-[#222226] bg-[#16161A] text-[#888] hover:text-white text-xs transition-colors hover:border-[#D4AF37]/50"
              title="Actualizar archivos de Drive"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
          </div>

        </div>

        {/* Tributario Folders Switcher if multiple are found */}
        {tributarioFoldersList.length > 1 && (
          <div className="bg-[#0E0E11] p-3 rounded-lg border border-[#222226] flex items-center space-x-2 text-xs text-[#888]">
            <span className="font-semibold text-[#CCC]">Carpetas tributarias encontradas:</span>
            <div className="flex flex-wrap gap-1.5">
              {tributarioFoldersList.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSelectTributarioFolder(f)}
                  className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                    currentFolder?.id === f.id
                      ? 'bg-[#1A1A1E] text-[#D4AF37] border-[#D4AF37] font-bold'
                      : 'bg-[#16161A] text-[#888] border-[#222226] hover:text-white'
                  }`}
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search bar inside Drive */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#555] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInDrive}
              onChange={(e) => setSearchInDrive(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onPerformDriveSearch()}
              placeholder="Buscar dentro de tu carpeta Tributario (título o texto en PDFs/Docs)..."
              className="w-full pl-9 pr-4 py-2 bg-[#16161A] text-[#FFF] placeholder-[#555] border border-[#222226] rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <button
            onClick={onPerformDriveSearch}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] text-xs font-bold uppercase tracking-wider rounded transition-colors"
          >
            Buscar en Drive
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-xs text-[#666] border-t border-[#222226] pt-3">
          {folderHistory.length > 0 && (
            <button
              onClick={onNavigateBack}
              className="p-1 rounded hover:bg-[#1A1A1E] text-[#888] hover:text-white transition-colors mr-1"
              title="Volver a la carpeta anterior"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onNavigateFolder(null)}
            className="hover:underline font-medium text-[#888] hover:text-[#D4AF37]"
          >
            📁 Carpeta Raíz Tributario
          </button>

          {folderHistory.map((f, idx) => (
            <React.Fragment key={f.id}>
              <span>/</span>
              <button
                onClick={() => {
                  onNavigateFolder(f);
                }}
                className={`hover:underline ${
                  idx === folderHistory.length - 1 ? 'font-bold text-[#D4AF37]' : 'text-[#888] hover:text-white'
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

      </div>

      {/* Subfolders Grid */}
      {subfolders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666] flex items-center space-x-1.5">
            <Folder className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Subcarpetas ({subfolders.length}):</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {subfolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => onNavigateFolder(folder)}
                className="bg-[#111114] p-3.5 rounded-xl border border-[#222226] hover:border-[#D4AF37]/60 hover:shadow-lg cursor-pointer transition-all flex items-center space-x-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#1A1A1E] text-[#D4AF37] border border-[#222226] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:text-[#0A0A0C] transition-colors">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#CCC] truncate group-hover:text-[#D4AF37]">
                    {folder.name}
                  </div>
                  <div className="text-[10px] text-[#555]">Abrir subcarpeta</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files List / Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666] flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Libros y Documentos Tributarios ({driveItems.length}):</span>
          </h2>

          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'grid' ? 'bg-[#1A1A1E] text-[#D4AF37] border border-[#D4AF37]/50 font-bold' : 'text-[#666] hover:text-[#CCC]'
              }`}
            >
              Cuadrícula
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                viewMode === 'list' ? 'bg-[#1A1A1E] text-[#D4AF37] border border-[#D4AF37]/50 font-bold' : 'text-[#666] hover:text-[#CCC]'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#111114] rounded-xl border border-[#222226] p-12 text-center text-[#888] space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#D4AF37]" />
            <p className="text-sm font-medium">Cargando libros y documentos de Google Drive...</p>
          </div>
        ) : driveItems.length === 0 ? (
          <div className="bg-[#111114] rounded-xl border border-[#222226] p-12 text-center text-[#888] space-y-3">
            <FileText className="w-10 h-10 mx-auto text-[#444]" />
            <p className="text-sm font-medium text-white">No se encontraron archivos en esta carpeta.</p>
            <p className="text-xs text-[#666] max-w-md mx-auto">
              Asegúrate de colocar tus libros en formato PDF, Word o Google Docs en la carpeta "Tributario" de tu Google Drive.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {driveItems.map((file) => {
              const entry = convertDriveFileToDoctrinalEntry(file);
              const isPdf = file.name.toLowerCase().endsWith('.pdf');

              return (
                <div
                  key={file.id}
                  className="bg-[#111114] rounded-xl border border-[#222226] hover:border-[#D4AF37]/60 hover:shadow-xl transition-all p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-[#16161A] border border-[#222226] text-[#CCC] flex items-center justify-center flex-shrink-0">
                        {isPdf ? (
                          <span className="text-[10px] font-bold text-rose-400 font-mono">PDF</span>
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium bg-[#1A1A1E] text-[#D4AF37] px-2 py-0.5 rounded border border-[#222226] font-mono">
                        {entry.category}
                      </span>
                    </div>

                    <div>
                      <h3
                        onClick={() => onOpenFileInReader(entry)}
                        className="text-sm font-serif font-bold text-white hover:text-[#D4AF37] cursor-pointer line-clamp-2"
                        title={file.name}
                      >
                        {file.name}
                      </h3>
                      <p className="text-xs text-[#888] mt-0.5">
                        {entry.author} • {entry.year}
                      </p>
                    </div>

                    <div className="text-[11px] text-[#888] bg-[#0E0E11] p-2 rounded border border-[#222226] line-clamp-2 italic font-serif">
                      "{entry.institution}"
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#222226] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#555] font-mono">
                      {file.size || 'Archivo Drive'}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onOpenFileInReader(entry)}
                        className="px-2.5 py-1 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center space-x-1"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Leer</span>
                      </button>

                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-[#666] hover:text-white hover:bg-[#16161A] transition-colors"
                          title="Abrir en Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111114] rounded-xl border border-[#222226] overflow-hidden shadow-lg">
            <table className="min-w-full divide-y divide-[#222226] text-xs">
              <thead className="bg-[#0D0D10] text-[#888] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Documento / Obra</th>
                  <th className="px-4 py-3 text-left">Materia Tributaria</th>
                  <th className="px-4 py-3 text-left">Tamaño</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226]">
                {driveItems.map((file) => {
                  const entry = convertDriveFileToDoctrinalEntry(file);
                  return (
                    <tr key={file.id} className="hover:bg-[#16161A] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{file.name}</div>
                        <div className="text-[11px] text-[#888]">{entry.author}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#1A1A1E] text-[#D4AF37] border border-[#222226] font-mono font-medium">
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#666] font-mono">
                        {file.size || 'N/D'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenFileInReader(entry)}
                          className="px-2.5 py-1 rounded bg-[#D4AF37] hover:bg-[#c5a030] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider"
                        >
                          Abrir Lector
                        </button>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block p-1 text-[#666] hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
