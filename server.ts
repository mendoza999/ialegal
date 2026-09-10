import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { knowledgeBase } from './server/knowledgeBase';
import { neo4jService } from './server/neo4jService';
import { ragEngine } from './server/ragEngine';
import { TaxDocument, DocumentChunk, GraphNode, GraphLink } from './src/types';
import { usersStore } from './server/usersStore';
import { chatStore } from './server/chatStore';
import { prisma } from './server/db';

const DOCUMENTS_DIR = path.join(process.cwd(), 'server', 'documents');
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// ─── In-memory rate limiter for login brute-force protection ─────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 8;

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

function resetLoginRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

// Clean up expired rate limit entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3005;
  const isProd = process.env.NODE_ENV === 'production';

  // Hostinger / proxy reverso (Nginx/Cloudflare): confiar en X-Forwarded-*
  app.set('trust proxy', 1);

  // Disable fingerprinting
  app.disable('x-powered-by');

  // Global body limit — 1 MB for regular endpoints
  app.use((req, _res, next) => {
    if (req.path === '/api/documents/upload') return next();
    express.json({ limit: '1mb' })(req, _res, next);
  });
  app.use('/api/documents/upload', express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // HTTPS redirect in production
  if (isProd) {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // unsafe-eval required by Vite in dev
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.unsplash.com https://images.unsplash.com",
        "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    next();
  });

  // Admin Authorization Middleware
  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = (req.headers['x-user-id'] as string) || (req.body?.adminUserId as string) || (req.query?.adminUserId as string);
    const sessionToken = (req.headers['x-session-token'] as string) || (req.body?.adminSessionToken as string) || (req.query?.adminSessionToken as string);

    if (userId) {
      const isAdm = await usersStore.isAdminUser(userId, sessionToken);
      if (!isAdm) {
        return res.status(403).json({
          error: 'Acceso Denegado',
          message: 'Se requieren permisos de Administrador válidos para ejecutar esta operación.'
        });
      }
    }
    next();
  };

  // Compat subrutas: el front con base '/tributario/' o '/ialegal/' llama a
  // '<prefijo>/api/*'; el API vive en /api/*. Nginx (proxy_pass con '/' final)
  // ya despoja el prefijo, esto cubre acceso directo sin proxy.
  app.use((req, _res, next) => {
    for (const prefix of ['/tributario', '/ialegal']) {
      if (req.url.startsWith(`${prefix}/api/`)) {
        req.url = req.url.slice(prefix.length);
        break;
      }
    }
    next();
  });

  // Serve static files from local documents directory
  app.use('/api/documents/file', express.static(DOCUMENTS_DIR));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 0. Ramas del Derecho (PostgreSQL: ramasDelDerecho)
  app.get('/api/ramas', async (req, res) => {
    try {
      const rawRamas: any = await prisma.$queryRawUnsafe(`
        SELECT "id", "nombre" 
        FROM "ramasDelDerecho" 
        ORDER BY "nombre" ASC;
      `);
      res.json({ ramas: rawRamas, total: rawRamas.length });
    } catch (e: any) {
      console.error('[Server] Error fetching ramasDelDerecho:', e);
      // Fallback default ramas if DB query fails
      const fallbackRamas = [
        { id: 'f5fa96ce-2733-44df-914a-c298aab14215', nombre: 'Derecho Tributario' },
        { id: '77f93f98-5612-4bba-b410-8e99010b213f', nombre: 'Derecho Laboral' },
        { id: 'b343d03c-a69c-453e-8272-d8aabb756943', nombre: 'Derecho Civil' },
        { id: '4baf3b11-9f40-4d84-bb7c-1bd5eb71a692', nombre: 'Derecho Penal' },
        { id: 'eeeaa7af-8464-4d2e-9f5d-d346cd2d4f94', nombre: 'Derecho Constitucional' }
      ];
      res.json({ ramas: fallbackRamas, total: fallbackRamas.length });
    }
  });

  // 1. RAG & Chat Query Endpoint with Full PostgreSQL Persistence
  app.post('/api/chat/query', async (req, res) => {
    try {
      const {
        sessionId,
        query,
        conversationHistory,
        ramaId,
        ramaNombre,
        categoryFilter,
        docFilter,
        enableHybridSearch,
        enableGraphRAG,
        enableWebGrounding,
        userId,
        sessionToken
      } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'La consulta (query) es requerida.' });
      }
      // Sanitize query length to prevent prompt injection / abuse
      if (query.length > 2000) {
        return res.status(400).json({ error: 'La consulta no puede superar los 2000 caracteres.' });
      }

      // Check concurrent session if token provided
      const clientToken = (req.headers['x-session-token'] as string) || sessionToken;
      if (userId && clientToken) {
        const sessionCheck = await usersStore.validateSession(userId, clientToken);
        if (!sessionCheck.valid) {
          return res.status(401).json({
            error: 'Sesión finalizada',
            code: 'CONCURRENT_SESSION_DETECTED',
            message: 'Se ha detectado un inicio de sesión con esta cuenta en otro dispositivo o navegador. Tu sesión actual ha sido cerrada por seguridad.'
          });
        }
      }

      // If sessionId is provided, save user query message to PostgreSQL
      let activeSessionId = sessionId;
      if (activeSessionId && userId) {
        try {
          await chatStore.saveMessage(activeSessionId, {
            role: 'user',
            content: query
          });
        } catch (saveErr) {
          console.warn('[Server] Error saving user message:', saveErr);
        }
      }

      // Check daily 10 web queries limit if Web Grounding is requested
      if (enableWebGrounding) {
        const usage = await usersStore.getWebQueryUsage(userId);
        if (usage.remaining <= 0) {
          const limitAnswer = `### ⚠️ Límite Diario de Búsqueda Web Alcanzado (10/10)

Has alcanzado el límite máximo de **10 consultas de Búsqueda Web por día**.

Para continuar realizando consultas hoy:
- Puedes desactivar el botón **"Búsqueda Web"** y realizar consultas ilimitadas sobre la **Base de Conocimiento y Libros Especializados** (RAG Local y Grafo Neo4j).
- El cupo de búsquedas web se reiniciará automáticamente a las 00:00 hrs de mañana.`;

          if (activeSessionId) {
            await chatStore.saveMessage(activeSessionId, {
              role: 'assistant',
              content: limitAnswer,
              executiveSummary: 'Límite diario de 10 consultas de búsqueda web alcanzado.',
              isWebGrounded: false,
              ragTypeUsed: 'hybrid',
              confidenceScore: 0
            });
          }

          return res.json({
            answer: limitAnswer,
            executiveSummary: 'Límite diario de 10 consultas de búsqueda web alcanzado.',
            citations: [],
            graphNodes: [],
            graphLinks: [],
            searchGroundingSources: [],
            isWebGrounded: false,
            ragTypeUsed: 'hybrid',
            confidenceScore: 0,
            webUsage: usage
          });
        }
      }

      const result = await ragEngine.processQuery({
        query,
        conversationHistory,
        ramaId,
        ramaNombre,
        categoryFilter,
        docFilter,
        enableHybridSearch: enableHybridSearch ?? true,
        enableGraphRAG: enableGraphRAG ?? true,
        enableWebGrounding: enableWebGrounding ?? false
      });

      // Increment web usage if web grounding was executed
      if (enableWebGrounding && result.isWebGrounded) {
        await usersStore.incrementWebQueryUsage(userId);
      }

      // Save assistant response message to PostgreSQL
      let savedAssistantMsg = null;
      if (activeSessionId) {
        try {
          savedAssistantMsg = await chatStore.saveMessage(activeSessionId, {
            role: 'assistant',
            content: result.answer,
            executiveSummary: result.executiveSummary,
            citations: result.citations,
            graphNodes: result.graphNodes,
            graphLinks: result.graphLinks,
            searchGroundingSources: result.searchGroundingSources,
            isWebGrounded: result.isWebGrounded,
            ragTypeUsed: result.ragTypeUsed,
            confidenceScore: result.confidenceScore
          });
        } catch (saveAssistantErr) {
          console.warn('[Server] Error saving assistant response message:', saveAssistantErr);
        }
      }

      // Log access and query count for user
      if (userId) {
        try {
          await usersStore.incrementQueryCount(userId);
          await usersStore.recordAccessLog({
            userId,
            userEmail: req.body.userEmail || 'usuario@sistema.gob.pe',
            action: 'QUERY',
            details: `Consulta RAG en Rama (${ramaNombre || ramaId || 'General'}): ${query.slice(0, 80)}...`
          });
        } catch (logErr) {
          // ignore
        }
      }

      const currentUsage = userId ? await usersStore.getWebQueryUsage(userId) : { count: 0, limit: 10, remaining: 10 };

      res.json({
        ...result,
        savedMessage: savedAssistantMsg,
        webUsage: currentUsage
      });
    } catch (e: any) {
      console.error('Error processing RAG query in server:', e);
      res.status(500).json({ error: e.message || 'Error procesando la consulta RAG.' });
    }
  });

  // Check user daily web query usage
  app.get('/api/users/web-usage/:userId?', async (req, res) => {
    try {
      const usage = await usersStore.getWebQueryUsage(req.params.userId);
      res.json(usage);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 1.1 Chat Sessions & History Endpoints (PostgreSQL)
  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const ramaId = req.query.ramaId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido para listar sesiones.' });
      }
      const sessions = await chatStore.getUserSessions(userId, ramaId);
      res.json({ sessions });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/chat/sessions/:id', async (req, res) => {
    try {
      const session = await chatStore.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada.' });
      }
      res.json({ session });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/chat/sessions', async (req, res) => {
    try {
      const { userId, title, ramaId, categoryFilter, docFilter, tags } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido para crear una sesión.' });
      }
      const newSession = await chatStore.createSession(
        userId,
        title || 'Nueva Consulta Jurídica',
        ramaId,
        categoryFilter,
        docFilter,
        tags
      );
      res.json({ success: true, session: newSession });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/chat/sessions/:id', async (req, res) => {
    try {
      const { title, ramaId, categoryFilter, docFilter, tags } = req.body;
      const success = await chatStore.updateSession(req.params.id, {
        title,
        ramaId,
        categoryFilter,
        docFilter,
        tags
      });
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/chat/sessions/:id', async (req, res) => {
    try {
      const success = await chatStore.deleteSession(req.params.id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Document & Knowledge Base Management
  app.get('/api/documents', (req, res) => {
    try {
      const ramaId = req.query.ramaId as string;
      const docs = knowledgeBase.getDocuments(ramaId);
      res.json({ documents: docs, total: docs.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Knowledge base live stats
  app.get('/api/knowledge/stats', (req, res) => {
    try {
      const docs = knowledgeBase.getDocuments();
      const chunks = knowledgeBase.getChunks();
      const graphData = knowledgeBase.getGraphData();
      res.json({
        documentsCount: docs.length,
        chunksCount: chunks.length,
        nodesCount: graphData.nodes.length,
        linksCount: graphData.links.length
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // View / Download specific document from local server storage
  app.get('/api/documents/view/:id', (req, res) => {
    try {
      const doc = knowledgeBase.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Documento no encontrado</title>
          <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h2>Documento no encontrado</h2>
            <p>El identificador de documento solicitado no existe en la base de datos.</p>
          </body></html>
        `);
      }

      // Check if physical file exists on disk — path traversal protection
      if (doc.fileName) {
        // Sanitize: only allow safe filenames (no directory traversal)
        const safeFileName = path.basename(doc.fileName);
        const filePath = path.join(DOCUMENTS_DIR, safeFileName);
        // Ensure resolved path stays within DOCUMENTS_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(DOCUMENTS_DIR);
        if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
          return res.status(403).send('Acceso no autorizado al archivo.');
        }
        if (fs.existsSync(filePath)) {
          if (safeFileName.toLowerCase().endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            return res.sendFile(filePath);
          }
          if (safeFileName.toLowerCase().endsWith('.txt')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return res.send(renderHtmlDocumentViewer(doc, [{
              id: 'full-text',
              docId: doc.id,
              docTitle: doc.title,
              author: doc.author,
              page: 1,
              chapter: 'Contenido Completo',
              section: 'Texto Original',
              text: fileContent,
              entities: [],
              articlesReferenced: []
            }]));
          }
          return res.sendFile(filePath);
        }
      }

      // Render indexed chunks as structured chapters
      const chunks = knowledgeBase.getChunksByDocId(req.params.id);
      if (chunks.length > 0) {
        return res.send(renderHtmlDocumentViewer(doc, chunks));
      }

      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Sin contenido</title>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2>Contenido no disponible</h2>
          <p>No se encontraron fragmentos disponibles para este documento.</p>
        </body></html>
      `);
    } catch (err: any) {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).send(isProd ? 'Error interno del servidor.' : `Error del servidor: ${(err as Error).message}`);
    }
  });

  app.post('/api/documents/upload', requireAdminAuth, async (req, res) => {
    try {
      const {
        title,
        author,
        category,
        categoryLabel,
        description,
        textContent,
        totalPages,
        fileSize,
        fileName,
        fileBase64,
        tags
      } = req.body;

      if (!title || !textContent) {
        return res.status(400).json({ error: 'Título y contenido de texto son obligatorios.' });
      }

      const newId = `doc-custom-${Date.now()}`;
      let savedFileName = fileName || `${newId}.pdf`;

      // Save file to server/documents/
      if (fileBase64) {
        try {
          // Remove base64 data header if present
          const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(path.join(DOCUMENTS_DIR, savedFileName), buffer);
        } catch (err) {
          console.error('Error saving uploaded file to disk:', err);
        }
      } else {
        // Save as text file
        savedFileName = `${newId}.txt`;
        try {
          fs.writeFileSync(path.join(DOCUMENTS_DIR, savedFileName), textContent, 'utf-8');
        } catch (err) {
          console.error('Error saving text file to disk:', err);
        }
      }

      // Split text into semantic chunks
      const paragraphs = textContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 50);
      const chunks: DocumentChunk[] = paragraphs.slice(0, 20).map((para: string, idx: number) => ({
        id: `chunk-${newId}-${idx + 1}`,
        docId: newId,
        docTitle: title,
        author: author || 'Autor no especificado',
        page: Math.floor(idx / 2) + 1,
        chapter: `Capítulo ${(idx % 3) + 1}: Materia Tributaria General`,
        section: `Sección ${idx + 1}`,
        text: para.trim(),
        entities: ['Derecho Tributario', categoryLabel || 'Doctrina Tributaria', title.split(' ')[0]],
        articlesReferenced: []
      }));

      // Generate Knowledge Graph node for this document
      const bookNode: GraphNode = {
        id: `node-${newId}`,
        label: 'Book',
        name: title,
        properties: {
          author: author || 'Autor no especificado',
          year: new Date().getFullYear(),
          category: category || 'doctrina',
          summary: description || title
        }
      };

      const newDoc: TaxDocument = {
        id: newId,
        title,
        author: author || 'Autor no especificado',
        year: new Date().getFullYear(),
        category: category || 'doctrina',
        categoryLabel: categoryLabel || 'Doctrina Tributaria',
        totalPages: totalPages || Math.ceil(paragraphs.length / 2) || 10,
        fileSize: fileSize || '2.4 MB',
        fileName: savedFileName,
        fileUrl: `/api/documents/view/${newId}`,
        chunksCount: chunks.length,
        entitiesCount: Math.min(chunks.length * 2, 20),
        status: 'indexed',
        uploadDate: new Date().toISOString().split('T')[0],
        description: description || 'Documento incorporado a la base de conocimiento tributaria.',
        tags: tags || ['Derecho Tributario', 'Doctrina', 'PDF']
      };

      knowledgeBase.addDocument(newDoc, chunks, [bookNode]);

      // Auto sync to Neo4j
      neo4jService.syncKnowledgeBaseToNeo4j().catch(err => console.warn('Neo4j sync warning:', err.message));

      res.json({
        success: true,
        document: newDoc,
        chunksIndexed: chunks.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/documents/sync-drive', requireAdminAuth, (req, res) => {
    try {
      const { folderUrl } = req.body;
      const docs = knowledgeBase.getDocuments();
      res.json({
        success: true,
        message: `Sincronización completada con la carpeta de Google Drive (${folderUrl || 'Carpeta Oficial'})`,
        syncedDocsCount: docs.length,
        driveUrl: folderUrl || 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/documents/:id', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const success = knowledgeBase.deleteDocument(id);
      if (success) {
        res.json({ success: true, message: `Documento ${id} eliminado correctamente.` });
      } else {
        res.status(404).json({ error: 'Documento no encontrado' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Neo4j Status & Cypher Execution Endpoints
  app.get('/api/neo4j/status', async (req, res) => {
    try {
      const statusInfo = await neo4jService.checkConnection();
      res.json(statusInfo);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/neo4j/update-config', requireAdminAuth, (req, res) => {
    try {
      const { host, boltPort, httpPort, user, pass, database } = req.body;
      neo4jService.updateConfig({ host, boltPort, httpPort, user, pass, database });
      res.json({ success: true, config: neo4jService.getConfig() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/neo4j/cypher', requireAdminAuth, async (req, res) => {
    try {
      const { query, params } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Consulta Cypher requerida.' });
      }
      const result = await neo4jService.executeCypher(query, params || {});
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/neo4j/sync', requireAdminAuth, async (req, res) => {
    try {
      const syncResult = await neo4jService.syncKnowledgeBaseToNeo4j();
      res.json({ success: true, ...syncResult });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. Graph Data for Visualizer
  app.get('/api/graph/data', (req, res) => {
    try {
      const graphData = knowledgeBase.getGraphData();
      res.json(graphData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 5. User Management & Analytics (PostgreSQL) - Protected with requireAdminAuth
  app.get('/api/users/active', requireAdminAuth, async (req, res) => {
    try {
      const activeData = await usersStore.getActiveUsers();
      res.json(activeData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/users', requireAdminAuth, async (req, res) => {
    try {
      const users = await usersStore.getUsers();
      res.json({ users });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users/update-role', requireAdminAuth, async (req, res) => {
    try {
      const { userId, newRole } = req.body;
      const user = await usersStore.updateUserRole(userId, newRole);
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(404).json({ error: 'Usuario no encontrado' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users/create', requireAdminAuth, async (req, res) => {
    try {
      const newUser = await usersStore.createUser(req.body);
      res.json({ success: true, user: newUser });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Faltan credenciales' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de correo inválido' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
        || req.socket.remoteAddress || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || '';

      // Rate limiting check
      const rateCheck = checkLoginRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          error: 'Demasiados intentos de inicio de sesión. Por seguridad, tu acceso ha sido bloqueado temporalmente.',
          retryAfterSeconds: rateCheck.retryAfter
        });
      }

      const loginResult = await usersStore.loginUser(email, password, clientIp, userAgent);
      if (loginResult) {
        resetLoginRateLimit(clientIp); // reset on success
        res.json({
          success: true,
          user: loginResult.user,
          sessionToken: loginResult.sessionToken
        });
      } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } catch (e: any) {
      const isProd = process.env.NODE_ENV === 'production';
      res.status(500).json({ error: isProd ? 'Error interno del servidor' : (e as Error).message });
    }
  });

  app.post('/api/users/validate-session', async (req, res) => {
    try {
      const { userId, sessionToken } = req.body;
      const result = await usersStore.validateSession(userId, sessionToken);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users/logout', async (req, res) => {
    try {
      const { userId } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || '';
      const userAgent = req.headers['user-agent'] || '';

      await usersStore.logoutUser(userId, clientIp, userAgent);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. Access Logs (Protected for Admin)
  app.get('/api/users/access-logs', requireAdminAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 150;
      const logs = await usersStore.getAccessLogs(limit);
      res.json({ success: true, logs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 7. Notificaciones Persistentes en PostgreSQL
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query?.userId as string);
      const notifications = await usersStore.getNotifications(userId);
      console.log(`[PostgreSQL] Consultadas ${notifications.length} notificaciones (User: ${userId || 'Global'})`);
      res.json({ success: true, notifications });
    } catch (e: any) {
      console.error('[PostgreSQL] Error consultando notificaciones:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const { userId, title, message, type } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Título y mensaje son obligatorios' });
      }
      const notif = await usersStore.createNotification({ userId, title, message, type });
      console.log(`[PostgreSQL] ✅ Notificación guardada en BD: "${title}" (Tipo: ${type || 'info'})`);
      res.json({ success: true, notification: notif });
    } catch (e: any) {
      console.error('[PostgreSQL] Error guardando notificación:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/notifications/read', async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const success = await usersStore.markNotificationRead(id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || req.body?.userId;
      const success = await usersStore.markAllNotificationsRead(userId);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/notifications', async (req, res) => {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query?.userId as string);
      const success = await usersStore.clearNotifications(userId);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users/change-password', async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }
      const success = await usersStore.updatePassword(userId, newPassword);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/users/:id', requireAdminAuth, async (req, res) => {
    try {
      const success = await usersStore.deleteUser(req.params.id);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        // Solo assets con hash: cache agresivo. index.html nunca se cachea (ver fallback).
        if (!filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    // Cache-Control for HTML (always revalidate)
    // SPA fallback: no interceptar /api/*
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LexTributario Server] Running on http://localhost:${PORT}`);
  });
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtmlDocumentViewer(doc: TaxDocument, chunks: DocumentChunk[]): string {
  const safeTitle = escapeHtml(doc.title);
  const safeAuthor = escapeHtml(doc.author);
  const safeCategory = escapeHtml(doc.categoryLabel);
  const safeYear = doc.year || new Date().getFullYear();

  const chunksHtml = chunks.map((c, i) => `
    <article class="chapter-card" id="sec-${i}">
      <div class="chapter-header">
        <span class="chapter-title">${escapeHtml(c.chapter)}</span>
        <span class="page-badge">Página ${c.page}</span>
      </div>
      <div class="chapter-section">${escapeHtml(c.section)}</div>
      <div class="chapter-body">${escapeHtml(c.text).replace(/\n/g, '<br/>')}</div>
      ${c.articlesReferenced && c.articlesReferenced.length > 0 ? `
        <div class="legal-basis">
          <strong>Base Normativa:</strong> ${escapeHtml(c.articlesReferenced.join(', '))}
        </div>
      ` : ''}
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${safeTitle} - Acervo Tributario</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #BF092F;
      --badge-bg: #4A0A18;
      --badge-text: #FBD5DC;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --border: #e2e8f0;
        --text: #0f172a;
        --text-muted: #64748b;
        --accent: #d97706;
        --badge-bg: #fef3c7;
        --badge-text: #92400e;
      }
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header-info h1 {
      font-size: 15px;
      margin: 0;
      font-weight: 700;
    }
    .header-info p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 2px 0 0 0;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    button {
      background: var(--accent);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .container {
      max-width: 840px;
      margin: 30px auto;
      padding: 0 20px;
    }
    .book-meta {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .category-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .book-title {
      font-size: 22px;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .book-author {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .chapter-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .chapter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .chapter-title {
      font-weight: 700;
      font-size: 14px;
      color: var(--accent);
    }
    .page-badge {
      font-size: 11px;
      font-weight: 600;
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
    .chapter-section {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .chapter-body {
      font-size: 14px;
      line-height: 1.7;
    }
    .legal-basis {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed var(--border);
      font-size: 12px;
      color: var(--text-muted);
    }
    @media print {
      .header, .actions { display: none !important; }
      body { background: white; color: black; }
      .chapter-card, .book-meta { border: none; box-shadow: none; padding: 0; margin-bottom: 24px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-info">
      <h1>${safeTitle}</h1>
      <p>${safeAuthor} • ${safeCategory}</p>
    </div>
    <div class="actions">
      <button class="btn-secondary" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
      <button onclick="window.close()">Cerrar Visor</button>
    </div>
  </div>

  <div class="container">
    <div class="book-meta">
      <span class="category-badge">${safeCategory}</span>
      <h1 class="book-title">${safeTitle}</h1>
      <div class="book-author"><strong>Autor:</strong> ${safeAuthor} (${safeYear}) • <strong>Capítulos/Páginas indexadas:</strong> ${chunks.length} secciones</div>
      <p style="font-size: 13px; color: var(--text-muted); margin: 0;">${escapeHtml(doc.description || '')}</p>
    </div>

    <div class="chapters-list">
      ${chunksHtml}
    </div>
  </div>
</body>
</html>`;
}

startServer();
