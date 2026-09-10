import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';
import { UserProfile, UserRole, AccessLogEntry } from '../src/types';

// Cupos diarios por tipo de consulta (req. 5 local + 5 web)
export const DAILY_WEB_LIMIT = 5;
export const DAILY_LOCAL_LIMIT = 5;

export function parseDeviceAndBrowser(userAgent?: string): { device: string; browser: string; os: string } {
  if (!userAgent) return { device: 'Desconocido', browser: 'Navegador Web', os: 'SO Desconocido' };

  let os = 'SO Desconocido';
  if (/windows nt 10\.0/i.test(userAgent)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(userAgent)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(userAgent)) os = 'Windows 7';
  else if (/mac os x/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS / Apple';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let browser = 'Web Browser';
  if (/edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) browser = 'Apple Safari';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/opera|opr\//i.test(userAgent)) browser = 'Opera';

  let deviceType = 'Desktop';
  if (/mobile|android|iphone|ipod/i.test(userAgent)) deviceType = 'Móvil';
  else if (/ipad|tablet/i.test(userAgent)) deviceType = 'Tablet';

  return {
    device: `${os} • ${browser} (${deviceType})`,
    browser,
    os
  };
}

export function cleanClientIp(ipAddress?: string): string {
  if (!ipAddress) return '127.0.0.1';
  let cleaned = ipAddress.trim();
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[0].trim();
  }
  if (cleaned === '::1' || cleaned === '::ffff:127.0.0.1') {
    return '127.0.0.1 (Localhost)';
  }
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

export class UsersStore {
  public async getUsers(): Promise<UserProfile[]> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: u.role as UserRole,
        authProvider: (u.authProvider as any) || 'email',
        organization: u.organization || undefined,
        createdAt: u.createdAt.toISOString().split('T')[0],
        lastLogin: u.lastLogin || 'Nunca',
        queryCount: u.queryCount,
        dailyWebQueries: {
          date: u.dailyWebDate || new Date().toISOString().split('T')[0],
          count: u.dailyWebCount,
        },
      }));
    } catch (err) {
      console.error('[UsersStore] Error fetching users:', err);
      return [];
    }
  }

  public async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!u) return null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: u.role as UserRole,
        authProvider: (u.authProvider as any) || 'email',
        organization: u.organization || undefined,
        createdAt: u.createdAt.toISOString().split('T')[0],
        lastLogin: u.lastLogin || 'Nunca',
        queryCount: u.queryCount,
        dailyWebQueries: {
          date: u.dailyWebDate || new Date().toISOString().split('T')[0],
          count: u.dailyWebCount,
        },
      };
    } catch (err) {
      console.error(`[UsersStore] Error finding user ${userId}:`, err);
      return null;
    }
  }

  public async isAdminUser(userId?: string, sessionToken?: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!u || u.role !== 'admin') return false;
      return true;
    } catch (err) {
      console.error(`[UsersStore] Error checking admin status for ${userId}:`, err);
      return false;
    }
  }

  public async updateUserRole(userId: string, newRole: string): Promise<UserProfile | null> {
    try {
      const u = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || '',
        role: u.role as UserRole,
        authProvider: (u.authProvider as any) || 'email',
        organization: u.organization || undefined,
        createdAt: u.createdAt.toISOString().split('T')[0],
        lastLogin: u.lastLogin || 'Nunca',
        queryCount: u.queryCount,
      };
    } catch (err) {
      console.error(`[UsersStore] Error updating role for user ${userId}:`, err);
      return null;
    }
  }

  public async createUser(userData: Partial<UserProfile> & { password?: string }): Promise<UserProfile> {
    const rawPassword = userData.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const today = new Date().toISOString().split('T')[0];

    const u = await prisma.user.create({
      data: {
        id: userData.id || undefined,
        name: userData.name || 'Nuevo Usuario',
        email: userData.email?.trim().toLowerCase() || '',
        password: hashedPassword,
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        role: (userData.role as string) || 'user',
        authProvider: (userData.authProvider as string) || 'email',
        organization: userData.organization || 'Estudio Jurídico',
        lastLogin: 'Nunca',
        queryCount: 0,
        dailyWebCount: 0,
        dailyWebDate: today,
        dailyLocalCount: 0,
        dailyLocalDate: today,
      },
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || '',
      role: u.role as UserRole,
      authProvider: (u.authProvider as any) || 'email',
      organization: u.organization || undefined,
      createdAt: u.createdAt.toISOString().split('T')[0],
      lastLogin: u.lastLogin || 'Nunca',
      queryCount: u.queryCount,
    };
  }

  public async recordAccessLog(params: {
    userId?: string;
    userName?: string;
    userEmail: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    action?: string;
    details?: string;
  }): Promise<void> {
    try {
      const parsed = parseDeviceAndBrowser(params.userAgent);
      const cleanIp = cleanClientIp(params.ipAddress);
      await prisma.accessLog.create({
        data: {
          userId: params.userId || null,
          userName: params.userName || null,
          userEmail: params.userEmail,
          userRole: params.userRole || null,
          ipAddress: cleanIp,
          userAgent: params.userAgent || null,
          device: params.device || parsed.device,
          action: params.action || 'LOGIN',
          details: params.details || null,
        }
      });
      console.log(`[AccessLog] Registrado evento ${params.action} para ${params.userEmail} (IP: ${cleanIp}, Dispositivo: ${params.device || parsed.device})`);
    } catch (err) {
      console.warn('[UsersStore] Error recording access log:', err);
    }
  }

  public async getAccessLogs(limit: number = 150): Promise<AccessLogEntry[]> {
    try {
      const logs = await prisma.accessLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return logs.map(l => ({
        id: l.id,
        userId: l.userId || undefined,
        userName: l.userName || undefined,
        userEmail: l.userEmail,
        userRole: l.userRole || undefined,
        ipAddress: l.ipAddress || undefined,
        userAgent: l.userAgent || undefined,
        device: l.device || undefined,
        action: l.action,
        details: l.details || undefined,
        createdAt: l.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error('[UsersStore] Error fetching access logs:', err);
      return [];
    }
  }

  public async loginUser(
    email: string,
    password?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: UserProfile; sessionToken: string } | null> {
    if (!email) return null;
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const u = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      // 1. Usuario no encontrado -> Registrar intento fallido
      if (!u) {
        await this.recordAccessLog({
          userEmail: trimmedEmail,
          userName: 'Usuario no registrado',
          ipAddress,
          userAgent,
          action: 'LOGIN_FAILED',
          details: 'Intento de acceso con correo no registrado'
        });
        return null;
      }

      // 2. Comprobar contraseña
      let isMatch = false;
      if (password) {
        if (u.password.startsWith('$2')) {
          isMatch = await bcrypt.compare(password, u.password);
        } else {
          isMatch = u.password === password;
          if (isMatch) {
            // Rehash password con bcrypt
            const newHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
              where: { id: u.id },
              data: { password: newHash },
            });
          }
        }
      }

      // 3. Contraseña incorrecta -> Registrar intento fallido
      if (!isMatch) {
        await this.recordAccessLog({
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userRole: u.role,
          ipAddress,
          userAgent,
          action: 'LOGIN_FAILED',
          details: 'Intento de acceso: Contraseña incorrecta'
        });
        return null;
      }

      // 4. Credenciales correctas → Generar sesión con CSPRNG y registrar login exitoso
      const sessionToken = `tok_${crypto.randomBytes(24).toString('hex')}`;
      const nowStr = 'Ahora';

      await prisma.user.update({
        where: { id: u.id },
        data: {
          lastLogin: nowStr,
          activeSessionToken: sessionToken,
          activeSessionAt: new Date(),
        },
      });

      // Guardar log de login exitoso
      await this.recordAccessLog({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userRole: u.role,
        ipAddress,
        userAgent,
        action: 'LOGIN',
        details: 'Inicio de sesión exitoso con credenciales'
      });

      const userProfile: UserProfile = {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: u.role as UserRole,
        authProvider: (u.authProvider as any) || 'email',
        organization: u.organization || undefined,
        createdAt: u.createdAt.toISOString().split('T')[0],
        lastLogin: nowStr,
        queryCount: u.queryCount,
        dailyWebQueries: {
          date: u.dailyWebDate || new Date().toISOString().split('T')[0],
          count: u.dailyWebCount,
        },
      };

      return {
        user: userProfile,
        sessionToken,
      };
    } catch (err) {
      console.error('[UsersStore] Login error:', err);
      return null;
    }
  }

  public async validateSession(userId: string, sessionToken: string): Promise<{ valid: boolean; reason?: string }> {
    if (!userId || !sessionToken) {
      return { valid: false, reason: 'MISSING_CREDENTIALS' };
    }

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!u) {
        return { valid: false, reason: 'USER_NOT_FOUND' };
      }

      if (!u.activeSessionToken) {
        return { valid: false, reason: 'NO_ACTIVE_SESSION' };
      }

      if (u.activeSessionToken !== sessionToken) {
        return { valid: false, reason: 'CONCURRENT_SESSION_DETECTED' };
      }

      // Update activeSessionAt to keep heartbeat timestamp fresh
      await prisma.user.update({
        where: { id: userId },
        data: { activeSessionAt: new Date() },
      });

      return { valid: true };
    } catch (err) {
      console.error(`[UsersStore] Error validating session for ${userId}:`, err);
      return { valid: false, reason: 'SERVER_ERROR' };
    }
  }

  public async logoutUser(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    if (!userId) return true;
    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (u) {
        await this.recordAccessLog({
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userRole: u.role,
          ipAddress,
          userAgent,
          action: 'LOGOUT',
          details: 'Cierre de sesión de usuario'
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          activeSessionToken: null,
          activeSessionAt: null,
        },
      });
      return true;
    } catch (err) {
      console.error(`[UsersStore] Error logging out user ${userId}:`, err);
      return false;
    }
  }

  public async getActiveUsers(): Promise<{ activeCount: number; activeUsers: UserProfile[] }> {
    try {
      // Users active within the last 2.5 minutes (heartbeat is every 10 seconds)
      const activeThreshold = new Date(Date.now() - 2.5 * 60 * 1000);

      const activeRecords = await prisma.user.findMany({
        where: {
          activeSessionToken: { not: null },
          activeSessionAt: { gte: activeThreshold },
        },
        orderBy: { activeSessionAt: 'desc' },
      });

      const mapped: UserProfile[] = activeRecords.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: u.role as UserRole,
        authProvider: (u.authProvider as any) || 'email',
        organization: u.organization || undefined,
        createdAt: u.createdAt.toISOString().split('T')[0],
        lastLogin: u.lastLogin || 'Ahora',
        queryCount: u.queryCount,
        dailyWebQueries: {
          date: u.dailyWebDate || new Date().toISOString().split('T')[0],
          count: u.dailyWebCount,
        },
      }));

      return {
        activeCount: mapped.length,
        activeUsers: mapped,
      };
    } catch (err) {
      console.error('[UsersStore] Error getting active users:', err);
      return { activeCount: 0, activeUsers: [] };
    }
  }

  public async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      return true;
    } catch (err) {
      console.error(`[UsersStore] Error updating password for user ${userId}:`, err);
      return false;
    }
  }

  public async deleteUser(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch (err) {
      console.error(`[UsersStore] Error deleting user ${userId}:`, err);
      return false;
    }
  }

  public async getWebQueryUsage(userId?: string): Promise<{ count: number; limit: number; remaining: number; resetDate: string }> {
    const today = new Date().toISOString().split('T')[0];
    const limit = DAILY_WEB_LIMIT;

    if (!userId) {
      return { count: 0, limit, remaining: limit, resetDate: today };
    }

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!u) {
        return { count: 0, limit, remaining: limit, resetDate: today };
      }

      if (u.dailyWebDate !== today) {
        await prisma.user.update({
          where: { id: userId },
          data: { dailyWebDate: today, dailyWebCount: 0 },
        });
        return { count: 0, limit, remaining: limit, resetDate: today };
      }

      return {
        count: u.dailyWebCount,
        limit,
        remaining: Math.max(0, limit - u.dailyWebCount),
        resetDate: today,
      };
    } catch (err) {
      console.error(`[UsersStore] Error checking web usage for ${userId}:`, err);
      return { count: 0, limit, remaining: limit, resetDate: today };
    }
  }

  public async incrementWebQueryUsage(userId?: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const limit = DAILY_WEB_LIMIT;

    if (!userId) return true;

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!u) return true;

      let currentCount = u.dailyWebCount;
      if (u.dailyWebDate !== today) {
        currentCount = 0;
      }

      if (currentCount >= limit) {
        return false;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyWebDate: today,
          dailyWebCount: currentCount + 1,
          queryCount: u.queryCount + 1,
        },
      });

      return true;
    } catch (err) {
      console.error(`[UsersStore] Error incrementing web usage for ${userId}:`, err);
      return true;
    }
  }

  public async getLocalQueryUsage(userId?: string): Promise<{ count: number; limit: number; remaining: number; resetDate: string }> {
    const today = new Date().toISOString().split('T')[0];
    const limit = DAILY_LOCAL_LIMIT;

    if (!userId) {
      return { count: 0, limit, remaining: limit, resetDate: today };
    }

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!u) {
        return { count: 0, limit, remaining: limit, resetDate: today };
      }

      if (u.dailyLocalDate !== today) {
        await prisma.user.update({
          where: { id: userId },
          data: { dailyLocalDate: today, dailyLocalCount: 0 },
        });
        return { count: 0, limit, remaining: limit, resetDate: today };
      }

      return {
        count: u.dailyLocalCount,
        limit,
        remaining: Math.max(0, limit - u.dailyLocalCount),
        resetDate: today,
      };
    } catch (err) {
      console.error(`[UsersStore] Error checking local usage for ${userId}:`, err);
      return { count: 0, limit, remaining: limit, resetDate: today };
    }
  }

  public async incrementLocalQueryUsage(userId?: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const limit = DAILY_LOCAL_LIMIT;

    if (!userId) return true;

    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!u) return true;

      let currentCount = u.dailyLocalCount;
      if (u.dailyLocalDate !== today) {
        currentCount = 0;
      }

      if (currentCount >= limit) {
        return false;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          dailyLocalDate: today,
          dailyLocalCount: currentCount + 1,
        },
      });

      return true;
    } catch (err) {
      console.error(`[UsersStore] Error incrementing local usage for ${userId}:`, err);
      return true;
    }
  }

  /**
   * Increment general query counter for a user (non-web RAG queries).
   */
  public async incrementQueryCount(userId?: string): Promise<void> {
    if (!userId) return;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { queryCount: { increment: 1 } },
      });
    } catch (err) {
      // Non-critical — ignore errors silently
      console.warn(`[UsersStore] Could not increment queryCount for ${userId}:`, err);
    }
  }

  // ----------------------------------------------------
  // Notificaciones Persistentes en PostgreSQL
  // ----------------------------------------------------
  public async getNotifications(userId?: string): Promise<any[]> {
    try {
      const whereClause: any = userId
        ? { OR: [{ userId: null }, { userId }] }
        : { userId: null };

      let notifs = await prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Si la tabla está vacía, sembrar las notificaciones iniciales del sistema
      if (notifs.length === 0) {
        const initialSeeds = [
          {
            title: 'Base de Conocimiento Actualizada',
            message: 'Se han indexado exitosamente 5 libros fundamentales de Derecho Tributario con 610 chunks y 323 nodos de grafo.',
            type: 'document_indexed',
            read: false,
          },
          {
            title: 'Conexión Neo4j GraphRAG Lista',
            message: 'Servidor Neo4j configurado en 161.97.181.77 con sincronización de ontología tributaria.',
            type: 'success',
            read: false,
          },
          {
            title: 'Alerta de Actualización Fiscal 2026',
            message: 'Nuevos criterios vinculantes del Tribunal Fiscal respecto a la causalidad en servicios de consultoría internacional.',
            type: 'legal_alert',
            read: true,
          }
        ];

        for (const item of initialSeeds) {
          await prisma.notification.create({ data: item });
        }

        notifs = await prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
      }

      return notifs.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        timestamp: n.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error('[UsersStore] Error fetching notifications from PostgreSQL:', err);
      return [];
    }
  }

  public async createNotification(params: {
    userId?: string;
    title: string;
    message: string;
    type?: string;
  }): Promise<any> {
    try {
      const created = await prisma.notification.create({
        data: {
          userId: params.userId || null,
          title: params.title,
          message: params.message,
          type: params.type || 'info',
          read: false,
        }
      });
      return {
        id: created.id,
        title: created.title,
        message: created.message,
        type: created.type,
        read: created.read,
        timestamp: created.createdAt.toISOString(),
      };
    } catch (err) {
      console.error('[UsersStore] Error creating notification in PostgreSQL:', err);
      throw err;
    }
  }

  public async markNotificationRead(id: string): Promise<boolean> {
    try {
      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      return true;
    } catch (err) {
      console.error(`[UsersStore] Error marking notification ${id} as read:`, err);
      return false;
    }
  }

  public async markAllNotificationsRead(userId?: string): Promise<boolean> {
    try {
      const whereClause: any = userId
        ? { OR: [{ userId: null }, { userId }] }
        : { userId: null };

      await prisma.notification.updateMany({
        where: whereClause,
        data: { read: true },
      });
      return true;
    } catch (err) {
      console.error('[UsersStore] Error marking all notifications as read:', err);
      return false;
    }
  }

  public async clearNotifications(userId?: string): Promise<boolean> {
    try {
      const whereClause: any = userId
        ? { OR: [{ userId: null }, { userId }] }
        : { userId: null };

      await prisma.notification.deleteMany({
        where: whereClause,
      });
      return true;
    } catch (err) {
      console.error('[UsersStore] Error clearing notifications:', err);
      return false;
    }
  }
}

export const usersStore = new UsersStore();
