import { DriveItem, DoctrinalEntry, TaxCategory } from '../types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

// Helper to deduce Tax Category from file title or path
export const inferTaxCategory = (title: string): TaxCategory => {
  const t = title.toUpperCase();
  if (t.includes('RENTA') || t.includes('IR') || t.includes('CAUSALIDAD') || t.includes('DEVENGADO') || t.includes('37 LIR')) {
    return 'IMPUESTO A LA RENTA';
  }
  if (t.includes('IGV') || t.includes('IVA') || t.includes('CRÉDITO FISCAL') || t.includes('CREDITO FISCAL') || t.includes('DETRACCION')) {
    return 'IMPUESTO GENERAL A LAS VENTAS (IGV)';
  }
  if (t.includes('FISCALIZACI') || t.includes('PROCEDIMIENTO') || t.includes('RECLAMACI') || t.includes('APELACI') || t.includes('TRIBUNAL FISCAL') || t.includes('COBRANZA')) {
    return 'PROCEDIMIENTOS Y FISCALIZACIÓN';
  }
  if (t.includes('INFRACCI') || t.includes('SANCI') || t.includes('MULTA') || t.includes('178') || t.includes('GRADUALIDAD')) {
    return 'INFRACCIONES Y SANCIONES';
  }
  if (t.includes('INTERNACIONAL') || t.includes('CONVENIO') || t.includes('CDI') || t.includes('BEPS') || t.includes('PRECIOS DE TRANSFERENCIA') || t.includes('OCDE')) {
    return 'DERECHO TRIBUTARIO INTERNACIONAL';
  }
  if (t.includes('MUNICIPAL') || t.includes('PREDIAL') || t.includes('ALCABALA') || t.includes('ARBITRIOS') || t.includes('MINER') || t.includes('SECTORIAL')) {
    return 'TRIBUTACIÓN MUNICIPAL Y SECTORIAL';
  }
  if (t.includes('PRINCIPIO') || t.includes('CONSTITUCIONAL') || t.includes('CONFISCATORIEDAD') || t.includes('CAPACIDAD') || t.includes('NORMA XVI') || t.includes('NORMA VIII') || t.includes('DOCTRINA') || t.includes('HECHO IMPONIBLE')) {
    return 'DOCTRINA GENERAL Y PRINCIPIOS';
  }
  return 'CÓDIGO TRIBUTARIO';
};

// Helper to extract author / year heuristics from filename
export const extractBookMetadataFromTitle = (filename: string) => {
  // Clean extension
  const cleanName = filename.replace(/\.(pdf|docx?|txt|epub|gdoc)$/i, '');
  
  // Try pattern: "Author - Title (Year)" or "Title - Author"
  const yearMatch = cleanName.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : 'Edición Reciente';

  let author = 'Autor Especialista';
  let title = cleanName;

  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    if (parts.length >= 2) {
      if (parts[0].length < parts[1].length) {
        author = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      } else {
        title = parts[0].trim();
        author = parts.slice(1).join(' - ').trim();
      }
    }
  }

  // Common Peruvian/International Tax Authors auto-detection
  const knownAuthors = [
    'Geraldo Ataliba', 'Héctor Villegas', 'Dino Jarach', 'Francisco Ruiz de Castilla',
    'Jorge Bravo Cucci', 'Luis Durán Rojo', 'Armando Zolezzi', 'Walker Villanueva',
    'Enrique Vidal', 'César Talledo', 'Humberto Medrano', 'Jorge Danós',
    'Marcial Rubio', 'Carmen del Pilar Robles', 'Klaus Vogel', 'Alfonso Aníbal',
    'IPDT', 'IFA Grupo Peruano', 'Tribunal Fiscal'
  ];

  for (const known of knownAuthors) {
    if (cleanName.toLowerCase().includes(known.toLowerCase())) {
      author = known;
      break;
    }
  }

  return { title, author, year };
};

// 1. Search or find the "Tributario" folder in Drive
export const findTributarioFolders = async (token: string): Promise<DriveItem[]> => {
  const query = "mimeType = 'application/vnd.google-apps.folder' and (name contains 'Tributario' or name contains 'TRIBUTARIO' or name contains 'Tributaria' or name contains 'Derecho Tributario') and trashed = false";
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)&pageSize=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Error al buscar la carpeta Tributario (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    parents: f.parents,
  }));
};

// 2. List all folders and subfolders in Drive root or parent
export const listDriveFolders = async (token: string, parentId?: string): Promise<DriveItem[]> => {
  let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)&orderBy=name&pageSize=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Error al listar carpetas de Google Drive');
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    parents: f.parents,
  }));
};

// 3. List files in a specific folder or across Tributario folder hierarchy
export const listFilesInFolder = async (
  token: string,
  folderId?: string,
  searchQuery?: string,
  pageSize = 50
): Promise<{ files: DriveItem[]; subfolders: DriveItem[] }> => {
  let qParts: string[] = ['trashed = false'];

  if (folderId) {
    qParts.push(`'${folderId}' in parents`);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const safeQ = searchQuery.replace(/'/g, "\\'");
    qParts.push(`(name contains '${safeQ}' or fullText contains '${safeQ}')`);
  }

  const fullQuery = qParts.join(' and ');
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(fullQuery)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,description,parents,iconLink)&orderBy=folder,name&pageSize=${pageSize}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Error al consultar archivos en Google Drive');
  }

  const data = await res.json();
  const allItems: DriveItem[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? formatFileSize(parseInt(f.size, 10)) : undefined,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
    webContentLink: f.webContentLink,
    thumbnailLink: f.thumbnailLink,
    description: f.description,
    parents: f.parents,
    iconLink: f.iconLink,
  }));

  const subfolders = allItems.filter((i) => i.mimeType === 'application/vnd.google-apps.folder');
  const files = allItems.filter((i) => i.mimeType !== 'application/vnd.google-apps.folder');

  return { files, subfolders };
};

