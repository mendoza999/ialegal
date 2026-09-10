import { DoctrinalEntry, SavedCitation } from '../types';

/**
 * Returns the authoritative direct Google Drive URL to the original document in the Tributario folder.
 */
export const getDocumentOriginalUrl = (
  entry: Partial<DoctrinalEntry> | Partial<SavedCitation>
): string => {
  if (entry.driveViewLink && entry.driveViewLink.trim().length > 0) {
    return entry.driveViewLink;
  }
  if (entry.driveFileId && entry.driveFileId.trim().length > 0) {
    return `https://drive.google.com/file/d/${entry.driveFileId}/view`;
  }
  if (entry.originalDocumentUrl && entry.originalDocumentUrl.trim().length > 0) {
    return entry.originalDocumentUrl;
  }
  if (entry.sourceUrl && entry.sourceUrl.trim().length > 0) {
    return entry.sourceUrl;
  }

  // Google Drive Search fallback within the user's Drive repository
  const docTitle = (entry as any).title || (entry as any).docTitle || '';
  const query = `${docTitle} ${entry.author || ''}`.trim();
  return `https://drive.google.com/drive/u/0/search?q=${encodeURIComponent(query)}`;
};

/**
 * Returns metadata about the Google Drive source link in the "Tributario" repository
 */
export const getDocumentSourceInfo = (
  entry: Partial<DoctrinalEntry> | Partial<SavedCitation>
): { url: string; label: string; isDrive: boolean; path: string } => {
  const url = getDocumentOriginalUrl(entry);
  const docTitle = (entry as any).title || (entry as any).docTitle || 'Documento';
  const path = (entry as any).drivePath || `Mi unidad / Tributario / ${(entry as any).driveFileName || docTitle + '.pdf'}`;

  return {
    url,
    label: 'Google Drive: Tributario',
    isDrive: true,
    path,
  };
};

/**
 * Formats a formal APA / Legal citation referencing Google Drive as the repository source
 */
export const formatFormalLegalCitation = (
  entry: Partial<DoctrinalEntry> | Partial<SavedCitation>
): string => {
  const author = (entry.author || 'AUTOR').toUpperCase();
  const year = (entry as any).year || new Date().getFullYear();
  const title = (entry as any).title || (entry as any).docTitle || 'Título de la obra';
  const publisher = (entry as any).publisher || 'Fondo Editorial Jurídico';
  const pageNum = (entry as any).pageNumber || (entry as any).page;
  const pages = pageNum ? `, ${pageNum}` : '';
  const url = getDocumentOriginalUrl(entry);

  return `${author} (${year}). ${title}${pages}. ${publisher}. Recuperado del Repositorio Google Drive (Carpeta Tributario): ${url}`;
};

/**
 * Returns a search link for a given legal article in SPIJ / SUNAT legislation
 */
export const getArticleSearchUrl = (articleText: string): string => {
  return `https://www.google.com/search?q=${encodeURIComponent(articleText + ' Peru tributario legislacion')}`;
};

/**
 * Returns a search link for a given jurisprudence reference (RTF or STC)
 */
export const getJurisprudenceSearchUrl = (refText: string): string => {
  if (refText.toUpperCase().includes('RTF')) {
    return `https://www.google.com/search?q=${encodeURIComponent(refText + ' Tribunal Fiscal Peru')}`;
  }
  if (refText.toUpperCase().includes('STC') || refText.toUpperCase().includes('TC')) {
    return `https://www.google.com/search?q=${encodeURIComponent(refText + ' Tribunal Constitucional Peru')}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(refText + ' jurisprudencia tributaria Peru')}`;
};

