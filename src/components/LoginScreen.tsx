import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, Activity, Database, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

type Mode = 'login' | 'register';

const inputClass =
  'w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { addNotification } = useNotifications();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (!success) {
        addNotification({
          title: 'Error de Acceso',
          message: 'Correo o contraseña incorrectos',
          type: 'warning'
        });
      }
    } catch (err) {
      addNotification({
        title: 'Error del Sistema',
        message: 'No se pudo conectar con el servidor',
        type: 'warning'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = regName.trim();
    const mail = regEmail.trim().toLowerCase();

    if (!name) {
      addNotification({ title: 'Registro incompleto', message: 'Ingresa tu nombre completo.', type: 'warning' });
      return;
    }
    if (!mail || !mail.includes('@')) {
      addNotification({ title: 'Registro incompleto', message: 'Ingresa un correo electrónico válido.', type: 'warning' });
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      addNotification({ title: 'Registro incompleto', message: 'La contraseña debe tener al menos 6 caracteres.', type: 'warning' });
      return;
    }
    if (regPassword !== regConfirm) {
      addNotification({ title: 'Registro incompleto', message: 'Las contraseñas no coinciden.', type: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: mail, password: regPassword, role: 'user' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        addNotification({
          title: 'No se pudo registrar',
          message: data.error || 'Error al crear la cuenta.',
          type: 'warning'
        });
        return;
      }
      const ok = await login(mail, regPassword);
      if (ok) {
        addNotification({ title: 'Cuenta creada', message: `Bienvenido, ${name}.`, type: 'success' });
      }
    } catch (err) {
      addNotification({
        title: 'Error del Sistema',
        message: 'No se pudo conectar con el servidor',
        type: 'warning'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Theme toggle button top right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 shadow-sm transition-all"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-300 rounded-2xl blur opacity-30"></div>
            <div className="relative h-16 w-16 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              IA<span className="text-amber-600 dark:text-amber-500">Legal</span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
              Motor de busqueda sobre Conocimiento Legal peruano
            </p>
          </div>
        </div>

        {/* Login / Register Box */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 mb-6 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-500 shadow'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Acceder
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-500 shadow'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Regístrate
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
              >
                <span>{isLoading ? 'Verificando...' : 'Acceder al Sistema'}</span>
                {!isLoading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nombres y apellidos"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Repetir Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-amber-600 dark:text-amber-500 font-bold border border-slate-200 dark:border-slate-800 tracking-wider">
                    Usuario
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
              >
                <span>{isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}</span>
                {!isLoading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}
          <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex flex-col items-center space-y-1 opacity-60">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Vector DB</span>
              </div>
              <div className="flex flex-col items-center space-y-1 opacity-60">
                <Activity className="h-4 w-4 text-slate-400" />
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Hibrid Search</span>
              </div>
            </div>
          </div>
        </div>
        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-8 font-medium">
          Acceso restringido. Uso exclusivo para personal autorizado.
        </p>
        <p className="text-center text-[11px] text-slate-500 mt-8 font-medium">
          (c) Algoritmo Juridico S.A.C. 2026
        </p>

      </div>
    </div>
  );
};