// 4. Read text snippet or export content from a Google Drive file
export const fetchDriveFileContent = async (token: string, fileId: string, mimeType: string): Promise<string> => {
  try {
    let url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;

    // If it's a Google Doc, export as plain text
    if (mimeType === 'application/vnd.google-apps.document') {
      url = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=text/plain`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return `[Vista previa no textual para ${mimeType}. Puedes abrir el archivo en el visor oficial de Google Drive]`;
    }

    if (mimeType.includes('text') || mimeType.includes('document')) {
      const text = await res.text();
      return text.slice(0, 15000); // return clean sample
    }

    return `Documento disponible para lectura en visor integrado.`;
  } catch (error) {
    console.error('Error fetching file content:', error);
    return `[Vista previa disponible mediante visor web de Google Drive]`;
  }
};

// Helper to convert Drive files into Doctrinal entries
export const convertDriveFileToDoctrinalEntry = (file: DriveItem): DoctrinalEntry => {
  const { title, author, year } = extractBookMetadataFromTitle(file.name);
  const category = inferTaxCategory(file.name);

  // Derive relevant tax articles based on keywords
  const linkedArticles: string[] = [];
  const upper = file.name.toUpperCase();
  if (upper.includes('37') || upper.includes('CAUSALIDAD') || upper.includes('RENTA')) {
    linkedArticles.push('Art. 37 Ley del Impuesto a la Renta');
  }
  if (upper.includes('57') || upper.includes('DEVENGADO')) {
    linkedArticles.push('Art. 57 Ley del Impuesto a la Renta');
  }
  if (upper.includes('XVI') || upper.includes('ANTIELUSIV') || upper.includes('ELUSION')) {
    linkedArticles.push('Norma XVI Título Preliminar Código Tributario');
  }
  if (upper.includes('IV') || upper.includes('LEGALIDAD') || upper.includes('RESERVA')) {
    linkedArticles.push('Norma IV Título Preliminar Código Tributario');
  }
  if (upper.includes('62') || upper.includes('FISCALIZACION')) {
    linkedArticles.push('Art. 62 Código Tributario (Facultad de Fiscalización)');
  }
  if (upper.includes('178') || upper.includes('INFRACCION') || upper.includes('MULTA')) {
    linkedArticles.push('Art. 178 num. 1 Código Tributario');
  }
  if (upper.includes('18') || upper.includes('19') || upper.includes('CREDITO FISCAL') || upper.includes('IGV')) {
    linkedArticles.push('Arts. 18 y 19 Ley del IGV');
  }

  if (linkedArticles.length === 0) {
    linkedArticles.push(category === 'IMPUESTO A LA RENTA' ? 'TUO Ley del Impuesto a la Renta (D.S. 179-2004-EF)' : 'TUO Código Tributario (D.S. 133-2013-EF)');
  }

  return {
    id: `drive-${file.id}`,
    title: title,
    author: author,
    year: year,
    category: category,
    institution: inferInstitutionFromTitle(file.name, category),
    linkedArticles: linkedArticles,
    ratioDoctrinal: `Obra y contenido tributario disponible en la biblioteca de Google Drive (${file.name}). Análisis y doctrina aplicable a la materia de ${category.toLowerCase()}.`,
    keyExcerpt: file.description || `Documento clasificado en Google Drive para consulta doctrinal, investigación tributaria y análisis jurisprudencial. Archivo: ${file.name}.`,
    keywords: deriveKeywords(file.name),
    driveFileId: file.id,
    driveFileName: file.name,
    driveViewLink: file.webViewLink,
    driveDownloadLink: file.webContentLink,
    isDriveSource: true,
  };
};

const inferInstitutionFromTitle = (name: string, cat: TaxCategory): string => {
  const n = name.toUpperCase();
  if (n.includes('DEVENGADO')) return 'Criterio de Imputación del Devengado Jurídico y Contable';
  if (n.includes('CAUSALIDAD')) return 'Principio de Causalidad y Necesidad del Gasto';
  if (n.includes('FEHACIENCIA')) return 'Fehaciencia y Prueba de las Operaciones Reales';
  if (n.includes('NORMA XVI') || n.includes('ANTIELUSIV')) return 'Cláusula Antielusiva General y Calificación Económica';
  if (n.includes('PRESCRIPCI')) return 'Prescripción de la Obligación y Acción Tributaria';
  if (n.includes('CRÉDITO FISCAL') || n.includes('CREDITO FISCAL')) return 'Requisitos Sustanciales y Formales del Crédito Fiscal';
  if (n.includes('RESPONSABILIDAD SOLIDARIA')) return 'Responsabilidad Solidaria de Representantes Legales';
  if (n.includes('FISCALIZACI')) return 'Límites y Garantías en el Procedimiento de Fiscalización';
  if (n.includes('GRADUALIDAD')) return 'Régimen de Gradualidad y Discrecionalidad Sancionatoria';
  return `Tratado y Doctrina de ${cat}`;
};

const deriveKeywords = (name: string): string[] => {
  const words = name.replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const defaults = ['Doctrina Tributaria', 'Derecho Financiero', 'Jurisprudencia TF'];
  return Array.from(new Set([...words.slice(0, 4), ...defaults]));
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
