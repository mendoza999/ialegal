import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  FolderGit2, 
  Sparkles, 
  GitCompare, 
  Bookmark, 
  Scale, 
  LogOut, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  ShieldCheck,
  User as UserIcon,
  KeyRound,
  Users,
  BookPlus,
  ChevronDown
} from 'lucide-react';
import { AppUser, UserProfile } from '../types';

interface HeaderProps {
  activeTab: 'repertorio' | 'drive' | 'tesauro' | 'asistente' | 'comparador' | 'guardados';
  setActiveTab: (tab: 'repertorio' | 'drive' | 'tesauro' | 'asistente' | 'comparador' | 'guardados') => void;
  currentUser: AppUser | null;
  googleUser: UserProfile | null;
  onOpenAuthModal: (view?: 'login' | 'register' | 'changePassword') => void;
  onLogoutUser: () => void;
  onOpenAdminUsers: () => void;
  onOpenAddDoctrinal: () => void;
  onConnectDrive: () => void;
  isConnectingDrive: boolean;
  driveConnected: boolean;
  tributarioFolderFound: boolean;
  tributarioFolderName?: string;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  googleUser,
  onOpenAuthModal,
  onLogoutUser,
  onOpenAdminUsers,
  onOpenAddDoctrinal,
  onConnectDrive,
  isConnectingDrive,
  driveConnected,
  tributarioFolderFound,
  tributarioFolderName,
  savedCount,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-[#0D0D10] text-[#D1D1D1] border-b border-[#222226] sticky top-0 z-40 shadow-lg">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('repertorio')}>
            <div className="w-10 h-10 rounded-lg bg-[#16161A] border border-[#BF092F]/60 flex items-center justify-center shadow-inner group-hover:border-[#BF092F] transition-colors">
              <Scale className="w-5 h-5 text-[#BF092F] stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-lg tracking-tight text-white group-hover:text-[#BF092F] transition-colors">
                  LexTributaria
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#1A1A1E] text-[#BF092F] font-semibold border border-[#222226] tracking-wider">
                  Doctrina Jurídica
                </span>
              </div>
              <p className="text-[10px] text-[#666] uppercase tracking-[0.15em] hidden sm:block">
                Repositorio Académico & Biblioteca Google Drive
              </p>
            </div>
          </div>

          {/* Right Status, Admin Actions & Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Admin Direct Action: Agregar Obra */}
            {isAdmin && (
              <button
                onClick={onOpenAddDoctrinal}
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#16161A] hover:bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]/40 text-xs font-semibold transition-colors shadow-sm"
                title="Agregar obra doctrinal al repositorio general"
              >
                <BookPlus className="w-3.5 h-3.5" />
                <span>+ Nueva Obra</span>
              </button>
            )}

            {/* Google Drive Status Pill - Visible to admins, or if already connected and synced */}
            {(isAdmin || driveConnected) && (
              <button
                onClick={() => setActiveTab('drive')}
                className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  driveConnected && tributarioFolderFound
                    ? 'bg-[#1A1A1E] border-emerald-700/60 text-emerald-400'
                    : driveConnected
                    ? 'bg-[#1A1A1E] border-[#BF092F]/50 text-[#BF092F]'
                    : 'bg-[#16161A] border-[#222226] text-[#888] hover:text-[#BBB] hover:border-[#BF092F]/50'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-[#BF092F]" />
                <span>
                  {driveConnected
                    ? tributarioFolderFound
                      ? `GDrive: "${tributarioFolderName || 'Tributario'}"`
                      : 'GDrive Conectado'
                    : 'Vincular Drive (Admin)'}
                </span>
                {driveConnected ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-[#666]" />
                )}
              </button>
            )}

            {/* User Auth Profile / Button */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 bg-[#16161A] hover:bg-[#1A1A1E] border border-[#222226] hover:border-[#444] rounded-full pl-1.5 pr-3 py-1 transition-all"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-serif text-xs font-bold ${
                    isAdmin 
                      ? 'bg-[#1A1A1E] border border-[#BF092F] text-[#BF092F]' 
                      : 'bg-[#1A1A1E] border border-sky-500 text-sky-400'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight max-w-[120px] truncate">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`text-[9px] uppercase font-bold tracking-wider ${
                        isAdmin ? 'text-[#BF092F]' : 'text-sky-400'
                      }`}>
                        {currentUser.role}
                      </span>
                    </div>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-[#666]" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#111114] border border-[#222226] shadow-2xl py-2 z-50 text-xs animate-fadeIn">
                    
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-[#222226] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{currentUser.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin 
                            ? 'bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]' 
                            : 'bg-[#16161A] text-sky-400 border border-sky-600/40'
                        }`}>
                          {currentUser.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#888] font-mono truncate">{currentUser.email}</div>
                    </div>

                    {/* Menu Actions */}
                    <div className="py-1">
                      
                      {/* Change Password */}
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenAuthModal('changePassword');
                        }}
                        className="w-full px-4 py-2.5 flex items-center space-x-2.5 text-[#CCC] hover:text-white hover:bg-[#16161A] transition-colors text-left"
                      >
                        <KeyRound className="w-4 h-4 text-[#BF092F]" />
                        <span>Cambiar Contraseña</span>
                      </button>

                      {/* Admin: Users Management */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onOpenAdminUsers();
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-2.5 text-[#BF092F] hover:bg-[#16161A] transition-colors text-left font-semibold"
                        >
                          <Users className="w-4 h-4 text-[#BF092F]" />
                          <span>Gestión de Usuarios & Roles</span>
                        </button>
                      )}

                      {/* Admin: Add Doctrinal Work */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onOpenAddDoctrinal();
                          }}
                          className="w-full px-4 py-2.5 flex items-center space-x-2.5 text-[#CCC] hover:text-white hover:bg-[#16161A] transition-colors text-left"
                        >
                          <BookPlus className="w-4 h-4 text-emerald-400" />
                          <span>Agregar Obra Doctrinal</span>
                        </button>
                      )}

                      {/* Drive Link Action if not connected (Admin only) */}
                      {isAdmin && !driveConnected && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onConnectDrive();
                          }}
                          disabled={isConnectingDrive}
                          className="w-full px-4 py-2.5 flex items-center space-x-2.5 text-[#CCC] hover:text-white hover:bg-[#16161A] transition-colors text-left"
                        >
                          <HardDrive className="w-4 h-4 text-[#BF092F]" />
                          <span>{isConnectingDrive ? 'Conectando...' : 'Vincular Google Drive'}</span>
                        </button>
                      )}

                    </div>

                    {/* Logout */}
                    <div className="pt-1 border-t border-[#222226]">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onLogoutUser();
                        }}
                        className="w-full px-4 py-2.5 flex items-center space-x-2.5 text-rose-400 hover:bg-rose-950/20 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="px-3.5 py-1.5 rounded bg-[#16161A] hover:bg-[#1A1A1E] border border-[#222226] hover:border-[#BF092F]/50 text-white text-xs font-semibold transition-all"
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="inline-flex items-center justify-center bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded shadow transition-all"
                >
                  <span>Registrarse</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#0A0A0C] border-t border-[#222226] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1.5 scrollbar-none">
          
          <button
            onClick={() => setActiveTab('repertorio')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'repertorio'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Repertorio & Buscador</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'drive'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Carpeta Drive "Tributario"</span>
            {driveConnected && tributarioFolderFound && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tesauro')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'tesauro'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Tesauro & Dogmática</span>
          </button>

          <button
            onClick={() => setActiveTab('asistente')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'asistente'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#BF092F]" />
            <span>Asistente Jurídico IA</span>
          </button>

          <button
            onClick={() => setActiveTab('comparador')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'comparador'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Comparador Doctrinal</span>
          </button>

          <button
            onClick={() => setActiveTab('guardados')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ml-auto ${
              activeTab === 'guardados'
                ? 'bg-[#1A1A1E] text-[#BF092F] border-b-2 border-[#BF092F] font-semibold'
                : 'text-[#888] hover:text-[#BBB] hover:bg-[#16161A]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Mis Citas</span>
            {savedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#BF092F] text-[#0A0A0C] rounded-full text-[10px] font-bold">
                {savedCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};

