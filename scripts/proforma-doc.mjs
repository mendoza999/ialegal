// Generador de PROFORMA comercial IA-LEGAL en Word (.docx, editable).
// Uso: node scripts/proforma-doc.mjs  →  Proforma_IALegal_YYYYMMDD.docx
// Comparte CONFIG con proforma.mjs (PDF).
import fs from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, Footer, PageNumber,
} from 'docx';
import { CONFIG } from './proforma-config.mjs';

const NAVY = '0F172A', CRIMSON = 'BF092F', MUTED = '64748B', WHITE = 'FFFFFF';
const F = 'Calibri';

const title = (t, size = 28, color = NAVY, bold = true) =>
  new Paragraph({ children: [new TextRun({ text: t, font: F, size, bold, color })] });
const h2 = (n, t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text: `${n}. ${t}`, font: F, size: 26, bold: true, color: CRIMSON })],
  spacing: { before: 280, after: 120 },
});
const p = (t, o = {}) => new Paragraph({
  children: [new TextRun({ text: t, font: F, size: o.size || 20, color: o.color || '334155', bold: !!o.bold, italics: !!o.italic })],
  spacing: { after: 100 }, alignment: o.center ? AlignmentType.CENTER : undefined,
});
const bullet = (label, rest) => new Paragraph({
  bullet: { level: 0 },
  children: [
    new TextRun({ text: label + ': ', font: F, size: 20, bold: true, color: '334155' }),
    new TextRun({ text: rest, font: F, size: 20, color: '334155' }),
  ],
  spacing: { after: 60 },
});
const cell = (t, o = {}) => new TableCell({
  width: { size: o.w || 0, type: WidthType.AUTO },
  shading: o.shade ? { fill: o.shade } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text: t, font: F, size: 19, bold: !!o.bold, color: o.color || '334155' })] })],
});
const table = (head, body) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ children: head.map(h => cell(h, { bold: true, color: WHITE, shade: NAVY })) }),
    ...body.map(r => new TableRow({ children: r.map(c => cell(c)) })),
  ],
});

const E = CONFIG.empresa, K = CONFIG.cliente;
const limite = new Date(); limite.setDate(limite.getDate() + CONFIG.vigenciaDias);

