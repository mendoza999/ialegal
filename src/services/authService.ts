import { AppUser, UserRole, AccessLogEntry } from '../types';

const CURRENT_USER_KEY = 'lex_current_user';

export const getCurrentUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem('lex_current_user') || localStorage.getItem('portal_tributario_current_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading current user:', error);
    return null;
  }
};

export const setCurrentUser = (user: AppUser | null): void => {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Error saving current user:', error);
  }
};

export const getAuthHeaders = (): Record<string, string> => {
  const user = getCurrentUser();
  const token = localStorage.getItem('lex_session_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.id) {
    headers['x-user-id'] = user.id;
  }
  if (token) {
    headers['x-session-token'] = token;
  }
  return headers;
};

export const fetchAllUsers = async (): Promise<AppUser[]> => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/users`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.users && Array.isArray(data.users)) {
      return data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role === 'admin' ? 'admin' : 'usuario',
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      }));
    }
    return [];
  } catch (err) {
    console.error('Error fetching users from PostgreSQL:', err);
    return [];
  }
};

export const getStoredUsers = (): AppUser[] => {
  return [];
};

export const loginUser = async (email: string, password: string): Promise<AppUser> => {
  const trimmedEmail = email.trim().toLowerCase();

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: trimmedEmail, password })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.user) {
    throw new Error(data.error || 'Credenciales inválidas.');
  }

  const appUser: AppUser = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role === 'admin' ? 'admin' : 'usuario',
    createdAt: data.user.createdAt,
    lastLogin: data.user.lastLogin || new Date().toISOString(),
  };

  if (data.sessionToken) {
    localStorage.setItem('lex_session_token', data.sessionToken);
  }

  setCurrentUser(appUser);
  return appUser;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  role: UserRole = 'usuario'
): Promise<AppUser> => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    throw new Error('El nombre completo es obligatorio.');
  }

  if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    throw new Error('Ingresa un correo electrónico válido.');
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: trimmedName,
      email: trimmedEmail,
      password,
      role: role === 'admin' ? 'admin' : 'user',
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.user) {
    throw new Error(data.error || 'Error al registrar el usuario.');
  }

  const appUser: AppUser = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role === 'admin' ? 'admin' : 'usuario',
    createdAt: data.user.createdAt,
    lastLogin: data.user.lastLogin || new Date().toISOString(),
  };

  setCurrentUser(appUser);
  return appUser;
};

export const changeUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Sesión no encontrada.');
  }

  // Validate current password via login endpoint
  const checkRes = await fetch(`${import.meta.env.BASE_URL}api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: currentUser.email, password: currentPassword })
  });

  if (!checkRes.ok) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, newPassword })
  });

  if (!res.ok) {
    throw new Error('Error al actualizar la contraseña.');
  }
};

export const resetUserPasswordByEmail = async (
  email: string,
  newPassword: string
): Promise<void> => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const usersRes = await fetch(`${import.meta.env.BASE_URL}api/users`);
  const data = await usersRes.json();
  const found = (data.users || []).find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!found) {
    throw new Error('No existe ningún usuario registrado con este correo electrónico.');
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: found.id, newPassword })
  });

  if (!res.ok) {
    throw new Error('Error al restablecer la contraseña.');
  }
};

export const adminUpdateUserRole = async (
  userId: string,
  newRole: UserRole
): Promise<AppUser> => {
  const roleValue = newRole === 'admin' ? 'admin' : 'user';
  const res = await fetch(`${import.meta.env.BASE_URL}api/users/update-role`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, newRole: roleValue })
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.user) {
    throw new Error(data.error || 'Error al actualizar rol del usuario.');
  }

  const updated: AppUser = {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role === 'admin' ? 'admin' : 'usuario',
    createdAt: data.user.createdAt,
    lastLogin: data.user.lastLogin,
  };

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(updated);
  }

  return updated;
};

export const adminDeleteUser = async (userId: string): Promise<void> => {
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    throw new Error('No puedes eliminar tu propia cuenta de administrador en uso.');
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    throw new Error('Error al eliminar usuario en PostgreSQL.');
  }
};

export const adminCreateUser = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<AppUser> => {
  return registerUser(name, email, password, role);
};

export const adminResetPassword = async (userId: string, newPass: string): Promise<void> => {
  if (!newPass || newPass.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const res = await fetch(`${import.meta.env.BASE_URL}api/users/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, newPassword: newPass })
  });

  if (!res.ok) {
    throw new Error('Error al actualizar contraseña.');
  }
};

export const fetchAccessLogs = async (limit: number = 100): Promise<AccessLogEntry[]> => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/users/access-logs?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.logs)) {
      return data.logs;
    }
    return [];
  } catch (err) {
    console.error('Error fetching access logs:', err);
    return [];
  }
};

