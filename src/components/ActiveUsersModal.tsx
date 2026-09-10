import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  RefreshCw,
  Search,
  Shield,
  User,
  Building2,
  Mail,
  Activity,
  CheckCircle2,
  ExternalLink,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  Copy,
  Check,
  LogIn,
  LogOut,
  History,
  Monitor
} from 'lucide-react';
import { UserProfile, AccessLogEntry } from '../types';
import { fetchAccessLogs } from '../services/authService';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAdmin?: () => void;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'logs'>('active');
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const fetchActiveUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/users/active`);
      if (res.ok) {
        const data = await res.json();
        setActiveUsers(data.activeUsers || []);
        setActiveCount(data.activeCount || 0);
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const loadAccessLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const storedUser = localStorage.getItem('lex_current_user') || localStorage.getItem('portal_tributario_current_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.id) headers['x-user-id'] = parsed.id;
        }
        const storedToken = localStorage.getItem('lex_session_token');
        if (storedToken) headers['x-session-token'] = storedToken;
      } catch (e) {}

      const res = await fetch(`${import.meta.env.BASE_URL}api/users/access-logs?limit=150`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setAccessLogs(data.logs);
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching access logs:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async (showLoading = true) => {
    if (activeTab === 'active') {
      await fetchActiveUsers(showLoading);
    } else {
      await loadAccessLogs(showLoading);
    }
    setLastUpdated(new Date());
  }, [activeTab, fetchActiveUsers, loadAccessLogs]);

  useEffect(() => {
    if (!isOpen) return;

    fetchActiveUsers(true);
    loadAccessLogs(false);

    // Auto-refresh every 8 seconds while modal is open
    const interval = setInterval(() => {
      if (activeTab === 'active') {
        fetchActiveUsers(false);
      } else {
        loadAccessLogs(false);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab, fetchActiveUsers, loadAccessLogs]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  if (!isOpen) return null;

  const filteredUsers = activeUsers.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.organization && u.organization.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const filteredLogs = accessLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      log.userEmail.toLowerCase().includes(q) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
      (log.device && log.device.toLowerCase().includes(q)) ||
      log.action.toLowerCase().includes(q)
    );
  });

  const getDeviceIcon = (deviceStr?: string) => {
    if (!deviceStr) return <Monitor className="h-3.5 w-3.5" />;
    const lower = deviceStr.toLowerCase();
    if (lower.includes('móvil') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    }
    return <Laptop className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
  };

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'LOGIN':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <LogIn className="h-2.5 w-2.5" />
            <span>Inicio de Sesión</span>
          </span>
        );
      case 'LOGIN_FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <X className="h-2.5 w-2.5" />
            <span>Acceso Fallido</span>
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <LogOut className="h-2.5 w-2.5" />
            <span>Cierre de Sesión</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Activity className="h-2.5 w-2.5" />
            <span>{action}</span>
          </span>
        );
    }
  };

   if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Fixed Section: Header, Tabs, Search Bar */}
        <div className="shrink-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs border-b border-slate-100 dark:border-slate-800">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </span>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Monitor de Accesos y Sesiones
                  </h3>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{activeCount} en línea</span>
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Control de sesiones en tiempo real, IPs públicas y auditoría de dispositivos (Solo Admin)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 sm:px-6 pt-2 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('active');
                  fetchActiveUsers(true);
                }}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'active'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Usuarios Activos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold">
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('logs');
                  loadAccessLogs(true);
                }}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === 'logs'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <History className="h-4 w-4" />
                <span>Historial de Accesos & IPs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold">
                  {accessLogs.length}
                </span>
              </button>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'active' ? 'Buscar usuario u organización...' : 'Buscar por IP, usuario, correo o dispositivo...'}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </span>

              <button
                onClick={() => refreshAll(true)}
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all disabled:opacity-50"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body Section */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-[180px]">
          {/* TAB 1: USUARIOS ACTIVOS EN VIVO */}
          {activeTab === 'active' && (
            <>
              {isLoading && activeUsers.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 animate-pulse flex items-center space-x-4"
                    >
                      <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-2.5 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <Users className="h-6 w-6 opacity-40" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'No se encontraron coincidencias' : 'No hay usuarios activos en este momento'}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {searchQuery
                      ? 'Intenta con otro término de búsqueda.'
                      : 'Las sesiones se actualizarán automáticamente cuando los usuarios interactúen con el sistema.'}
                  </p>
                </div>
              ) : (
                filteredUsers.map(user => {
                  const isAdmin = user.role === 'admin';
                  return (
                    <div
                      key={user.id}
                      className="group p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs hover:shadow-sm"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={user.name}
                            className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                          />
                          <span
                            className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center"
                            title="En línea"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {user.name}
                            </span>
                            {isAdmin ? (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                <Shield className="h-2.5 w-2.5" />
                                <span>ADMIN</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
                                <User className="h-2.5 w-2.5" />
                                <span>USUARIO</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="flex items-center space-x-1 truncate">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </span>

                            {user.organization && (
                              <span className="flex items-center space-x-1 truncate">
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{user.organization}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Status & Metrics */}
                      <div className="flex items-center justify-between sm:justify-end space-x-3 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-left sm:text-right">
                          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>En Línea Ahora</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {user.queryCount > 0 ? `${user.queryCount} consultas realizadas` : 'Sesión activa'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: REGISTRO DE ACCESOS & DISPOSITIVOS (IP LOG) */}
          {activeTab === 'logs' && (
            <>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <History className="h-6 w-6 opacity-40" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'No se encontraron registros de acceso' : 'Sin registros de accesos aún'}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Los inicios de sesión registrarán la IP pública, sistema operativo y navegador automáticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map(log => {
                    const isCopied = copiedIp === log.ipAddress;
                    const dateObj = new Date(log.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                    const formattedTime = dateObj.toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/60 transition-all flex flex-col gap-2 shadow-xs"
                      >
                        {/* Top Line: User & Event Type */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {(log.userName || log.userEmail)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {log.userName || 'Usuario'}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  ({log.userEmail})
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {getActionBadge(log.action)}
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {formattedDate} {formattedTime}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Line: IP Address & Device Details */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
                          {/* IP Address Badge */}
                          <div className="flex items-center space-x-1.5 bg-slate-200/70 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-800">
                            <Globe className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-[10px]">
                              {log.ipAddress || '127.0.0.1 (Local)'}
                            </span>
                            {log.ipAddress && (
                              <button
                                onClick={() => copyToClipboard(log.ipAddress!)}
                                className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                title="Copiar IP"
                              >
                                {isCopied ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Device / OS / Browser Info */}
                          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 text-[10px]">
                            {getDeviceIcon(log.device)}
                            <span className="truncate font-medium">
                              {log.device || 'Dispositivo Desconocido'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Fixed Section: Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Auditoría de conexiones y detección de anomalías activa en PostgreSQL.</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {onNavigateToAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAdmin();
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors flex items-center space-x-1"
              >
                <span>Gestión de Usuarios</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
