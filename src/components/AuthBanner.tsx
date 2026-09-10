import React from 'react';
import { HardDrive, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthBannerProps {
  user: UserProfile | null;
  isAdmin?: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
  tributarioFolderFound: boolean;
  tributarioFolderName?: string;
  driveFilesCount: number;
}

export const AuthBanner: React.FC<AuthBannerProps> = ({
  user,
  isAdmin = false,
  onLogin,
  isLoggingIn,
  tributarioFolderFound,
  tributarioFolderName,
  driveFilesCount,
}) => {
  // If not logged in with Drive: only show the connection prompt banner to administrators
  if (!user) {
    if (!isAdmin) {
      return null;
    }

    return (
      <div className="bg-[#111114] border-b border-[#222226] text-[#D1D1D1] px-4 py-2.5 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-[#BF092F] flex-shrink-0" />
            <span>
              <strong className="text-[#BF092F]">[Admin] Conecta tu Google Drive:</strong> Vincula tu carpeta <span className="underline font-semibold text-white">"Tributario"</span> para sincronizar e indexar libros y documentos para todos los usuarios.
            </span>
          </div>

          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider transition-colors whitespace-nowrap shadow disabled:opacity-50"
          >
            <span>{isLoggingIn ? 'Conectando...' : 'Conectar Google Drive'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (tributarioFolderFound) {
    return (
      <div className="bg-[#0D1510] border-b border-emerald-900/50 text-emerald-300 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Google Drive Activo: Carpeta <strong className="text-white">"{tributarioFolderName || 'Tributario'}"</strong> sincronizada con <strong className="text-emerald-400">{driveFilesCount}</strong> libros y documentos disponibles.
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-emerald-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acceso Seguro de Solo Lectura</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
