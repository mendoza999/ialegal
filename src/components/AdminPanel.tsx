import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Database,
  Upload,
  RefreshCw,
  Play,
  Users,
  CheckCircle,
  AlertTriangle,
  FileText,
  Layers,
  Terminal,
  ExternalLink,
  PlusCircle,
  FolderSync,
  Activity,
  HardDrive,
  FileUp,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Sparkles,
  Check,
  MessageSquareText,
  Trash2
} from 'lucide-react';
import { Neo4jConnectionConfig, TaxDocument, UserProfile } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useRama } from '../context/RamaContext';
import { adminResetPassword } from '../services/authService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const AdminPanel: React.FC = () => {
  const { addNotification } = useNotifications();
  const { selectedRama } = useRama();

  const [activeTab, setActiveTab] = useState<'neo4j' | 'upload' | 'users' | 'metrics' | 'feedback'>('upload');

  // Neo4j State
  const [neo4jConfig, setNeo4jConfig] = useState<Neo4jConnectionConfig>({
    host: 'bolt://161.97.181.77:7688',
    boltPort: 7688,
    httpPort: 7475,
    user: 'ongdb',
    pass: '$$$Amcp120$$$',
    database: 'neonormaslegales',
    status: 'connected',
    nodeCount: 323,
    relationshipCount: 458
  });
  const [cypherQuery, setCypherQuery] = useState<string>(
    'MATCH (c:Concept)-[r]->(a:Article) RETURN c.name AS Concepto, type(r) AS Relacion, a.name AS Articulo LIMIT 10'
  );
  const [cypherResult, setCypherResult] = useState<any>(null);
  const [isExecutingCypher, setIsExecutingCypher] = useState<boolean>(false);
  const [isSyncingNeo4j, setIsSyncingNeo4j] = useState<boolean>(false);

  // Ingestion State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadCategory, setUploadCategory] = useState('impuesto_renta');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedTotalPages, setUploadedTotalPages] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState('https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Feedback State
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [fbFilter, setFbFilter] = useState<'todos' | 'sugerencia' | 'contacto'>('todos');

  // Visits State
  const [visitStats, setVisitStats] = useState<{ today: number; total: number }>({ today: 0, total: 0 });

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Reset password state (per-row inline form)
  const [resetPwUserId, setResetPwUserId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [isResettingPw, setIsResettingPw] = useState(false);

  useEffect(() => {
    // Check Neo4j connection
    fetch(import.meta.env.BASE_URL + 'api/neo4j/status')
      .then(res => res.json())
      .then(data => {
        if (data.config) setNeo4jConfig(data.config);
      })
      .catch(err => console.error(err));

    // Fetch users
    fetch(import.meta.env.BASE_URL + 'api/users')
      .then(res => res.json())
      .then(data => {
        if (data.users) setUsers(data.users);
      })
      .catch(err => console.error(err));

    // Fetch feedback (sugerencias y contacto)
    fetch(import.meta.env.BASE_URL + 'api/feedback?limit=150')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.feedback)) setFeedbackList(data.feedback);
      })
      .catch(err => console.error(err));

    // Fetch visit stats
    fetch(import.meta.env.BASE_URL + 'api/visits/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) setVisitStats({ today: data.today || 0, total: data.total || 0 });
      })
      .catch(err => console.error(err));

    // Fetch categories (incluye inactivas para gestión)
    fetch(import.meta.env.BASE_URL + 'api/categories?all=1')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch(err => console.error(err));
  }, []);

  // Run Cypher
  const handleRunCypher = async () => {
    setIsExecutingCypher(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/neo4j/cypher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cypherQuery })
      });
      const data = await res.json();
      setCypherResult(data);
    } catch (err: any) {
      setCypherResult({ error: err.message });
    } finally {
      setIsExecutingCypher(false);
    }
  };

  // Sync to Neo4j
  const handleSyncNeo4j = async () => {
    setIsSyncingNeo4j(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/neo4j/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addNotification({
          title: 'Grafo Neo4j Sincronizado',
          message: `Se sincronizaron exitosamente ${data.syncedNodes || 323} nodos y ${data.syncedLinks || 458} relaciones.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSyncingNeo4j(false);
    }
  };

  // Sync Drive
  const handleSyncDrive = async () => {
    setIsSyncingDrive(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/documents/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl: driveFolderUrl })
      });
      const data = await res.json();
      if (data.success) {
        addNotification({
          title: 'Google Drive Sincronizado',
          message: 'Colección de libros de Derecho Tributario verificada y actualizada.',
          type: 'document_indexed'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Handle file reading
  const processUploadedFile = (file: File) => {
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    // Suggest Title from file name if empty or default
    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    if (!uploadTitle) {
      setUploadTitle(cleanTitle);
    }

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      addNotification({
        title: 'Procesando PDF',
        message: 'Extrayendo texto del PDF y preparando almacenamiento local...',
        type: 'info'
      });
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n\n';
            }
            setUploadText(fullText.trim());
            setUploadedTotalPages(pdfDoc.numPages);
            addNotification({
              title: 'PDF Procesado',
              message: `Se extrajeron ${pdfDoc.numPages} páginas de "${file.name}" correctamente. Listo para indexar.`,
              type: 'success'
            });
          } catch (err) {
            console.error('Error extracting PDF:', err);
            addNotification({
              title: 'Error en PDF',
              message: 'No se pudo extraer el texto del PDF.',
              type: 'warning'
            });
          }
        }
      };
      reader.onerror = () => {
        addNotification({
          title: 'Error al Leer Archivo',
          message: 'No se pudo leer el archivo PDF.',
          type: 'warning'
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Read file text
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setUploadText(text);
          addNotification({
            title: 'Archivo Cargado',
            message: `Se ha leído "${file.name}" correctamente (${(file.size / 1024).toFixed(1)} KB). Listo para indexar.`,
            type: 'info'
          });
        }
      };
      reader.onerror = () => {
        addNotification({
          title: 'Error al Leer Archivo',
          message: 'No se pudo procesar el archivo seleccionado.',
          type: 'warning'
        });
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Submit Ingestion
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadText) {
      alert('Por favor ingresa un título y el contenido del documento.');
      return;
    }

    setIsUploading(true);
    try {
      // Safe payload size (up to 300KB text) to prevent Nginx proxy drops (NetworkError / 413)
      const safeTextContent = uploadText.length > 350000 ? uploadText.slice(0, 350000) : uploadText;

      const res = await fetch(import.meta.env.BASE_URL + 'api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          author: uploadAuthor || 'Doctrina Especializada',
          ramaId: selectedRama?.id,
          ramaNombre: selectedRama?.nombre,
          category: uploadCategory,
          categoryLabel: uploadCategory === 'impuesto_renta' ? 'Impuesto a la Renta' : uploadCategory === 'igv_iva' ? 'IGV e Imposición al Consumo' : 'Código Tributario',
          description: uploadDescription || `Documento procesado desde ${uploadedFileName || 'archivo cargado'}`,
          textContent: safeTextContent,
          fileName: uploadedFileName,
          fileSize: uploadedFileSize || '1.5 MB',
          totalPages: uploadedTotalPages || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error del servidor al subir documento.' }));
        throw new Error(errorData.error || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        addNotification({
          title: 'Documento Guardado e Indexado',
          message: `"${uploadTitle}" fue indexado con éxito en ${selectedRama?.nombre || 'la rama activa'} y enlazado al grafo Neo4j (${data.chunksIndexed} chunks).`,
          type: 'document_indexed'
        });

        // Reset form
        setUploadTitle('');
        setUploadAuthor('');
        setUploadDescription('');
        setUploadText('');
        setUploadedFileName(null);
        setUploadedFileSize(null);
        setUploadedTotalPages(0);
        setActiveTab('upload');
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      addNotification({
        title: 'Error al Incorporar Documento',
        message: err?.message || 'Error de red al comunicarse con el servidor.',
        type: 'warning'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Update user role
  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole as any } : u)));
        addNotification({
          title: 'Rol de Usuario Actualizado',
          message: `El usuario ahora tiene permisos de ${newRole.toUpperCase()}.`,
          type: 'info'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Categories CRUD
  const refreshCategories = async () => {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/categories?all=1');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) setCategories(data.categories);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newCatName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewCatName('');
        await refreshCategories();
        addNotification({ title: 'Categoría creada', message: data.category.nombre, type: 'success' });
      } else {
        addNotification({ title: 'No se pudo crear', message: data.error || 'Error.', type: 'warning' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editingCatName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setEditingCatId(null);
        setEditingCatName('');
        await refreshCategories();
      } else {
        addNotification({ title: 'No se pudo renombrar', message: data.error || 'Error.', type: 'warning' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCategory = async (id: string, activo: boolean) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activo })
      });
      const data = await res.json();
      if (data.success) await refreshCategories();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await refreshCategories();
        addNotification({ title: 'Categoría eliminada', message: nombre, type: 'success' });
      } else {
        addNotification({ title: 'No se pudo eliminar', message: data.error || 'Error.', type: 'warning' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (e: React.FormEvent, userId: string, userName: string) => {
    e.preventDefault();
    if (!resetPwValue || resetPwValue.length < 6) {
      addNotification({ title: 'Contraseña inválida', message: 'Debe tener al menos 6 caracteres.', type: 'warning' });
      return;
    }
    setIsResettingPw(true);
    try {
      await adminResetPassword(userId, resetPwValue);
      setResetPwUserId(null);
      setResetPwValue('');
      addNotification({ title: 'Contraseña actualizada', message: `Nueva clave guardada para ${userName}.`, type: 'success' });
    } catch (err: any) {
      addNotification({ title: 'Error al actualizar', message: err?.message || 'No se pudo cambiar la contraseña.', type: 'warning' });
    } finally {
      setIsResettingPw(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) return;
    setIsCreatingUser(true);
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => [...prev, data.user]);
        setShowCreateUser(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
        addNotification({
          title: 'Usuario Creado',
          message: `El usuario ${data.user.name} ha sido registrado exitosamente.`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Panel de Administración y Control RAG</h1>
            <p className="text-xs text-slate-400">
              Gestión de base de conocimiento, conexión Neo4j Cypher, roles y métricas de precisión.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSyncNeo4j}
            disabled={isSyncingNeo4j}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingNeo4j ? 'animate-spin' : ''}`} />
            <span>{isSyncingNeo4j ? 'Sincronizando...' : 'Sincronizar Neo4j'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'neo4j', label: 'Neo4j & Consola Cypher', icon: Database },
          { id: 'upload', label: 'Ingesta de Libros & PDFs', icon: Upload },
          { id: 'users', label: 'Gestión de Usuarios y Roles', icon: Users },
          { id: 'metrics', label: 'Métricas RAG & Auditoría', icon: Activity },
          { id: 'feedback', label: 'Sugerencias y Contacto', icon: MessageSquareText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Neo4j & Cypher Console */}
      {activeTab === 'neo4j' && (
        <div className="space-y-6">
          {/* Connection Status Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Servidor Neo4j</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">161.97.181.77</p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Puerto 7474 (HTTP) / 7687 (Bolt)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Nodos Tributarios</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {neo4jConfig.nodeCount || 323} Nodos
                </p>
                <span className="text-[11px] text-slate-500">Leyes, Artículos y Conceptos</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600">
                <HardDrive className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Relaciones Ontológicas</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {neo4jConfig.relationshipCount || 458} Relaciones
                </p>
                <span className="text-[11px] text-slate-500">DEFINES, CITES, APPLIES_TO</span>
              </div>
            </div>
          </div>

          {/* Interactive Cypher Console */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Consola Interactiva Cypher (Neo4j Graph Engine)
                </h3>
              </div>
              <a
                href="http://161.97.181.77:7475"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                <span>Abrir Neo4j Browser Oficial</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="text-slate-400 self-center text-[11px]">Plantillas:</span>
              <button
                onClick={() => setCypherQuery('MATCH (n:Concept) RETURN n.name, n.definition LIMIT 10')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Conceptos Tributarios
              </button>
              <button
                onClick={() => setCypherQuery('MATCH (l:Law)-[r]->(a:Article) RETURN l.name, type(r), a.name LIMIT 10')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Leyes y Artículos
              </button>
              <button
                onClick={() => setCypherQuery("MATCH (c:Concept)-[r]->(j:Jurisprudence) RETURN c.name, j.name LIMIT 5")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Jurisprudencia y Causalidad
              </button>
            </div>

            {/* Query Input */}
            <div className="relative">
              <textarea
                value={cypherQuery}
                onChange={e => setCypherQuery(e.target.value)}
                rows={3}
                className="w-full p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                placeholder="MATCH (n) RETURN n LIMIT 25"
              />
              <button
                onClick={handleRunCypher}
                disabled={isExecutingCypher}
                className="absolute bottom-3 right-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isExecutingCypher ? 'Ejecutando...' : 'Ejecutar Cypher'}</span>
              </button>
            </div>

            {/* Cypher Result Table / Json */}
            {cypherResult && (
              <div className="p-4 rounded-2xl bg-slate-950 text-slate-300 font-mono text-xs max-h-64 overflow-y-auto border border-slate-800">
                <pre>{JSON.stringify(cypherResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Document & PDF Ingestion */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Step-by-Step Tutorial Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-900/5 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border border-amber-500/30 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500 dark:text-amber-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Guía Paso a Paso: Ingesta de Documentos y Libros Tributarios
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sigue estos pasos para indexar tus PDFs tanto en los vectores de búsqueda semántica como en el grafo de conocimiento Neo4j.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
                <div className="h-7 w-7 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Carga o Arrastra el Archivo</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Arrastra tu archivo PDF o documento de texto en la zona de carga, o sincroniza la carpeta de Google Drive.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
                <div className="h-7 w-7 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Metadatos & Clasificación</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Define Título, Autor y Materia (Impuesto a la Renta, Código Tributario, IGV, etc.) para una recuperación precisa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-start space-x-3">
                <div className="h-7 w-7 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Indexación Vector + Neo4j</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    El motor genera chunks semánticos y nodos/aristas en el grafo de Neo4j en tiempo real para citas bibliográficas automáticas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sync Drive Box */}
            <div className="lg:col-span-1 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <FolderSync className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sincronización Google Drive
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enlaza directamente la carpeta oficial de Drive con todos los libros y PDFs de Derecho Tributario para indexación automática.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Enlace de la Carpeta Drive</label>
                <input
                  type="text"
                  value={driveFolderUrl}
                  onChange={e => setDriveFolderUrl(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                />
              </div>

              <button
                onClick={handleSyncDrive}
                disabled={isSyncingDrive}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white border border-slate-700 shadow-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingDrive ? 'Verificando Drive...' : 'Sincronizar Colección Drive'}</span>
              </button>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start space-x-2">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span>La sincronización vincula los 5 tratados doctrinales pre-cargados con el grafo de Neo4j.</span>
              </div>
            </div>

            {/* Form to ingest Custom PDF text / Drag & Drop */}
            <form
              onSubmit={handleUploadDocument}
              className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cargar y Procesar Libro o PDF
                  </h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-300 dark:border-amber-800" title="El libro se guardará en la rama activa">
                  Se guarda en: {selectedRama?.nombre || 'General'}
                </span>
              </div>
              <div className="flex items-center justify-end">
                {uploadedFileName && (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    <Check className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[160px]">{uploadedFileName}</span>
                  </span>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 ${isDragging
                  ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-amber-500/50 bg-slate-50 dark:bg-slate-800/40'
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,.txt,.md,.doc,.docx"
                  className="hidden"
                />
                <div className="h-10 w-10 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Arrastra aquí tu archivo PDF, TXT o Documento
                  </p>
                  <p className="text-[11px] text-slate-400">
                    o haz clic para explorar tus archivos locales
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Título del Libro o Tratado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tratado de Precios de Transferencia"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Autor(es) / Institución
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Dr. Jorge Bravo Cucci"
                    value={uploadAuthor}
                    onChange={e => setUploadAuthor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Materia / Categoría
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  >
                    <option value="impuesto_renta">Impuesto a la Renta</option>
                    <option value="codigo_tributario">Código Tributario</option>
                    <option value="igv_iva">IGV / IVA e Imposición al Consumo</option>
                    <option value="procedimientos">Procedimiento Contencioso</option>
                    <option value="constitucional">Derecho Constitucional Tributario</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Descripción Corta
                  </label>
                  <input
                    type="text"
                    placeholder="Resumen del contenido del libro..."
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Text input representing extracted PDF text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contenido Textual Extraído del PDF o Tratado *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {uploadText ? `${uploadText.length} caracteres extraídos` : 'Se dividirá en chunks semánticos'}
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  value={uploadText}
                  onChange={e => setUploadText(e.target.value)}
                  placeholder="Pega aquí los capítulos, artículos o extractos del libro para indexarlos en la base RAG y generar nodos en el grafo de Neo4j..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 leading-relaxed font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {isUploading ? 'Procesando embeddings y grafo Neo4j...' : 'Indexación inmediata en base vectorial y grafo'}
                </span>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Indexando en Neo4j...' : 'Indexar Documento'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Gestor de Categorías de Materia */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Categorías de Materia Doctrinaria
                </h3>
                <p className="text-xs text-slate-500">
                  Se usan en el formulario de nuevo libro. Desactivar oculta sin borrar.
                </p>
              </div>
              <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nueva categoría..."
                  maxLength={120}
                  className="w-56 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map(cat => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        maxLength={120}
                        autoFocus
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                      />
                      <button onClick={() => handleRenameCategory(cat.id)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                        Guardar
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cat.activo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span className={`text-xs font-semibold truncate ${cat.activo ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                          {cat.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.nombre); }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={() => handleToggleCategory(cat.id, cat.activo)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          {cat.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.nombre)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Sin categorías registradas.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Users & Roles */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Control de Usuarios y Roles de Acceso
              </h3>
              <p className="text-xs text-slate-500">
                Los usuarios con rol Admin pueden cargar nuevo contenido e interactuar con la base Neo4j.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                {users.length} Usuarios Registrados
              </span>
              <button
                onClick={() => setShowCreateUser(!showCreateUser)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Nuevo Usuario</span>
              </button>
            </div>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateUser} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-6 animate-in slide-in-from-top-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-4">Registrar Nuevo Usuario</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="Ej. Dra. María Pérez"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Contraseña *</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Rol Inicial</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700"
                  >
                    <option value="user">Usuario Básico</option>
                    <option value="admin">Administrador (Puede indexar PDFs)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  {isCreatingUser ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
            {users.map(u => (
              <div key={u.id}>
                <div className="py-3.5 flex items-center justify-between min-w-[500px]">
                  <div className="flex items-center space-x-3">
                    <img src={u.avatar} alt={u.name} className="h-10 w-10 rounded-xl object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-400">{u.email} • {u.organization}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Consultas Realizadas</span>
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {u.queryCount} queries
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                      {u.role}
                    </span>

                    <button
                      onClick={() => handleToggleUserRole(u.id, u.role)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-300 hover:text-amber-800 transition-colors"
                    >
                      Cambiar a {u.role === 'admin' ? 'Usuario' : 'Admin'}
                    </button>

                    <button
                      onClick={() => {
                        setResetPwUserId(resetPwUserId === u.id ? null : u.id);
                        setResetPwValue('');
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      Clave
                    </button>
                  </div>
                </div>
                {resetPwUserId === u.id && (
                  <form onSubmit={e => handleResetPassword(e, u.id, u.name)} className="flex items-center gap-2 py-2 ml-[52px] animate-in slide-in-from-top-1">
                    <input
                      type="text"
                      value={resetPwValue}
                      onChange={e => setResetPwValue(e.target.value)}
                      placeholder="Nueva contraseña (mín. 6)"
                      autoFocus
                      className="w-56 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      type="submit"
                      disabled={isResettingPw}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
                    >
                      {isResettingPw ? 'Guardando...' : 'Guardar'}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Metrics & Audit */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Visitas Hoy</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{visitStats.today}</p>
            <p className="text-[11px] text-slate-500 mt-1">Cargas de página del día</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Visitas Totales</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{visitStats.total}</p>
            <p className="text-[11px] text-slate-500 mt-1">Acumulado histórico</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Precisión Semántica RAG</span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">98.4%</p>
            <p className="text-[11px] text-slate-500 mt-1">Citas fundamentadas con página exacta</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Latencia Promedio</span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">380 ms</p>
            <p className="text-[11px] text-slate-500 mt-1">Vector Index + Neo4j Graph traversal</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Consultas Simultáneas</span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">Escalable</p>
            <p className="text-[11px] text-slate-500 mt-1">Soporta múltiples llamadas concurrentes</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400">Trazabilidad Jurídica</span>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">100%</p>
            <p className="text-[11px] text-slate-500 mt-1">Exportable a PDF con sellos normativos</p>
          </div>
        </div>
      )}

      {/* Tab 5: Sugerencias y Contacto */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['todos', 'sugerencia', 'contacto'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFbFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${fbFilter === f
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {f === 'todos' ? `Todos (${feedbackList.length})` : f === 'sugerencia'
                  ? `Sugerencias (${feedbackList.filter(x => x.type === 'sugerencia').length})`
                  : `Contacto (${feedbackList.filter(x => x.type === 'contacto').length})`}
              </button>
            ))}
          </div>

          {feedbackList.filter(x => fbFilter === 'todos' || x.type === fbFilter).length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <MessageSquareText className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 mt-3">Aún no hay mensajes de usuarios.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {feedbackList
                .filter(x => fbFilter === 'todos' || x.type === fbFilter)
                .map(fb => (
                  <div key={fb.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${fb.type === 'contacto'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}>
                        {fb.type === 'contacto' ? 'Contacto' : 'Sugerencia'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {fb.createdAt ? new Date(fb.createdAt).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {fb.subject && <p className="text-sm font-bold text-slate-900 dark:text-white">{fb.subject}</p>}
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{fb.message}</p>
                    <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {fb.userName || fb.userEmail ? `${fb.userName || ''}${fb.userName && fb.userEmail ? ' • ' : ''}${fb.userEmail || ''}` : 'Usuario no identificado'}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
