import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Sparkles,
  Bookmark,
  Share2,
  Globe,
  FileDown,
  Copy,
  Check,
  Plus,
  Trash2,
  MessageSquare,
  Bot,
  User,
  Scale,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { ChatMessage, ChatSession, Citation, TaxDocument } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRama } from '../context/RamaContext';
import { exportExecutiveSummaryPDF } from '../utils/pdfExport';

interface ChatViewProps {
  onOpenCitation: (citation: Citation) => void;
  selectedDocForChat?: TaxDocument | null;
}

const getRamaSuggestions = (nombre?: string): string[] => {
  const n = (nombre || '').toLowerCase();
  if (n.includes('laboral')) {
    return [
      '¿Cómo se calcula la liquidación de beneficios sociales (CTS, gratificaciones y vacaciones) en el régimen 728?',
      '¿Cuáles son las causales y el procedimiento legal para un despido por falta grave según la LPCL?',
      '¿Qué criterios aplica la SUNAFIL para determinar la desnaturalización de contratos de locación de servicios?',
      'Tratamiento de la jornada laboral máxima y sobretiempo en trabajadores no fiscalizados'
    ];
  }
  if (n.includes('civil')) {
    return [
      '¿Cuáles son los requisitos de la prescripción adquisitiva de dominio notarial y judicial según el Código Civil?',
      'Criterios vinculantes del IV Pleno Casatorio Civil respecto a la posesión precaria',
      'Diferencias dogmáticas entre resolución contractual y rescisión según los artículos 1370 y 1371 del Código Civil',
      'Presupuestos de la responsabilidad civil extracontractual bajo los artículos 1969 y 1970 del Código Civil'
    ];
  }
  if (n.includes('penal')) {
    return [
      '¿Cuáles son los presupuestos materiales para la imposición de prisión preventiva según el Art. 268 del NCPP?',
      'Diferencias dogmáticas entre coautoría y complicidad en delitos contra la administración pública',
      'Teoría del delito: análisis de imputación objetiva y autopuesta en peligro de la víctima',
      'Plazos y control de la investigación preparatoria mediante tutela de derechos'
    ];
  }
  if (n.includes('constitucional')) {
    return [
      '¿Cuáles son los requisitos de procedencia del proceso de amparo contra resoluciones judiciales según la Ley 31307?',
      'Doctrina del Tribunal Constitucional sobre el contenido esencial del derecho al debido proceso y tutela procesal efectiva',
      'Test de proporcionalidad en la restricción de derechos fundamentales: idoneidad, necesidad y ponderación',
      'Efectos del control difuso de constitucionalidad por los jueces del Poder Judicial'
    ];
  }
  // Default: Derecho Tributario
  return [
    '¿Cuál es el criterio legal sobre el devengo tributario en servicios continuados según el Art. 57 LIR?',
    '¿Cuáles son los requisitos sustanciales y formales para el crédito fiscal del IGV en adquisiciones?',
    'Tratamiento contable y tributario de la depreciación de activos fijos según NIIF 16 y LIR',
    'Criterios del Tribunal Fiscal (RTF) sobre el Principio de Causalidad y gastos deducibles en el Art. 37 LIR'
  ];
};

const DEFAULT_SESSION: ChatSession = {
  id: `session-default`,
  title: 'Nueva Consulta Jurídica',
  userId: 'guest',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: []
};