const children = [
  title('IA-LEGAL', 36, NAVY),
  p('Especialista Jurídico AI · Algoritmo Jurídico S.A.C.', { color: MUTED }),
  p(E.web, { color: MUTED, size: 18 }),
  title(`PROFORMA N.º ${CONFIG.proformaNro}`, 26, CRIMSON),
  p(`Emisión: ${CONFIG.fecha} · Vigente ${CONFIG.vigenciaDias} días calendario`, { color: MUTED, size: 18 }),

  h2('1', 'DATOS DEL DOCUMENTO'),
  table(['Emisor', 'Detalle'], [
    ['Razón social', E.razon], ['RUC', E.ruc], ['Dirección', E.direccion],
    ['Teléfono / Correo', `${E.telefono} · ${E.correo}`],
    ['Cliente', `${K.nombre} · RUC ${K.ruc}`],
    ['Contacto cliente', `${K.contacto} · ${K.correo}`],
    ['Vigencia de la proforma', `${CONFIG.vigenciaDias} días calendario desde la emisión`],
  ]),

  h2('2', 'DESCRIPCIÓN DEL PRODUCTO'),
  p('IA-LEGAL es una plataforma web de inteligencia artificial especializada en Derecho peruano. Combina un motor de búsqueda jurídica (RAG híbrido: vectores + grafo de conocimiento Neo4j + verificación web en tiempo real) con una base de doctrina indexada y el texto vigente de la normativa nacional, para responder consultas legales con citas verificables y dictámenes descargables en PDF.'),
  p('Acceso 100% web (sin instalación), en español, con modo claro/oscuro y diseño responsive para PC, tablet y celular.'),

  h2('3', 'ALCANCE FUNCIONAL DE LA LICENCIA'),
  bullet('Chat jurídico multi-rama', '5 especialidades (Civil, Constitucional, Laboral, Penal y Tributario) con detección automática de la materia consultada y prompts de especialista por rama.'),
  bullet('Base doctrinal indexada', '48 libros jurídicos con búsqueda híbrida; cada respuesta cita obra, autor, página y capítulo verificables en el visor de PDFs.'),
  bullet('Normativa vigente', 'acceso al texto de leyes y resoluciones (búsqueda semántica, por fechas, por texto y por tipo: Legislación / Jurisprudencia), con fecha de publicación visible en cada cita.'),
  bullet('Verificación web en tiempo real', 'contraste con fuentes oficiales (SUNAT, El Peruano, TC, Poder Judicial) mediante grounding de Google Search.'),
  bullet('Doble control de calidad', 'agente revisor que verifica cada respuesta contra la normativa vigente y aplica correcciones visibles antes de entregar.'),
  bullet('Dictamen PDF ejecutivo', 'exportación de cada respuesta como dictamen con citas, firmas de trazabilidad digital y nota de uso responsable.'),
  bullet('Historial y sesiones', 'conversaciones persistentes organizadas por rama, con filtros por documento y categoría.'),
  bullet('Cuotas de uso', '5 consultas web + 5 de base local por usuario al día (rol administrador ilimitado); acceso de invitados con 2 consultas diarias.'),
  bullet('Panel de administración', 'gestión de usuarios y roles, control de límites, bitácora de accesos y auditoría, estadísticas de visitas, buzón de feedback y alertas normativas.'),
  bullet('Seguridad', 'autenticación con control de sesiones concurrentes, roles (administrador / usuario) y registro de actividad.'),

  h2('4', 'PLANES Y PRECIOS'),
  table(['Plan', 'Usuarios', 'Cuota diaria', 'Precio mensual', 'Precio anual'], CONFIG.planes),
  p(`Moneda: ${CONFIG.moneda}. Los montos marcados [COMPLETAR] se definen a la firma de la cotización. Descuentos por pago anual y por volumen institucional a tratar.`, { size: 17, color: MUTED, italic: true }),

  h2('5', 'CONDICIONES COMERCIALES'),
  bullet('Vigencia', `esta proforma y sus precios son válidos por ${CONFIG.vigenciaDias} días calendario.`),
  bullet('Forma de pago', '[COMPLETAR] (transferencia / depósito en cuenta). La activación se realiza dentro de las 24-48 horas hábiles posteriores al pago.'),
  bullet('Facturación', 'comprobante electrónico con IGV discriminado.'),
  bullet('Renovación', 'mensual o anual según el plan; la falta de pago suspende el acceso conservando el historial por 30 días.'),
  bullet('Soporte incluido', 'mesa de ayuda por correo electrónico en horario laboral (respuesta en 24 h hábiles) y actualizaciones de la plataforma.'),

  h2('6', 'REQUERIMIENTOS TÉCNICOS'),
  p('Solo se necesita un navegador moderno (Chrome, Edge, Firefox o Safari) con acceso a internet. No requiere instalación, servidores ni licencias de terceros por parte del cliente.'),

  h2('7', 'EXCLUSIONES (NO INCLUIDO EN LA LICENCIA)'),
  bullet('Instalación on-premise', 'o en infraestructura propia del cliente (se cotiza por separado).'),
  bullet('Servicios profesionales', 'capacitaciones presenciales, personalizaciones, integraciones a medida o migración de contenidos: se cotizan por separado.'),
  bullet('Asesoría legal profesional', 'la plataforma es una herramienta de apoyo y no sustituye el criterio del abogado (ver nota de uso responsable en cada respuesta).'),

  h2('8', 'ACEPTACIÓN'),
  p('El cliente acepta la presente proforma y solicita la activación del plan: ____________________  por el período: ____________________.'),
  p(' ', {}),
  p('__________________________                        __________________________', {}),
  p('El proveedor (firma y sello)                                           El cliente (firma, nombre y DNI)', { size: 18, color: MUTED }),
];

const footer = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `IA-LEGAL · ${E.razon} · Proforma ${CONFIG.proformaNro} · Válida hasta el ${limite.toLocaleDateString('es-PE')} · Pág. `, font: F, size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: F, size: 16, color: MUTED })],
  })],
});

const file = new Document({
  sections: [{ children, footers: { default: footer } }],
  title: `Proforma IA-LEGAL ${CONFIG.proformaNro}`,
  creator: E.razon,
});

const fname = `Proforma_IALegal_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.docx`;
const buf = await Packer.toBuffer(file);
fs.writeFileSync(fname, buf);
console.log('OK:', fname, Math.round(buf.length / 1024) + 'KB');
