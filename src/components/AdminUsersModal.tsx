import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  User as UserIcon, 
  Trash2, 
  KeyRound, 
  UserPlus, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Clock,
  Mail,
  ShieldAlert
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { 
  fetchAllUsers, 
  adminUpdateUserRole, 
  adminDeleteUser, 
  adminCreateUser,
  adminResetPassword 
} from '../services/authService';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserListChanged?: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserListChanged,
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('usuario');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    const list = await fetchAllUsers();
    setUsers(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setIsCreating(false);
      setResettingUserId(null);
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleToggle = async (userId: string, currentRole: UserRole) => {
    const targetRole: UserRole = currentRole === 'admin' ? 'usuario' : 'admin';
    try {
      await adminUpdateUserRole(userId, targetRole);
      loadUsers();
      setMessage({ type: 'success', text: `Rol actualizado a ${targetRole.toUpperCase()} correctamente.` });
      if (onUserListChanged) onUserListChanged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al cambiar rol.' });
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cuenta de "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await adminDeleteUser(userId);
      loadUsers();
      setMessage({ type: 'success', text: `Usuario ${userName} eliminado exitosamente.` });
      if (onUserListChanged) onUserListChanged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al eliminar usuario.' });
    }
  };

  const handleResetPasswordSubmit = async (userId: string) => {
    if (!newPasswordValue || newPasswordValue.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    try {
      await adminResetPassword(userId, newPasswordValue);
      setResettingUserId(null);
      setNewPasswordValue('');
      setMessage({ type: 'success', text: 'Contraseña restablecida correctamente.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al restablecer contraseña.' });
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setMessage({ type: 'error', text: 'Todos los campos son requeridos.' });
      return;
    }

    try {
      await adminCreateUser(newName, newEmail, newPassword, newRole);
      loadUsers();
      setIsCreating(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setMessage({ type: 'success', text: `Nuevo usuario ${newRole.toUpperCase()} creado exitosamente.` });
      if (onUserListChanged) onUserListChanged();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al crear usuario.' });
    }
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const usuarioCount = users.filter((u) => u.role === 'usuario').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111114] border border-[#222226] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#222226] flex items-center justify-between bg-[#16161A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] border border-[#BF092F] flex items-center justify-center text-[#BF092F] shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-serif font-bold text-white">
                  Panel de Gestión de Usuarios & Roles
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#BF092F] text-[#0A0A0C] font-bold uppercase tracking-wider">
                  Acceso Admin
                </span>
              </div>
              <p className="text-xs text-[#888]">
                Control de credenciales, roles asignados y privilegios del sistema
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

        {/* Status Bar / Stats */}
        <div className="px-6 py-3 bg-[#0D0D10] border-b border-[#222226] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-[#888]">Total Usuarios:</span>
              <strong className="text-white font-mono">{users.length}</strong>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#BF092F]" />
              <span className="text-[#888]">Admins:</span>
              <strong className="text-[#BF092F] font-mono">{adminCount}</strong>
            </div>
            <div className="flex items-center space-x-1.5">
              <UserIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[#888]">Usuarios:</span>
              <strong className="text-sky-400 font-mono">{usuarioCount}</strong>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#16161A] hover:bg-[#1A1A1E] border border-[#BF092F]/50 text-[#BF092F] text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isCreating ? 'Cancelar' : 'Nuevo Usuario'}</span>
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-[#888] hover:text-white text-[10px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Create User Sub-Form */}
          {isCreating && (
            <form onSubmit={handleCreateUserSubmit} className="bg-[#16161A] border border-[#BF092F]/40 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
                <span className="font-bold text-xs text-[#BF092F] uppercase tracking-wider flex items-center space-x-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Usuario desde Panel Administrador</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[#888] hover:text-white"
                >
                  Cerrar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej. Dr. Mario Alva Matteucci"
                    className="w-full px-3 py-2 bg-[#111114] border border-[#222226] rounded-lg text-white focus:outline-none focus:border-[#BF092F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="correo@tributario.pe"
                    className="w-full px-3 py-2 bg-[#111114] border border-[#222226] rounded-lg text-white focus:outline-none focus:border-[#BF092F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 bg-[#111114] border border-[#222226] rounded-lg text-white focus:outline-none focus:border-[#BF092F]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888] mb-1">Rol Asignado</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-[#111114] border border-[#222226] rounded-lg text-white focus:outline-none focus:border-[#BF092F]"
                  >
                    <option value="usuario">Usuario (Investigador)</option>
                    <option value="admin">Administrador (Control Total)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#BF092F] hover:bg-[#A10727] text-[#0A0A0C] font-bold text-xs uppercase tracking-wider"
                >
                  Registrar Usuario
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="border border-[#222226] rounded-xl overflow-hidden bg-[#111114]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16161A] text-[#888] border-b border-[#222226] font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Registro</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226]">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isUserAdmin = u.role === 'admin';

                  return (
                    <tr key={u.id} className="hover:bg-[#16161A]/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isUserAdmin 
                              ? 'bg-[#1A1A1E] text-[#BF092F] border border-[#BF092F]' 
                              : 'bg-[#16161A] text-sky-400 border border-sky-600/40'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center space-x-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded">
                                  TÚ
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#888] font-mono flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-[#666]" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleRoleToggle(u.id, u.role)}
                          title="Haz clic para cambiar el rol de este usuario"
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            isUserAdmin
                              ? 'bg-[#1A1A1E] text-[#BF092F] border-[#BF092F] hover:bg-[#BF092F] hover:text-[#0A0A0C]'
                              : 'bg-[#16161A] text-sky-400 border-sky-600/40 hover:bg-sky-500 hover:text-black'
                          }`}
                        >
                          {isUserAdmin ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          <span>{u.role}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-[#666] text-[11px] hidden sm:table-cell font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          
                          {/* Reset Password Button */}
                          <button
                            onClick={() => setResettingUserId(resettingUserId === u.id ? null : u.id)}
                            className="p-1.5 rounded bg-[#16161A] hover:bg-[#222226] text-[#888] hover:text-[#BF092F] border border-[#222226] transition-colors"
                            title="Restablecer contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(u.id, u.name)}
                            disabled={isCurrent}
                            className="p-1.5 rounded bg-[#16161A] hover:bg-rose-950/40 text-[#666] hover:text-rose-400 border border-[#222226] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCurrent ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>

                        {/* Reset password sub-row */}
                        {resettingUserId === u.id && (
                          <div className="mt-2 p-2 bg-[#1A1A1E] border border-[#BF092F]/50 rounded-lg text-left space-y-2 animate-fadeIn">
                            <div className="text-[10px] text-[#BF092F] font-semibold">
                              Nueva clave para {u.name}:
                            </div>
                            <div className="flex space-x-2">
                              <input
                                type="password"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                placeholder="Nueva clave (min 6 car.)"
                                className="flex-1 px-2.5 py-1 bg-[#111114] border border-[#222226] rounded text-white text-xs focus:outline-none focus:border-[#BF092F]"
                              />
                              <button
                                onClick={() => handleResetPasswordSubmit(u.id)}
                                className="px-3 py-1 bg-[#BF092F] text-[#0A0A0C] font-bold text-[10px] uppercase rounded"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};
