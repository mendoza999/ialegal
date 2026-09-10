export type UserRole = 'admin' | 'user' | 'usuario';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  organization?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  authProvider: 'google' | 'github' | 'email';
  organization?: string;
  createdAt: string;
  lastLogin: string;
  queryCount: number;
  password?: string;
  dailyWebQueries?: {
    date: string;
    count: number;
  };
}

export interface RamaDerecho {
  id: string;
  nombre: string;
}

export type TaxCategory = 
  | 'codigo_tributario' 
  | 'impuesto_renta' 
  | 'igv_iva' 
  | 'procedimientos' 
  | 'constitucional' 
  | 'jurisprudencia' 
  | 'doctrina'
  | 'CÓDIGO TRIBUTARIO'
  | 'IMPUESTO A LA RENTA'
  | 'IMPUESTO GENERAL A LAS VENTAS (IGV)'
  | 'PROCEDIMIENTOS Y FISCALIZACIÓN'
  | 'INFRACCIONES Y SANCIONES'
  | 'DERECHO TRIBUTARIO INTERNACIONAL'
  | 'TRIBUTACIÓN MUNICIPAL Y SECTORIAL'
  | 'DOCTRINA GENERAL Y PRINCIPIOS'
  | string;

export interface DoctrinalEntry {
  id: string;
  title: string;
  author: string;
  year: number | string;
  edition?: string;
  subCategory?: string;
  publisher?: string;
  ramaId?: string;
  category: TaxCategory;
  categoryLabel?: string;
  summary?: string;
  totalPages?: number;
  fileSize?: string;
  driveUrl?: string;
  fileUrl?: string;
  fileName?: string;
  tags?: string[];
  chunksCount?: number;
  entitiesCount?: number;
  status?: string;
  uploadDate?: string;
  description?: string;
  driveViewLink?: string;
  driveFileId?: string;
  driveFileName?: string;
  drivePath?: string;
  driveDownloadLink?: string;
  originalDocumentUrl?: string;
  sourceUrl?: string;
  pageNumber?: number | string;
  institution?: string;
  linkedArticles?: string[];
  isDriveSource?: boolean;
  ratioDoctrinal?: string;
  keyExcerpt?: string;
  jurisprudenceReferences?: string[];
  keywords?: string[];
}

export interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  downloadUrl?: string;
  iconLink?: string;
  category?: TaxCategory;
  description?: string;
  webContentLink?: string;
}

export interface HtmlBook {
  id: string;
  title: string;
  author: string;
  year: number;
  category: string;
  htmlContent: string;
  coverImage?: string;
  description?: string;
  abstract?: string;
  fileName?: string;
}

export interface AiFichaResult {
  docId: string;
  docTitle: string;
  resumenEjecutivo: string;
  tesisCentral: string;
  articulosClave: string[];
  criteriosRelevantes: string[];
  palabrasClave: string[];
  ratioDoctrinal?: string;
  institucionJuridica?: string;
  articulosVinculados?: string[];
  sintesisDogmatica?: string;
  posturasDoctrinales?: string[];
  citacionAPA?: string;
}

export interface SavedCitation {
  id: string;
  citationId: string;
  docTitle: string;
  title?: string;
  author: string;
  year?: number | string;
  page: number;
  pageNumber?: number;
  quote: string;
  dateSaved: string;
  notes?: string;
  driveViewLink?: string;
  driveFileId?: string;
  originalDocumentUrl?: string;
  sourceUrl?: string;
  entryId?: string;
  category?: TaxCategory;
  institution?: string;
  linkedArticles?: string[];
  citationText?: string;
  tags?: string[];
  driveDownloadLink?: string;
  personalNotes?: string;
}

export interface TaxonomyNode {
  id: string;
  label: string;
  category: TaxCategory;
  description?: string;
  children?: TaxonomyNode[];
  documentCount?: number;
  articles?: string[];
}

export interface TaxDocument {
  id: string;
  title: string;
  author: string;
  year: number;
  ramaId?: string;
  category: 'codigo_tributario' | 'impuesto_renta' | 'igv_iva' | 'procedimientos' | 'constitucional' | 'jurisprudencia' | 'doctrina' | string;
  categoryLabel: string;
  totalPages: number;
  fileSize: string;
  driveUrl?: string;
  fileUrl?: string;
  fileName?: string;
  chunksCount: number;
  entitiesCount: number;
  status: 'indexed' | 'processing' | 'error';
  uploadDate: string;
  description: string;
  tags: string[];
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  author: string;
  page: number;
  chapter: string;
  section: string;
  text: string;
  entities: string[];
  articlesReferenced: string[];
  relevanceScore?: number;
}

export interface GraphNode {
  id: string;
  label: 'Book' | 'Law' | 'Article' | 'Concept' | 'Author' | 'Jurisprudence' | 'Principle';
  name: string;
  category?: string;
  properties?: {
    summary?: string;
    definition?: string;
    docTitle?: string;
    page?: number;
    year?: number;
    legalBasis?: string;
    [key: string]: any;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'CONTAINS' | 'REGULATES' | 'DEFINES' | 'APPLIES_TO' | 'CITES' | 'EXCEPTIONS_TO' | 'DERIVED_FROM' | 'AUTHORED_BY';
  label?: string;
  description?: string;
}

export interface Citation {
  id: string;
  docId: string;
  docTitle: string;
  author: string;
  page: number;
  chapter: string;
  quote: string;
  relevanceScore: number;
  legalBasis?: string;
  fileUrl?: string;
  fileName?: string;
  conceptMatched?: string;
}

export interface SearchGroundingSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  graphNodes?: GraphNode[];
  graphLinks?: GraphLink[];
  searchGroundingSources?: SearchGroundingSource[];
  isWebGrounded?: boolean;
  ragTypeUsed?: 'hybrid' | 'vector' | 'graph' | 'web';
  confidenceScore?: number;
  executiveSummary?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  ramaId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  categoryFilter?: string;
  docFilter?: string[];
  tags?: string[];
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'document_indexed' | 'legal_alert';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Neo4jConnectionConfig {
  host: string;
  boltPort: number;
  httpPort: number;
  user: string;
  pass: string;
  database: string;
  status: 'connected' | 'disconnected' | 'simulated';
  lastConnected?: string;
  nodeCount?: number;
  relationshipCount?: number;
}

export interface RAGQueryOptions {
  enableHybridSearch: boolean;
  enableGraphRAG: boolean;
  enableWebGrounding: boolean;
  ramaId?: string;
  categoryFilter?: string;
  docFilter?: string[];
  maxCitations?: number;
}

export interface AccessLogEntry {
  id: string;
  userId: string;
  userName?: string;
  userEmail: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  action: 'LOGIN' | 'LOGOUT' | 'QUERY' | 'SESSION_VALIDATE' | 'ADMIN_ACTION' | string;
  details?: string;
  createdAt: string;
}

