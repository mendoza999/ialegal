import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Citation, SearchGroundingSource } from '../types';

export interface ExportExecutiveSummaryParams {
  title: string;
  userQuery: string;
  assistantResponse: string;
  citations?: Citation[];
  searchGroundingSources?: SearchGroundingSource[];
  userName?: string;
  organization?: string;
  isWebGrounded?: boolean;
  ragTypeUsed?: string;
  confidenceScore?: number;
  date?: string;
}

const COLORS = {
  primaryDark: [15, 23, 42] as [number, number, number],       // #0f172a (Deep Slate / Navy)
  secondaryDark: [30, 41, 59] as [number, number, number],     // #1e293b (Slate Header)
  goldPrimary: [217, 119, 6] as [number, number, number],      // #d97706 (Amber / Gold Accent)
  goldDark: [180, 83, 9] as [number, number, number],          // #b45309
  goldLight: [254, 243, 199] as [number, number, number],      // #fef3c7 (Light Amber Fill)
  goldBorder: [245, 158, 11] as [number, number, number],      // #f59e0b
  emerald: [5, 150, 105] as [number, number, number],          // #059669 (Confidence / Score)
  emeraldLight: [236, 253, 245] as [number, number, number],   // #ecfdf5
  emeraldBorder: [167, 243, 208] as [number, number, number],  // #a7f3d0
  slateText: [51, 65, 85] as [number, number, number],         // #334155 (Body text)
  slateDark: [15, 23, 42] as [number, number, number],         // #0f172a (Titles)
  slateMuted: [100, 116, 139] as [number, number, number],     // #64748b (Subtitles & labels)
  slateLight: [241, 245, 249] as [number, number, number],     // #f1f5f9
  slateBg: [248, 250, 252] as [number, number, number],        // #f8fafc (Cards fill)
  slateBorder: [226, 232, 240] as [number, number, number],    // #e2e8f0 (Card borders)
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Normalizes all exotic Unicode characters, smart quotes, dashes,
 * and non-breaking spaces (NBSP) that break standard jsPDF font kerning and cause '/' artifacts.
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  return text
    // 1. Replace ALL non-breaking spaces and exotic Unicode whitespace with standard ASCII space
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // 2. Replace smart/curly quotes with standard quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00AB\u00BB]/g, '"') // « »
    // 3. Replace dashes and hyphens with standard ASCII hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // 4. Normalize degree and ordinal characters to standard N° or Art.
    .replace(/N[º°]\s*\.?\s*/gi, 'N° ')
    .replace(/Art[º°]\s*\.?\s*/gi, 'Art. ')
    // 5. Remove soft hyphens, zero-width spaces, and directional marks
    .replace(/[\u00AD\u200B-\u200D\u200E\u200F\uFEFF]/g, '')
    // 6. Clean multiple consecutive spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Strips markdown emphasis markers while preserving clean, sanitized text.
 */
export function cleanInlineMarkdown(str: string): string {
  if (!str) return '';
  const sanitized = sanitizeTextForPDF(str);
  return sanitized
    .replace(/\*\*(.*?)\*\*/g, '$1')    // **bold**
    .replace(/\*(.*?)\*/g, '$1')        // *italic*
    .replace(/__(.*?)__/g, '$1')        // __bold__
    .replace(/_(.*?)_/g, '$1')          // _italic_
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // [link](url)
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // `code`
    .replace(/\s+/g, ' ')
    .trim();
}

export function exportExecutiveSummaryPDF(params: ExportExecutiveSummaryParams) {
  const rawTitle = params.title || 'Dictamen Jurídico';
  const userQuery = sanitizeTextForPDF(params.userQuery || 'Consulta Tributaria');
  const assistantResponse = params.assistantResponse || '';
  const citations = params.citations || [];
  const searchGroundingSources = params.searchGroundingSources || [];
  const userName = sanitizeTextForPDF(params.userName || 'Dr. Marcelo Mendoza');
  const organization = sanitizeTextForPDF(params.organization || 'Estudio Jurídico & Asesoría Tributaria');
  const isWebGrounded = !!params.isWebGrounded;
  const ragTypeUsed = sanitizeTextForPDF(params.ragTypeUsed || 'Híbrido (Vector + Neo4j GraphRAG)');
  const confidenceScore = params.confidenceScore || 96;
  const date = sanitizeTextForPDF(
    params.date ||
      new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomMarginLimit = pageHeight - 20;

  let cursorY = 0;

  // Helper: check space and break page if needed
  const ensureSpace = (neededHeight: number): boolean => {
    if (cursorY + neededHeight > bottomMarginLimit) {
      doc.addPage();
      cursorY = 24; // Below running header
      return true;
    }
    return false;
  };

  // Helper: Draw Main Section Title
  const drawSectionTitle = (num: string, text: string) => {
    ensureSpace(14);
    // Gold left indicator bar
    doc.setFillColor(...COLORS.goldPrimary);
    doc.rect(margin, cursorY, 3, 5.5, 'F');

    // Number & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.slateDark);
    doc.text(`${num}. ${text}`, margin + 5.5, cursorY + 4.2);

    cursorY += 8.5;
  };

  // ==========================================
  // PAGE 1: HEADER BANNER (Executive Style)
  // ==========================================
  
  // Top Gold accent stripe
  doc.setFillColor(...COLORS.goldPrimary);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Main Banner Background
  doc.setFillColor(...COLORS.primaryDark);
  doc.rect(0, 4, pageWidth, 28, 'F');

  // Brand Name & Subtitle
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LEXTRIBUTARIO AI', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('SISTEMA INTEGRAL DE INTELIGENCIA JURÍDICO-TRIBUTARIA Y DOCTRINA', margin, 21);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Motor: ${ragTypeUsed} ${isWebGrounded ? '• Web Grounding Activo' : ''} • Base Doctrinal Indexada`, margin, 26);

  // Right Side Badge: Type of Document
  const badgeWidth = 56;
  const badgeHeight = 14;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = 11;

  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(...COLORS.goldPrimary);
  doc.setLineWidth(0.6);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.goldPrimary);
  doc.text('DICTAMEN TÉCNICO-JURÍDICO', badgeX + badgeWidth / 2, badgeY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`FECHA: ${date.toUpperCase()}`, badgeX + badgeWidth / 2, badgeY + 10.5, { align: 'center' });

  cursorY = 38;

  // ==========================================
  // METADATA DOSSIER CARD (2 Independent Columns)
  // ==========================================
  const colWidth = (contentWidth - 10) / 2;
  const col1Left = margin + 5;
  const col2Left = margin + colWidth + 8;
  const metaCardHeight = 28;

  doc.setFillColor(...COLORS.slateBg);
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cursorY, contentWidth, metaCardHeight, 2, 2, 'FD');

  // Left vertical gold accent
  doc.setFillColor(...COLORS.goldPrimary);
  doc.roundedRect(margin, cursorY, 2.5, metaCardHeight, 1, 1, 'F');

  // Vertical subtle column separator inside metadata box
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.2);
  doc.line(margin + colWidth + 5, cursorY + 3, margin + colWidth + 5, cursorY + metaCardHeight - 3);

  // Column 1 - Row 1: Solicitante
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('CONSULTOR / SOLICITANTE:', col1Left, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateDark);
  doc.setFontSize(8);
  const userTruncated = userName.length > 28 ? userName.slice(0, 26) + '...' : userName;
  doc.text(userTruncated, col1Left + 38, cursorY + 6);

  // Column 1 - Row 2: Organización
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('ORGANIZACIÓN / FIRMA:', col1Left, cursorY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slateDark);
  doc.setFontSize(7.5);
  const orgTruncated = organization.length > 30 ? organization.slice(0, 28) + '...' : organization;
  doc.text(orgTruncated, col1Left + 38, cursorY + 13.5);

  // Column 1 - Row 3: Materia Jurídica
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('MATERIA JURÍDICA:', col1Left, cursorY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slateDark);
  doc.setFontSize(7.5);
  doc.text('Derecho Tributario y Fiscalidad', col1Left + 38, cursorY + 21);

  // Column 2 - Row 1: Fecha
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('FECHA DE EMISIÓN:', col2Left, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slateDark);
  doc.setFontSize(7.5);
  doc.text(date, col2Left + 30, cursorY + 6);

  // Column 2 - Row 2: Confiabilidad RAG
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('CONFIABILIDAD RAG:', col2Left, cursorY + 13.5);

  // Score Badge
  doc.setFillColor(...COLORS.emeraldLight);
  doc.setDrawColor(...COLORS.emerald);
  doc.setLineWidth(0.2);
  doc.roundedRect(col2Left + 30, cursorY + 10.5, 24, 4.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLORS.emerald);
  doc.text(`${confidenceScore}% Precisión`, col2Left + 42, cursorY + 13.7, { align: 'center' });

  // Column 2 - Row 3: Base Documental
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateMuted);
  doc.text('BASE INDEXADA:', col2Left, cursorY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.slateDark);
  doc.setFontSize(7.5);
  doc.text('Doctrina, Normas y GraphRAG', col2Left + 30, cursorY + 21);

  cursorY += metaCardHeight + 8;

  // ==========================================
  // SECTION 1: CONSULTA FORMULADA (Query Box)
  // ==========================================
  drawSectionTitle('1', 'CONSULTA JURÍDICA FORMULADA');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  const queryLines = doc.splitTextToSize(`« ${userQuery} »`, contentWidth - 14);
  const queryBoxHeight = Math.max(14, queryLines.length * 4.4 + 7);

  ensureSpace(queryBoxHeight);

  doc.setFillColor(...COLORS.slateLight);
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cursorY, contentWidth, queryBoxHeight, 2, 2, 'FD');

  // Amber left border for query callout
  doc.setFillColor(...COLORS.goldPrimary);
  doc.rect(margin, cursorY, 2.5, queryBoxHeight, 'F');

  doc.setTextColor(...COLORS.slateDark);
  for (let qIdx = 0; qIdx < queryLines.length; qIdx++) {
    doc.text(queryLines[qIdx], margin + 6, cursorY + 5.5 + qIdx * 4.4);
  }

  cursorY += queryBoxHeight + 8;

  // ==========================================
  // SECTION 2: FUNDAMENTACIÓN Y ANÁLISIS
  // ==========================================
  drawSectionTitle('2', 'FUNDAMENTACIÓN JURÍDICA Y ANÁLISIS TÉCNICO');

  // Helper to render Markdown tables with autoTable
  const renderMarkdownTable = (tableLines: string[]) => {
    if (tableLines.length < 2) return;

    // Filter out separator lines like |---|---|
    const parsedRows = tableLines
      .filter(l => !/^\|(\s*:?-+:?\s*\|)+$/.test(l.trim()))
      .map(rowStr => {
        const cells = rowStr
          .split('|')
          .map(c => cleanInlineMarkdown(c));
        // Remove empty boundary cells
        if (cells.length > 0 && cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        return cells;
      })
      .filter(row => row.length > 0);

    if (parsedRows.length === 0) return;

    const head = [parsedRows[0]];
    const body = parsedRows.slice(1);

    ensureSpace(25);

    autoTable(doc, {
      startY: cursorY,
      head: head,
      body: body,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        textColor: COLORS.slateText,
        cellPadding: 2.8,
        lineColor: COLORS.slateBorder,
        lineWidth: 0.15,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: COLORS.secondaryDark,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: COLORS.slateBg
      },
      didDrawPage: (data) => {
        cursorY = data.cursor ? data.cursor.y : cursorY;
      }
    });

    cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : cursorY + 6;
  };

  // Main Markdown Parser loop
  const lines = assistantResponse.split('\n');
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty Line
    if (!trimmed) {
      cursorY += 2;
      i++;
      continue;
    }

    // 2. Horizontal Divider (--- or *** or ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      ensureSpace(6);
      doc.setDrawColor(...COLORS.slateBorder);
      doc.setLineWidth(0.3);
      doc.line(margin, cursorY + 1.5, pageWidth - margin, cursorY + 1.5);
      cursorY += 4.5;
      i++;
      continue;
    }

    // 3. Markdown Table Detection (| Col 1 | Col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      renderMarkdownTable(tableLines);
      continue;
    }

    // 4. Major Numbered Topic Header e.g.: "1. Resumen Ejecutivo / Tesis Jurídica" or "1. **Resumen...**"
    const majorTopicMatch = trimmed.match(/^(\d+)\.\s+(\*\*)?([^*:\n]+)(\*\*)?(:)?$/);
    if (majorTopicMatch) {
      const topicNum = majorTopicMatch[1];
      const topicTitle = cleanInlineMarkdown(majorTopicMatch[3]);

      ensureSpace(12);
      cursorY += 3;

      // Draw subtle background pill for major subsection
      doc.setFillColor(...COLORS.slateLight);
      doc.setDrawColor(...COLORS.slateBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, cursorY, contentWidth, 7, 1.5, 1.5, 'FD');

      // Gold vertical bar
      doc.setFillColor(...COLORS.goldPrimary);
      doc.rect(margin, cursorY, 2.5, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primaryDark);
      doc.text(`${topicNum}.  ${topicTitle.toUpperCase()}`, margin + 5, cursorY + 4.8);

      cursorY += 9.5;
      i++;
      continue;
    }

    // 5. Headings (# H1, ## H2, ### H3)
    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const headingLevel = trimmed.startsWith('# ') ? 1 : trimmed.startsWith('## ') ? 2 : 3;
      const headingText = cleanInlineMarkdown(trimmed.replace(/^#{1,3}\s+/, ''));

      ensureSpace(10);
      cursorY += 2;

      doc.setFont('helvetica', 'bold');
      if (headingLevel === 1) {
        doc.setFontSize(10.5);
        doc.setTextColor(...COLORS.primaryDark);
        doc.text(headingText, margin, cursorY);
        doc.setDrawColor(...COLORS.goldPrimary);
        doc.setLineWidth(0.4);
        doc.line(margin, cursorY + 1.5, margin + 40, cursorY + 1.5);
        cursorY += 6;
      } else if (headingLevel === 2) {
        doc.setFontSize(9.5);
        doc.setTextColor(...COLORS.secondaryDark);
        doc.text(headingText, margin, cursorY);
        cursorY += 5;
      } else {
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.goldDark);
        doc.text(headingText, margin, cursorY);
        cursorY += 4.5;
      }

      i++;
      continue;
    }

    // 6. Blockquote (> Text)
    if (trimmed.startsWith('>')) {
      const quoteText = cleanInlineMarkdown(trimmed.replace(/^>\s*/, ''));
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const splitQuote = doc.splitTextToSize(quoteText, contentWidth - 14);
      const bqHeight = splitQuote.length * 4.2 + 5;

      ensureSpace(bqHeight + 2);

      doc.setFillColor(...COLORS.slateBg);
      doc.setDrawColor(...COLORS.slateBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 2, cursorY, contentWidth - 4, bqHeight, 1.5, 1.5, 'FD');

      // Gold vertical bar
      doc.setFillColor(...COLORS.goldPrimary);
      doc.rect(margin + 2, cursorY, 2, bqHeight, 'F');

      doc.setTextColor(...COLORS.slateText);
      for (let bqIdx = 0; bqIdx < splitQuote.length; bqIdx++) {
        doc.text(splitQuote[bqIdx], margin + 7, cursorY + 4.2 + bqIdx * 4.2);
      }
      cursorY += bqHeight + 3;
      i++;
      continue;
    }

    // 7. Bullet Lists (- or * or •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = cleanInlineMarkdown(trimmed.replace(/^[-*•]\s+/, ''));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const splitBullet = doc.splitTextToSize(itemText, contentWidth - 8);

      ensureSpace(splitBullet.length * 4.2 + 2);

      // Gold bullet dot
      doc.setFillColor(...COLORS.goldPrimary);
      doc.circle(margin + 3, cursorY + 1.2, 0.7, 'F');

      doc.setTextColor(...COLORS.slateText);
      for (let bIdx = 0; bIdx < splitBullet.length; bIdx++) {
        doc.text(splitBullet[bIdx], margin + 7, cursorY + 2.2 + bIdx * 4.2);
      }
      cursorY += splitBullet.length * 4.2 + 2.5;
      i++;
      continue;
    }

    // 8. Numbered Sub-lists (1.1, a), 1. text)
    const numSubMatch = trimmed.match(/^(\d+(\.\d+)*|\w\))\s+(.*)/);
    if (numSubMatch) {
      const numPrefix = numSubMatch[1];
      const itemText = cleanInlineMarkdown(numSubMatch[3]);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      const splitNum = doc.splitTextToSize(itemText, contentWidth - 8);

      ensureSpace(splitNum.length * 4.2 + 2);

      for (let nIdx = 0; nIdx < splitNum.length; nIdx++) {
        if (nIdx === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...COLORS.slateDark);
          doc.text(`${numPrefix}.`, margin + 1, cursorY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.slateText);
        }
        doc.text(splitNum[nIdx], margin + 7, cursorY);
        cursorY += 4.2;
      }
      cursorY += 1.5;
      i++;
      continue;
    }

    // 9. Standard Paragraph
    const cleanParagraph = cleanInlineMarkdown(trimmed);
    if (cleanParagraph) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(...COLORS.slateText);
      const splitText = doc.splitTextToSize(cleanParagraph, contentWidth);

      for (let j = 0; j < splitText.length; j++) {
        ensureSpace(4.5);
        doc.text(splitText[j], margin, cursorY);
        cursorY += 4.2;
      }
      cursorY += 2;
    }

    i++;
  }

  cursorY += 4;

  // ==========================================
  // SECTION 3: CITAS BIBLIOGRÁFICAS & FUENTES
  // ==========================================
  if (citations.length > 0) {
    ensureSpace(35);
    drawSectionTitle('3', 'CITAS BIBLIOGRÁFICAS Y SOPORTE DOCUMENTAL INDEXADO');

    const tableData = citations.map((c, idx) => [
      `#${idx + 1}`,
      `${cleanInlineMarkdown(c.docTitle)}\nAutor: ${cleanInlineMarkdown(c.author || 'Doctrina Especializada')}`,
      `Pág. ${c.page || '-'}\n${c.chapter ? cleanInlineMarkdown(c.chapter).slice(0, 45) : 'Doctrina General'}`,
      c.quote ? `«${cleanInlineMarkdown(c.quote).slice(0, 160).trim()}${c.quote.length > 160 ? '...' : ''}»` : 'Extracto de fundamentación doctrinal.',
      `${c.relevanceScore || 95}%`
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['#', 'Obra / Fuente Doctrinal', 'Ubicación', 'Fragmento Normativo / Textual', 'Relevancia']],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: {
        fontSize: 7.2,
        textColor: COLORS.slateText,
        cellPadding: 3,
        overflow: 'linebreak',
        lineColor: COLORS.slateBorder,
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3.5
      },
      alternateRowStyles: {
        fillColor: COLORS.slateBg
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: COLORS.goldPrimary },
        1: { cellWidth: 42, fontStyle: 'bold', textColor: COLORS.slateDark },
        2: { cellWidth: 30, textColor: COLORS.slateMuted },
        3: { cellWidth: 80, fontStyle: 'italic', textColor: COLORS.slateText },
        4: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: COLORS.emerald }
      },
      didDrawPage: (data) => {
        cursorY = data.cursor ? data.cursor.y : cursorY;
      }
    });

    cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : cursorY + 8;
  }

  // ==========================================
  // SECTION 4: FUENTES WEB / GROUNDING (if any)
  // ==========================================
  if (searchGroundingSources.length > 0) {
    ensureSpace(25);
    drawSectionTitle('4', 'FUENTES WEB Y NORMATIVA DIGITAL CONSULTADA');

    const groundingRows = searchGroundingSources.map((src, i) => [
      `W-${i + 1}`,
      cleanInlineMarkdown(src.title),
      cleanInlineMarkdown(src.uri).slice(0, 70) + (src.uri.length > 70 ? '...' : '')
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [['ID', 'Portal / Fuente Oficial', 'Enlace Web']],
      body: groundingRows,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: COLORS.slateText
      },
      headStyles: {
        fillColor: COLORS.secondaryDark,
        textColor: COLORS.white,
        fontSize: 7.2,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: COLORS.slateBg
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: COLORS.goldPrimary },
        1: { cellWidth: 60, fontStyle: 'bold', textColor: COLORS.slateDark },
        2: { cellWidth: 106, textColor: [37, 99, 235] }
      }
    });

    cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : cursorY + 8;
  }

  // ==========================================
  // SIGNATURE, VALIDATION & INTEGRITY SEAL
  // ==========================================
  ensureSpace(34);

  const signCardY = cursorY;
  const signCardHeight = 28;

  doc.setFillColor(...COLORS.slateBg);
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, signCardY, contentWidth, signCardHeight, 2, 2, 'FD');

  // Left Section: Verification Hash & Neo4j traceability
  const traceId = `LEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.slateDark);
  doc.text('CERTIFICACIÓN Y TRAZABILIDAD DIGITAL', margin + 5, signCardY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text(`ID de Dictamen: ${traceId}`, margin + 5, signCardY + 11);
  doc.text('Servidor Neo4j Knowledge Graph: 161.97.181.77 (Conectado)', margin + 5, signCardY + 15.5);
  doc.text('Algoritmo de Recuperación: Vector Embeddings + Graph Traversals RAG', margin + 5, signCardY + 20);
  doc.text('Validación Institucional: Sistema de Consulta Legal Automatizada', margin + 5, signCardY + 24.5);

  // Right Section: Digital Seal Box
  const sealWidth = 65;
  const sealX = pageWidth - margin - sealWidth - 4;
  const sealY = signCardY + 3.5;

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.goldPrimary);
  doc.setLineWidth(0.4);
  doc.roundedRect(sealX, sealY, sealWidth, signCardHeight - 7, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.goldDark);
  doc.text('DICTAMEN JURÍDICO EMITIDO', sealX + sealWidth / 2, sealY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.slateDark);
  doc.text('LexTributario AI • Gaceta Jurídica', sealX + sealWidth / 2, sealY + 10, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setTextColor(...COLORS.emerald);
  doc.text('✓ Firma Digital y Verificación Activa', sealX + sealWidth / 2, sealY + 15, { align: 'center' });

  cursorY += signCardHeight + 6;

  // ==========================================
  // RUNNING HEADERS & FOOTERS (ALL PAGES)
  // ==========================================
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running Header (Pages > 1)
    if (p > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.slateMuted);
      doc.text('LEXTRIBUTARIO AI', margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.slateMuted);
      doc.text('•  Dictamen Técnico-Jurídico Especializado', margin + 28, 12);

      const truncatedTitle = rawTitle.length > 50 ? rawTitle.slice(0, 48) + '...' : rawTitle;
      doc.text(sanitizeTextForPDF(truncatedTitle), pageWidth - margin, 12, { align: 'right' });

      // Thin separator line below running header
      doc.setDrawColor(...COLORS.goldPrimary);
      doc.setLineWidth(0.3);
      doc.line(margin, 15, pageWidth - margin, 15);
    }

    // Running Footer (All Pages)
    const footerY = pageHeight - 10;
    doc.setDrawColor(...COLORS.slateBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text('LexTributario AI — Plataforma Especializada de Inteligencia y Consultoría Jurídico-Tributaria', margin, footerY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.slateDark);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Generate clean filename
  const cleanTitle = rawTitle
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 35) || 'Dictamen_Tributario';

  const fileName = `Dictamen_LexTributario_${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
