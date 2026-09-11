import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  BookOpen,
  Share2,
  Bell,
  Sun,
  Moon,
  Shield,
  User,
  LogOut,
  CheckCircle,
  Database,
  ExternalLink,
  ChevronDown,
  Sparkles,
  AlertCircle,
  Layers,
  Type,
  Minus,
  Plus,
  RotateCcw,
  Users,
  Check,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { useRama } from '../context/RamaContext';
import { Neo4jConnectionConfig, RamaDerecho } from '../types';
import { ActiveUsersModal } from './ActiveUsersModal';

interface NavbarProps {
  currentTab: 'chat' | 'graph' | 'library' | 'admin';
  setCurrentTab: (tab: 'chat' | 'graph' | 'library' | 'admin') => void;
  neo4jConfig?: Neo4jConnectionConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  neo4jConfig
}) => {
  const { user, isAdmin, logout } = useAuth();
  const {
    isDarkMode,
    toggleDarkMode,
    fontSizePercent,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setFontSizePercent,
    canIncreaseFontSize,
    canDecreaseFontSize
  } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, requestPushPermission, pushPermission } = useNotifications();
  const { ramas, selectedRama, setSelectedRama } = useRama();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showRamaMenu, setShowRamaMenu] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState<boolean>(false);

  const ramaMenuRef = useRef<HTMLDivElement | null>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ramaMenuRef.current && !ramaMenuRef.current.contains(e.target as Node)) {
        setShowRamaMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll active users count when user is admin
  useEffect(() => {
    if (!isAdmin) return;

    const fetchActiveCount = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/users/active`);
        if (res.ok) {
          const data = await res.json();
          setActiveUsersCount(data.activeCount || 0);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 12000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors bg-white/90 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">

        {/* Left Section: Brand & Rama Selector */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setCurrentTab('chat')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-700 to-slate-900 flex items-center justify-center shadow-md text-white shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  IALegal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {selectedRama?.nombre || 'Derecho Especializado'}
              </p>
            </div>
          </div>

          {/* Rama del Derecho Selector Dropdown */}
          <div className="relative" ref={ramaMenuRef}>
            <button
              id="rama-selector-btn"
              onClick={() => {
                setShowRamaMenu(!showRamaMenu);
                setShowNotifications(false);
                setShowUserMenu(false);
                setShowFontSizeMenu(false);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60"
              title="Seleccionar Rama del Derecho"
            >
              <Briefcase className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold max-w-[130px] sm:max-w-[180px] truncate">
                {selectedRama?.nombre || 'Seleccionar Rama'}
              </span>
              <ChevronDown className={`h-3 w-3 text-amber-600 dark:text-amber-400 transition-transform ${showRamaMenu ? 'rotate-180' : ''}`} />
            </button>

            {showRamaMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Ramas del Derecho</span>
                  {/* <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">PostgreSQL</span> */}
                </div>
                <div className="p-1 space-y-1 max-h-72 overflow-y-auto">
                  {ramas.map(rama => {
                    const isSelected = selectedRama?.id === rama.id;
                    return (
                      <button
                        key={rama.id}
                        onClick={() => {
                          setSelectedRama(rama);
                          setShowRamaMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Scale className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                          <span className="truncate">{rama.nombre}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            id="nav-tab-chat"
            onClick={() => setCurrentTab('chat')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentTab === 'chat'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Chatbot RAG</span>
          </button>

          {isAdmin && (
            <button
              id="nav-tab-graph"
              onClick={() => setCurrentTab('graph')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentTab === 'graph'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Grafo Neo4j</span>
            </button>
          )}

          <button
            id="nav-tab-library"
            onClick={() => setCurrentTab('library')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentTab === 'library'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Biblioteca (PDFs)</span>
          </button>

          {isAdmin && (
            <button
              id="nav-tab-admin"
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentTab === 'admin'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Panel Admin</span>
            </button>
          )}
        </nav>

        {/* Right Tools & Profile */}
        <div className="flex items-center space-x-2">

          {/* Active Users Pill (Visible exclusively to Admins) */}
          {isAdmin && (
            <button
              id="active-users-btn"
              onClick={() => setShowActiveUsersModal(true)}
              title="Usuarios conectados en tiempo real (Clic para ver lista)"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/80 shadow-xs hover:shadow transition-all cursor-pointer group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">
                {activeUsersCount} {activeUsersCount === 1 ? 'Usuario activo' : 'Usuarios activos'}
              </span>
              <span className="sm:hidden font-bold">
                {activeUsersCount}
              </span>
            </button>
          )}

          {/* Neo4j Status Pill */}
          {/* title="Neo4j Server: 161.97.181.77" */}
          {isAdmin && (
            <div
              onClick={() => setCurrentTab('admin')}
              title="Server Status"
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer border bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="h-3 w-3 text-slate-500" />
              <span>Server Status</span>
            </div>
          )}

          {/* Font Size Scaling Control */}
          <div className="relative">
            <button
              id="font-size-btn"
              onClick={() => {
                setShowFontSizeMenu(!showFontSizeMenu);
                setShowNotifications(false);
                setShowUserMenu(false);
              }}
              aria-label="Ajustar tamaño de texto"
              title="Ajustar tamaño de letra (A- / A+)"
              className="flex items-center space-x-1 p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <Type className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold hidden sm:inline-block">
                {fontSizePercent}%
              </span>
            </button>

            {showFontSizeMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Tamaño de Letra
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900">
                    {fontSizePercent}%
                  </span>
                </div>

                {/* Quick Increment / Decrement Buttons */}
                <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 mb-3">
                  <button
                    onClick={decreaseFontSize}
                    disabled={!canDecreaseFontSize}
                    aria-label="Disminuir tamaño"
                    className="flex-1 py-1.5 flex items-center justify-center space-x-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Minus className="h-3.5 w-3.5" />
                    <span>A-</span>
                  </button>

                  <button
                    onClick={resetFontSize}
                    aria-label="Restablecer tamaño normal"
                    title="Restablecer al 100%"
                    className="px-2.5 py-1.5 flex items-center justify-center text-xs font-semibold rounded-lg bg-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={increaseFontSize}
                    disabled={!canIncreaseFontSize}
                    aria-label="Aumentar tamaño"
                    className="flex-1 py-1.5 flex items-center justify-center space-x-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span>A+</span>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Presets List */}
                <div className="space-y-1">
                  {[
                    { label: 'Pequeño', val: 90 },
                    { label: 'Normal (Por Defecto)', val: 100 },
                    { label: 'Grande', val: 110 },
                    { label: 'Muy Grande', val: 120 },
                    { label: 'Extra Grande', val: 130 }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      onClick={() => {
                        setFontSizePercent(preset.val as any);
                        setShowFontSizeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${fontSizePercent === preset.val
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold border border-amber-200 dark:border-amber-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] opacity-70 font-mono">{preset.val}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
                setShowFontSizeMenu(false);
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {pushPermission !== 'granted' && (
                      <button
                        onClick={requestPushPermission}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                      >
                        Activar Push
                      </button>
                    )}
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    >
                      Leídas
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No hay notificaciones</p>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={`py-3 px-1 transition-colors cursor-pointer ${!notif.read ? 'bg-amber-50/50 dark:bg-amber-950/20 rounded-lg px-2' : ''
                          }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0">
                            {notif.type === 'document_indexed' && <BookOpen className="h-4 w-4" />}
                            {notif.type === 'legal_alert' && <Scale className="h-4 w-4" />}
                            {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                            {notif.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <span className="text-[9px] text-slate-400 mt-1 inline-block">
                              {notif.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            {user ? (
              <button
                id="user-profile-menu-btn"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                  setShowFontSizeMenu(false);
                }}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                />
                <div className="text-left hidden xl:block">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {user.name.split(' ')[0]} {user.name.split(' ')[1] || ''}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                    }`}>
                    {user.role}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-slate-400 hidden xl:block" />
              </button>
            ) : (
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                <User className="h-3.5 w-3.5" />
                <span>Ingresar</span>
              </button>
            )}

            {showUserMenu && user && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-11 w-11 rounded-xl object-cover ring-2 ring-amber-500/30"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {user.authProvider.toUpperCase()} SSO • {user.role}
                    </span>
                  </div>
                </div>

                {/* User Details */}
                <div className="py-2.5 space-y-1">
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-500 dark:text-slate-400">Rol de usuario:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{user.role}</span>
                  </div>
                  {user.organization && (
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-slate-500 dark:text-slate-400">Organización:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{user.organization}</span>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center space-x-1.5 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 py-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 justify-around text-xs">
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg ${currentTab === 'chat' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-500'
            }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setCurrentTab('graph')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg ${currentTab === 'graph' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-500'
            }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Grafo</span>
        </button>
        <button
          onClick={() => setCurrentTab('library')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg ${currentTab === 'library' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-500'
            }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Libros</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg ${currentTab === 'admin' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
              }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowActiveUsersModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 font-semibold"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users className="h-3.5 w-3.5" />
            <span>{activeUsersCount}</span>
          </button>
        )}
      </div>

      {/* Active Users Modal (Admin only) */}
      {isAdmin && (
        <ActiveUsersModal
          isOpen={showActiveUsersModal}
          onClose={() => setShowActiveUsersModal(false)}
          onNavigateToAdmin={() => setCurrentTab('admin')}
        />
      )}
    </header>
  );
};
