import React, { useState } from 'react';
import { MessageSquareText, Phone, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

type FeedbackKind = 'sugerencia' | 'contacto';

const KIND_META: Record<FeedbackKind, { title: string; placeholder: string }> = {
  sugerencia: {
    title: 'Comentarios y/o sugerencias',
    placeholder: 'Cuéntanos qué mejorar o qué te gustaría ver en IA-Legal...'
  },
  contacto: {
    title: 'Contáctanos',
    placeholder: 'Déjanos tu mensaje y te responderemos a tu correo registrado...'
  }
};

export const FeedbackWidget: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [openKind, setOpenKind] = useState<FeedbackKind | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const open = (kind: FeedbackKind) => {
    setSubject('');
    setMessage('');
    setOpenKind(kind);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending || !openKind) return;
    setSending(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: openKind,
          subject: subject.trim(),
          message: message.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al enviar.');
      addNotification({ title: 'Mensaje enviado', message: 'Gracias por tu mensaje. Lo revisaremos a la brevedad.', type: 'success' });
      setOpenKind(null);
    } catch (err: any) {
      addNotification({ title: 'No se pudo enviar', message: err.message || 'Inténtalo nuevamente.', type: 'warning' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating side buttons */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button
          onClick={() => open('sugerencia')}
          title="Comentarios y/o sugerencias"
          className="flex items-center gap-1.5 bg-[#BF092F] hover:bg-[#A10727] text-white text-[11px] font-bold uppercase tracking-wider pl-1.5 pr-2 py-3 rounded-r-xl shadow-lg transition-colors [writing-mode:vertical-rl] rotate-180"
        >
          <MessageSquareText className="h-3.5 w-3.5 rotate-90" />
          Sugerencias
        </button>
        <button
          onClick={() => open('contacto')}
          title="Contáctanos"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white text-[11px] font-bold uppercase tracking-wider pl-1.5 pr-2 py-3 rounded-r-xl shadow-lg transition-colors [writing-mode:vertical-rl] rotate-180"
        >
          <Phone className="h-3.5 w-3.5 rotate-90" />
          Contáctanos
        </button>
      </div>

      {/* Modal */}
      {openKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={() => setOpenKind(null)}>
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {KIND_META[openKind].title}
              </h3>
              <button onClick={() => setOpenKind(null)} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Asunto (opcional)"
                maxLength={200}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={KIND_META[openKind].placeholder}
                required
                rows={5}
                maxLength={2000}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{sending ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
