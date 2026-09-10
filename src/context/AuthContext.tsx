import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  concurrentSessionAlert: boolean;
  dismissConcurrentAlert: () => void;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('lex_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem('lex_session_token') || null;
  });

  const [concurrentSessionAlert, setConcurrentSessionAlert] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('lex_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('lex_current_user');
    }
  }, [user]);

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('lex_session_token', sessionToken);
    } else {
      localStorage.removeItem('lex_session_token');
    }
  }, [sessionToken]);

  const logout = useCallback(async () => {
    if (user?.id) {
      try {
        await fetch(import.meta.env.BASE_URL + 'api/users/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
      } catch (err) {
        // ignore
      }
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('lex_current_user');
    localStorage.removeItem('lex_session_token');
  }, [user?.id]);

  const handleConcurrentKick = useCallback(() => {
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem('lex_current_user');
    localStorage.removeItem('lex_session_token');
    setConcurrentSessionAlert(true);
  }, []);

  // Heartbeat to validate that current session has not been superseded by another device/browser
  const checkSessionActive = useCallback(async () => {
    if (!user?.id || !sessionToken) return;

    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/users/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionToken })
      });
      const data = await res.json();
      if (data && data.valid === false) {
        handleConcurrentKick();
      }
    } catch (err) {
      // Network error, skip interval
    }
  }, [user?.id, sessionToken, handleConcurrentKick]);

  useEffect(() => {
    if (!user?.id || !sessionToken) return;

    // Check every 10 seconds
    const interval = setInterval(checkSessionActive, 10000);

    // Also check immediately when user focuses back on the tab
    const handleFocus = () => {
      checkSessionActive();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id, sessionToken, checkSessionActive]);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      console.error('Login error 0:: ');
      const res = await fetch(import.meta.env.BASE_URL + 'api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      console.error('Login error 1:: ');
      const data = await res.json();
      console.error('Login error 2:: ');
      if (data.success && data.user && data.sessionToken) {
        setUser(data.user);
        setSessionToken(data.sessionToken);
        setConcurrentSessionAlert(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:: ', e);
      return false;
    }
  };

  const dismissConcurrentAlert = () => {
    setConcurrentSessionAlert(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        concurrentSessionAlert,
        dismissConcurrentAlert,
        login,
        logout
      }}
    >
      {children}
      {concurrentSessionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="h-16 w-16 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Sesión Finalizada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Se ha detectado un nuevo inicio de sesión con tu cuenta en otro dispositivo o navegador. Por políticas de seguridad institucional, solo se permite <strong>una sesión activa simultánea</strong>.
              </p>
            </div>
            <button
              onClick={dismissConcurrentAlert}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Entendido / Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