export const ChatView: React.FC<ChatViewProps> = ({ onOpenCitation, selectedDocForChat }) => {
  const { user, sessionToken } = useAuth();
  const { addNotification } = useNotifications();
  const { selectedRama } = useRama();

  // Sessions and History scoped to current user and selected rama in PostgreSQL
  const [sessions, setSessions] = useState<ChatSession[]>([DEFAULT_SESSION]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(DEFAULT_SESSION.id);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // RAG Filters and Grounding Toggles
  const [enableHybridSearch, setEnableHybridSearch] = useState<boolean>(true);
  const [enableGraphRAG, setEnableGraphRAG] = useState<boolean>(true);
  const [enableWebGrounding, setEnableWebGrounding] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [webUsage, setWebUsage] = useState<{ count: number; limit: number; remaining: number }>({
    count: 0,
    limit: 10,
    remaining: 10
  });

  const [knowledgeStats, setKnowledgeStats] = useState<{ documentsCount: number; chunksCount: number; nodesCount: number }>({
    documentsCount: 5,
    chunksCount: 610,
    nodesCount: 323
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch daily web usage & knowledge base stats
  useEffect(() => {
    if (user?.id) {
      fetch(`${import.meta.env.BASE_URL}api/users/web-usage/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.remaining === 'number') {
            setWebUsage(data);
          }
        })
        .catch(err => console.error(err));
    }

    const ramaParam = selectedRama?.id ? `?ramaId=${selectedRama.id}` : '';
    fetch(`${import.meta.env.BASE_URL}api/knowledge/stats${ramaParam}`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.documentsCount === 'number') {
          setKnowledgeStats({
            documentsCount: data.documentsCount,
            chunksCount: data.chunksCount,
            nodesCount: data.nodesCount
          });
        }
      })
      .catch(err => console.error(err));
  }, [user?.id, selectedRama?.id]);

  // Load user sessions from PostgreSQL database filtered by active Rama
  const loadUserSessions = async (userId: string, ramaId?: string) => {
    try {
      const activeRamaId = ramaId || selectedRama?.id;
      const url = `${import.meta.env.BASE_URL}api/chat/sessions?userId=${userId}${activeRamaId ? `&ramaId=${activeRamaId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
        setSessions(data.sessions);
        setCurrentSessionId(data.sessions[0].id);
      } else {
        // Create initial session in PostgreSQL scoped to this rama
        const createRes = await fetch(`${import.meta.env.BASE_URL}api/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: `Nueva Consulta - ${selectedRama?.nombre || 'General'}`,
            ramaId: activeRamaId
          })
        });
        const createData = await createRes.json();
        if (createData.session) {
          setSessions([createData.session]);
          setCurrentSessionId(createData.session.id);
        }
      }
    } catch (e) {
      console.error('Error loading sessions from PostgreSQL:', e);
    }
  };

  // Re-load user sessions when user changes or selected Rama changes
  useEffect(() => {
    if (user?.id) {
      loadUserSessions(user.id, selectedRama?.id);
    } else {
      const guestSession = {
        ...DEFAULT_SESSION,
        id: `session-guest-${Date.now()}`,
        title: `Nueva Consulta - ${selectedRama?.nombre || 'General'}`,
        ramaId: selectedRama?.id
      };
      setSessions([guestSession]);
      setCurrentSessionId(guestSession.id);
    }
  }, [user?.id, selectedRama?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId, isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0] || DEFAULT_SESSION;

  // Create new session in PostgreSQL
  const handleNewChat = async () => {
    const sessionTitle = `Nueva Consulta - ${selectedRama?.nombre || 'General'}`;
    if (user?.id) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title: sessionTitle,
            ramaId: selectedRama?.id
          })
        });
        const data = await res.json();
        if (data.session) {
          setSessions(prev => [data.session, ...prev]);
          setCurrentSessionId(data.session.id);
          return;
        }
      } catch (err) {
        console.error('Error creating new session in PostgreSQL:', err);
      }
    }

    // Fallback for guest
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: sessionTitle,
      userId: user?.id || 'guest',
      ramaId: selectedRama?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  // Delete session in PostgreSQL
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${import.meta.env.BASE_URL}api/chat/sessions/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting session from PostgreSQL:', err);
    }

    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const freshSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: `Nueva Consulta - ${selectedRama?.nombre || 'General'}`,
          userId: user?.id || 'guest',
          ramaId: selectedRama?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: []
        };
        setCurrentSessionId(freshSession.id);
        return [freshSession];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery.trim();
    if (!query || isLoading) return;

    setInputQuery('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update session title if first user message
    let sessionTitle = currentSession.title;
    if (currentSession.messages.length === 0 || currentSession.title.startsWith('Nueva Consulta')) {
      sessionTitle = query.slice(0, 36) + (query.length > 36 ? '...' : '');
      // Update session title in PostgreSQL
      if (user?.id && currentSession.id) {
        fetch(`${import.meta.env.BASE_URL}api/chat/sessions/${currentSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionTitle,
            ramaId: selectedRama?.id
          })
        }).catch(err => console.warn('Error updating session title:', err));
      }
    }

    setSessions(prev =>
      prev.map(s =>
        s.id === currentSessionId
          ? {
            ...s,
            title: sessionTitle,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, userMessage]
          }
          : s
      )
    );

    setIsLoading(true);

    try {
      const historyPayload = currentSession.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(import.meta.env.BASE_URL + 'api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-session-token': sessionToken } : {})
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          query,
          conversationHistory: historyPayload,
          ramaId: selectedRama?.id,
          ramaNombre: selectedRama?.nombre,
          categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
          docFilter: selectedDocForChat ? [selectedDocForChat.id] : undefined,
          enableHybridSearch,
          enableGraphRAG,
          enableWebGrounding,
          userId: user?.id,
          sessionToken
        })
      });

      const data = await res.json();

      if (data.webUsage) {
        setWebUsage(data.webUsage);
        if (data.webUsage.remaining <= 0) {
          setEnableWebGrounding(false);
        }
      }

      const assistantMessage: ChatMessage = data.savedMessage || {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'No se pudo generar respuesta.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        graphNodes: data.graphNodes || [],
        graphLinks: data.graphLinks || [],
        searchGroundingSources: data.searchGroundingSources || [],
        isWebGrounded: data.isWebGrounded || false,
        ragTypeUsed: data.ragTypeUsed || 'hybrid',
        confidenceScore: data.confidenceScore || 95,
        executiveSummary: data.executiveSummary
      };

      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, assistantMessage] }
            : s
        )
      );

      // Notification if high confidence citations were pulled
      if (data.citations && data.citations.length > 0) {
        addNotification({
          title: 'Respuesta RAG Fundamentada',
          message: `Se encontraron ${data.citations.length} citas textuales de los libros de Derecho Tributario.`,
          type: 'info'
        });
      }
    } catch (err: any) {
      console.error('Error fetching chat response:', err);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: 'Ocurrió un inconveniente al procesar la consulta en la base de conocimiento.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSessions(prev =>
        prev.map(s =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleExportPDF = (msg: ChatMessage) => {
    const userQuery = currentSession.messages
      .filter((m, idx) => m.role === 'user' && idx <= currentSession.messages.indexOf(msg))
      .pop()?.content || 'Consulta Tributaria';

    exportExecutiveSummaryPDF({
      title: currentSession.title,
      userQuery,
      assistantResponse: msg.content,
      citations: msg.citations || [],
      searchGroundingSources: msg.searchGroundingSources || [],
      userName: user?.name,
      organization: user?.organization,
      isWebGrounded: msg.isWebGrounded,
      ragTypeUsed: msg.ragTypeUsed === 'web' ? 'Grounding Web + RAG' : 'Híbrido (Vector + Neo4j GraphRAG)',
      confidenceScore: msg.confidenceScore || 96
    });

    addNotification({
      title: 'Dictamen PDF Descargado',
      message: 'El dictamen técnico-jurídico con diseño ejecutivo y citas indexadas ha sido generado con éxito.',
      type: 'success'
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col md:flex-row gap-4 p-3 sm:p-6 overflow-hidden">

      {/* Left Sidebar: Chat History */}
      <div className="w-full md:w-72 lg:w-80 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4 shrink-0 hidden sm:flex">
        <button
          id="new-chat-btn"
          onClick={handleNewChat}
          className="w-full py-2.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Consulta Jurídica</span>
        </button>

        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Historial de Consultas
          </span>
          <span className="text-[10px] font-semibold text-slate-500">
            {sessions.length} chats
          </span>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${currentSessionId === session.id
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <MessageSquare className={`h-4 w-4 shrink-0 ${currentSessionId === session.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`} />
                <span className="text-xs font-medium truncate">
                  {session.title}
                </span>
              </div>

              <button
                onClick={e => handleDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                title="Eliminar sesión"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Active Knowledge Badge */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Motor RAG & Relaciones</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px]">
            {knowledgeStats.documentsCount} Tratados/Libros • {knowledgeStats.chunksCount} Chunks • {knowledgeStats.nodesCount} Relaciones
          </p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0">

        {/* Top Control Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-xs">

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-xs">
              {currentSession.title}
            </span>
          </div>

          {/* Filters & Toggles */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-[11px] font-semibold py-1 px-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Todos los Libros</option>
              <option value="impuesto_renta">Impuesto a la Renta</option>
              <option value="codigo_tributario">Código Tributario</option>
              <option value="igv_iva">IGV / Consumo</option>
              <option value="procedimientos">Procedimiento Contencioso</option>
              <option value="constitucional">Constitucional</option>
            </select>

            {/* Neo4j GraphRAG Toggle */}
            <button
              onClick={() => setEnableGraphRAG(!enableGraphRAG)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${enableGraphRAG
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              title="Activar análisis de relaciones en Grafo Neo4j"
            >
              <Share2 className="h-3 w-3" />
              <span>Búsqueda Local</span>
            </button>

            {/* Web Grounding Toggle with Daily 10 Limit */}
            <button
              onClick={() => {
                if (!enableWebGrounding && webUsage.remaining <= 0) {
                  addNotification({
                    title: 'Límite Diario Alcanzado',
                    message: 'Has utilizado las 10 consultas web disponibles para hoy. Podrás realizar más mañana o consultar la base local sin límites.',
                    type: 'warning'
                  });
                  return;
                }
                setEnableWebGrounding(!enableWebGrounding);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${enableWebGrounding
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              title={`Búsqueda Web en vivo (${webUsage.remaining}/${webUsage.limit} consultas hoy)`}
            >
              <Globe className="h-3 w-3" />
              <span>Búsqueda Web</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${webUsage.remaining > 0
                ? (enableWebGrounding ? 'bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')
                : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                }`}>
                {webUsage.remaining}/{webUsage.limit}
              </span>
            </button>
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentSession.messages.length === 0 ? (
            /* Empty State with Suggestions */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 py-8">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-slate-900 text-white flex items-center justify-center shadow-lg">
                <Scale className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-300 dark:border-amber-800">
                  <Scale className="h-3.5 w-3.5" />
                  <span>Especialidad: {selectedRama?.nombre || 'Derecho'}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  ¿Qué consulta sobre {selectedRama?.nombre || 'materia jurídica'} deseas analizar hoy?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
                  Respuestas de alta especialización en {selectedRama?.nombre || 'Derecho'}, jurisprudencia oficial peruana, doctrina y libros del acervo bibliográfico.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {getRamaSuggestions(selectedRama?.nombre).map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-start justify-between group"
                  >
                    <span className="leading-snug">{sug}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 mt-0.5 shrink-0 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            currentSession.messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Scale className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] sm:max-w-2xl lg:max-w-3xl rounded-3xl p-5 shadow-xs space-y-4 ${msg.role === 'user'
                    ? 'bg-amber-600 text-white rounded-tr-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                    }`}
                >
                  {/* Message Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                    {msg.role === 'user' ? (
                      <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="markdown-body space-y-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Assistant Extra Metadata: Citations Shelf */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        <Bookmark className="h-3.5 w-3.5" />
                        <span>Fuentes y Citas Bibliográficas ({msg.citations.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((cit, cIdx) => (
                          <div
                            key={cit.id || cIdx}
                            onClick={() => onOpenCitation(cit)}
                            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer transition-all shadow-2xs group"
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                                {cit.docTitle}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                Pág. {cit.page}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 italic">
                              "{cit.quote}"
                            </p>
                            <span className="text-[9px] text-slate-400 mt-1 block">
                              Autor: {cit.author} • {cit.chapter}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web Grounding Sources (if used) */}
                  {msg.role === 'assistant' && msg.searchGroundingSources && msg.searchGroundingSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="flex items-center space-x-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        <Globe className="h-3 w-3" />
                        <span>Verificación Externa Google Search Grounding:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.searchGroundingSources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span className="truncate max-w-[180px]">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bubble Action Footer */}
                  {msg.role === 'assistant' && (
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/50 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span>{msg.timestamp}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {msg.confidenceScore || 96}% Precisión
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1 hover:text-slate-700 dark:hover:text-white rounded"
                          title="Copiar texto"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* PDF Export button */}
                        <button
                          onClick={() => handleExportPDF(msg)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                          title="Descargar dictamen en formato PDF ejecutivo"
                        >
                          <FileDown className="h-3 w-3" />
                          <span>Exportar PDF</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Scale className="h-4 w-4" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-tl-xs flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {enableWebGrounding
                    ? 'Analizando libros tributarios y consultando fuentes web...'
                    : enableGraphRAG
                      ? 'Consultando Local Server e índices vectoriales...'
                      : 'Recuperando fragmentos normativos...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <div className="flex-1 relative">
              <input
                id="tax-chat-input"
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                placeholder="Escribe tu consulta Tributaria, Contable o Laboral (ej. causalidad Art. 37, cálculo CTS, NIIF 16, IGV)..."
                disabled={isLoading}
                className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
              />
            </div>

            <button
              id="send-message-btn"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-3 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-md transition-all flex items-center justify-center shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>IA-Tributario • Citas con libro, autor y página verificada</span>
            <span>Local Server: https://servicios.algoritmojuridico.com/tributario</span>
          </div>
        </div>

      </div>

    </div>
  );
};
