import React, { createContext, useContext, useState, useEffect } from 'react';
import { PushNotification } from '../types';

interface NotificationContextType {
  notifications: PushNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<PushNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  requestPushPermission: () => Promise<void>;
  pushPermission: NotificationPermission;
}

const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-01',
    title: 'Base de Conocimiento Actualizada',
    message: 'Se han indexado exitosamente 5 libros fundamentales de Derecho Tributario con 610 chunks y 323 nodos de grafo.',
    type: 'document_indexed',
    timestamp: 'Hace 10 minutos',
    read: false
  },
  {
    id: 'notif-02',
    title: 'Conexión Neo4j GraphRAG Lista',
    message: 'Servidor Neo4j configurado en 161.97.181.77 con sincronización de ontología tributaria.',
    type: 'success',
    timestamp: 'Hace 25 minutos',
    read: false
  },
  {
    id: 'notif-03',
    title: 'Alerta de Actualización Fiscal 2026',
    message: 'Nuevos criterios vinculantes del Tribunal Fiscal respecto a la causalidad en servicios de consultoría internacional.',
    type: 'legal_alert',
    timestamp: 'Hoy, 09:00',
    read: true
  }
];

const getAuthUserId = (): string | undefined => {
  try {
    const raw = localStorage.getItem('lex_current_user') || localStorage.getItem('portal_tributario_current_user');
    if (!raw) return undefined;
    const u = JSON.parse(raw);
    return u?.id;
  } catch (e) {
    return undefined;
  }
};

const formatTimestamp = (dateStr?: string): string => {
  if (!dateStr) return 'Ahora mismo';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  } catch (e) {
    return dateStr;
  }
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<PushNotification[]>(() => {
    const saved = localStorage.getItem('lex_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  // Cargar notificaciones persistentes desde PostgreSQL
  const fetchPersistedNotifications = async () => {
    try {
      const userId = getAuthUserId();
      const headers: Record<string, string> = {};
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch(`${import.meta.env.BASE_URL}api/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications) && data.notifications.length > 0) {
          const mapped: PushNotification[] = data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            read: n.read,
            timestamp: formatTimestamp(n.timestamp),
          }));
          setNotifications(mapped);
          localStorage.setItem('lex_notifications', JSON.stringify(mapped));
        }
      }
    } catch (err) {
      console.warn('[NotificationContext] Error loading notifications from PostgreSQL:', err);
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
    fetchPersistedNotifications();
  }, []);

  useEffect(() => {
    localStorage.setItem('lex_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  const addNotification = async (notif: Omit<PushNotification, 'id' | 'timestamp' | 'read'>) => {
    const tempId = `notif-${Date.now()}`;
    const newNotif: PushNotification = {
      ...notif,
      id: tempId,
      timestamp: 'Ahora mismo',
      read: false
    };

    setNotifications(prev => [newNotif, ...prev]);
    playNotificationSound();
    console.log('Notification added:', newNotif);
    // Trigger Native Browser Web Push Notification if allowed
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`LexTributario: ${newNotif.title}`, {
          body: newNotif.message,
          icon: '/favicon.ico'
        });
      } catch (err) { }
    }
    console.log('Notification to postgreSQL server:');
    // Persistir en PostgreSQL
    try {
      const userId = getAuthUserId();
      const res = await fetch(`${import.meta.env.BASE_URL}api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: notif.title,
          message: notif.message,
          type: notif.type,
        })
      });
      if (res.ok) {
        console.log('Notification saved to postgreSQL server:');
        const data = await res.json();
        if (data.notification?.id) {
          setNotifications(prev => prev.map(n => n.id === tempId ? { ...n, id: data.notification.id } : n));
        }
      }
    } catch (err) {
      console.log('Error saving notification to postgreSQL server: ', err);
      console.warn('[NotificationContext] Error saving notification to DB:', err);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`${import.meta.env.BASE_URL}api/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (err) {
      console.warn('[NotificationContext] Error marking notification as read in DB:', err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const userId = getAuthUserId();
      await fetch(`${import.meta.env.BASE_URL}api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.warn('[NotificationContext] Error marking all notifications as read in DB:', err);
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    try {
      const userId = getAuthUserId();
      await fetch(`${import.meta.env.BASE_URL}api/notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (err) {
      console.warn('[NotificationContext] Error clearing notifications in DB:', err);
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm === 'granted') {
          addNotification({
            title: 'Notificaciones Push Activadas',
            message: 'Recibirás alertas en tiempo real sobre procesamiento de PDFs y novedades normativas.',
            type: 'success'
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        requestPushPermission,
        pushPermission
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
