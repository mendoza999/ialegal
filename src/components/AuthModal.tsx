import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Scale
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { 
  loginUser, 
  registerUser, 
  changeUserPassword, 
  resetUserPasswordByEmail 
} from '../services/authService';

export type AuthModalView = 'login' | 'register' | 'changePassword' | 'forgotPassword';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthModalView;
  currentUser: AppUser | null;
  onAuthSuccess: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialView = 'login',
  currentUser,
  onAuthSuccess,
}) => {
  const [view, setView] = useState<AuthModalView>(initialView);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [role, setRole] = useState<UserRole>('usuario');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormState = () => {
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
  };

  const handleSwitchView = (newView: AuthModalView) => {
    resetFormState();
    setView(newView);
  };

  // Quick preset test login
  const handleQuickLogin = async (presetEmail: string, presetPass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginUser(presetEmail, presetPass);
      setSuccessMessage(`¡Bienvenido/a, ${user.name}! Sesión iniciada con rol ${user.role.toUpperCase()}.`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const user = await loginUser(email, password);
      setSuccessMessage(`¡Sesión iniciada con éxito!`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const user = await registerUser(name, email, password, role);
      setSuccessMessage(`¡Cuenta creada con éxito con rol de ${role.toUpperCase()}!`);
      setTimeout(() => {
        onAuthSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Change Password (for logged-in user)
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Debes tener una sesión activa para cambiar tu contraseña.');
      return;
    }

    if (!currentPassword || !password || !confirmPassword) {
      setError('Por favor completa todos los campos de contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await changeUserPassword(currentUser.id, currentPassword, password);
      setSuccessMessage('¡Contraseña actualizada exitosamente!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Forgot Password / Reset
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmPassword) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await resetUserPasswordByEmail(email, password);
      setSuccessMessage('¡Contraseña restablecida con éxito! Ahora puedes iniciar sesión.');
      setTimeout(() => {
        setView('login');
        resetFormState();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111114] border border-[#222226] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Title & Close */}
        <div className="p-5 sm:p-6 border-b border-[#222226] flex items-center justify-between bg-[#16161A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] border border-[#BF092F]/50 flex items-center justify-center text-[#BF092F] shadow">
              {view === 'changePassword' || view === 'forgotPassword' ? (
                <KeyRound className="w-5 h-5" />
              ) : view === 'register' ? (
                <UserIcon className="w-5 h-5" />
              ) : (
                <Scale className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-white">
                {view === 'login' && 'Iniciar Sesión'}
                {view === 'register' && 'Crear Nueva Cuenta'}
                {view === 'changePassword' && 'Cambiar Contraseña'}
                {view === 'forgotPassword' && 'Recuperar Contraseña'}
              </h2>
              <p className="text-xs text-[#888]">
                {view === 'login' && 'Accede al Portal Tributario Jurídico'}
                {view === 'register' && 'Define tus credenciales y rol (Admin / Usuario)'}
                {view === 'changePassword' && `Actualiza la clave para ${currentUser?.email || 'tu cuenta'}`}
                {view === 'forgotPassword' && 'Establece una nueva clave de acceso'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#666] hover:text-white hover:bg-[#222226] transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs for Login / Register */}
        {(view === 'login' || view === 'register') && (
          <div className="grid grid-cols-2 p-1.5 bg-[#0D0D10] border-b border-[#222226]">
            <button
              onClick={() => handleSwitchView('login')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                view === 'login'
                  ? 'bg-[#1A1A1E] text-[#BF092F] shadow border border-[#222226]'
                  : 'text-[#888] hover:text-[#CCC]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => handleSwitchView('register')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                view === 'register'
                  ? 'bg-[#1A1A1E] text-[#BF092F] shadow border border-[#222226]'
                  : 'text-[#888] hover:text-[#CCC]'
              }`}
            >
              Crear Cuenta (Roles)
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Notifications / Feedback */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================= VIEW: LOGIN ================= */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Quick Demo Access Pills */}
              <div className="bg-[#16161A] p-3 rounded-xl border border-[#222226] space-y-2">
                <div className="text-[11px] font-semibold text-[#888] flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#BF092F]" />
                    <span>Cuentas de prueba rápida:</span>
                  </span>
                  <span className="text-[10px] text-[#666]">1-Click</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@lextributaria.pe', 'Admin123*')}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-[#1A1A1E] border border-[#BF092F]/40 hover:border-[#BF092F] text-left transition-all group"
                  >
                    <div className="font-bold text-[#BF092F] text-[11px] flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Administrador</span>
                    </div>
                    <div className="text-[10px] text-[#888] font-mono truncate">admin@lextributaria.pe</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('usuario@lextributaria.pe', 'Usuario123*')}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-[#1A1A1E] border border-[#222226] hover:border-[#888] text-left transition-all"
                  >
                    <div className="font-bold text-[#CCC] text-[11px] flex items-center space-x-1">
                      <UserIcon className="w-3 h-3 text-sky-400" />
                      <span>Usuario Normal</span>
                    </div>
                    <div className="text-[10px] text-[#888] font-mono truncate">usuario@lextributaria.pe</div>
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@abogados.pe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchView('forgotPassword')}
                    className="text-[11px] text-[#BF092F] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2 text-[#888] text-[11px]">
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchView('register')}
                  className="text-[#BF092F] font-semibold hover:underline"
                >
                  Regístrate aquí
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW: REGISTER ================= */}
          {view === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Nombre Completo / Título Profesional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Dr. Mario Ruiz de Castilla"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tributarista@estudio.pe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                </div>
              </div>

              {/* Role Selection (Admin vs Usuario) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Selecciona el Tipo de Rol:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Option: Usuario */}
                  <div
                    onClick={() => setRole('usuario')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'usuario'
                        ? 'bg-[#1A1A1E] border-sky-500 text-white shadow'
                        : 'bg-[#16161A] border-[#222226] text-[#888] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-sky-400">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Usuario</span>
                    </div>
                    <div className="text-[10px] text-[#888] mt-1 leading-tight">
                      Consultas, lector de doctrina, IA, tesauro y citas personales.
                    </div>
                  </div>

                  {/* Option: Admin */}
                  <div
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'bg-[#1A1A1E] border-[#BF092F] text-white shadow'
                        : 'bg-[#16161A] border-[#222226] text-[#888] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-[#BF092F]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Administrador</span>
                    </div>
                    <div className="text-[10px] text-[#888] mt-1 leading-tight">
                      Gestión de usuarios, altas en repertorio doctrinal y control total.
                    </div>
                  </div>

                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Creando cuenta...' : `Crear Cuenta como ${role.toUpperCase()}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1 text-[#888] text-[11px]">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchView('login')}
                  className="text-[#BF092F] font-semibold hover:underline"
                >
                  Inicia sesión aquí
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW: CHANGE PASSWORD ================= */}
          {view === 'changePassword' && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              
              <div className="bg-[#16161A] p-3 rounded-xl border border-[#222226] text-[11px] text-[#AAA]">
                Usuario activo: <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.email})
              </div>

              {/* Current Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 bg-[#16161A] hover:bg-[#1A1A1E] text-[#AAA] font-semibold text-xs rounded-xl border border-[#222226] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Actualizando...' : 'Guardar Nueva Clave'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= VIEW: FORGOT PASSWORD ================= */}
          {view === 'forgotPassword' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
              
              <div className="text-[11px] text-[#888]">
                Ingresa tu correo registrado y establece inmediatamente tu nueva contraseña de acceso.
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@abogados.pe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888]">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#16161A] border border-[#222226] rounded-xl text-white text-xs placeholder-[#555] focus:outline-none focus:border-[#BF092F] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#666] hover:text-[#CCC]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchView('login')}
                  className="text-xs text-[#888] hover:text-white"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
