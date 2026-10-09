// Generador de PROFORMA comercial IA-LEGAL (reutilizable).
// Uso: node scripts/proforma.mjs  →  Proforma_IALegal_YYYYMMDD.pdf
// Edita CONFIG (precios, cliente, vigencia) y regenera.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'node:fs';
import { CONFIG } from './proforma-config.mjs';

const C = {
  navy: [15, 23, 42], crimson: [191, 9, 47], gold: [217, 119, 6],
  slate: [51, 65, 85], muted: [100, 116, 139], light: [248, 250, 252],
  border: [226, 232, 240], white: [255, 255, 255], emerald: [5, 150, 105],
};

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const W = doc.internal.pageSize.getWidth();
const M = 16, CW = W - M * 2;
let y = 0;
const need = (h) => { if (y + h > 277) { doc.addPage(); y = 22; } };

function header() {
  doc.setFillColor(...C.navy); doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(...C.crimson); doc.rect(0, 30, W, 2.5, 'F');
  doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text('IA-LEGAL', M, 13);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(203, 213, 225);
  doc.text('Especialista Jurídico AI · Algoritmo Jurídico S.A.C.', M, 19);
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(CONFIG.empresa.web, M, 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.gold);
  doc.text('PROFORMA', W - M, 13, { align: 'right' });
  doc.setFontSize(8); doc.setTextColor(...C.white);
  doc.text(`N.º ${CONFIG.proformaNro}`, W - M, 19, { align: 'right' });
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Emisión: ${CONFIG.fecha}`, W - M, 24, { align: 'right' });
  y = 40;
}
function h2(num, title) {
  need(16);
  doc.setFillColor(...C.crimson); doc.rect(M, y, 3, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.navy);
  doc.text(`${num}. ${title}`, M + 6, y + 4.8); y += 9;
}
function para(text, opts = {}) {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.size || 9); doc.setTextColor(...(opts.color || C.slate));
  const lines = doc.splitTextToSize(text, CW - (opts.indent || 0));
  for (const ln of lines) { need(5); doc.text(ln, M + (opts.indent || 0), y); y += 4.6; }
  y += 1.5;
}
function bullets(items) {
  for (const it of items) {
    const label = it.split(':')[0];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.slate);
    const lines = doc.splitTextToSize(it, CW - 8);
    need(lines.length * 4.6 + 2);
    doc.setFillColor(...C.crimson); doc.circle(M + 2, y - 1, 0.8, 'F');
    doc.text(lines[0], M + 6, y);
    // negrita en el encabezado del bullet
    if (it.includes(':')) {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', M + 6, y);
    }
    for (let i = 1; i < lines.length; i++) { y += 4.6; doc.setFont('helvetica', 'normal'); doc.text(lines[i], M + 6, y); }
    y += 5.2;
  }
  y += 1;
}
function table(head, body, widths) {
  need(20);
  autoTable(doc, {
    startY: y, head: [head], body,
    margin: { left: M, right: M }, theme: 'grid',
    styles: { fontSize: 8.5, textColor: C.slate, cellPadding: 2.6, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: widths,
    didDrawPage: (d) => { y = d.cursor ? d.cursor.y : y; },
  });
  y = doc.lastAutoTable.finalY + 5;
}

header();

// 1. Datos
h2('1', 'DATOS DEL DOCUMENTO');
table(['Emisor', 'Detalle'],
  [
    ['Razón social', CONFIG.empresa.razon],
    ['RUC', CONFIG.empresa.ruc],
    ['Dirección', CONFIG.empresa.direccion],
    ['Teléfono / Correo', `${CONFIG.empresa.telefono} · ${CONFIG.empresa.correo}`],
    ['Cliente', `${CONFIG.cliente.nombre} · RUC ${CONFIG.cliente.ruc}`],
    ['Contacto cliente', `${CONFIG.cliente.contacto} · ${CONFIG.cliente.correo}`],
    ['Vigencia de la proforma', `${CONFIG.vigenciaDias} días calendario desde la emisión`],
  ], { 0: { cellWidth: 52, fontStyle: 'bold' } });

// 2. Producto
h2('2', 'DESCRIPCIÓN DEL PRODUCTO');
para('IA-LEGAL es una plataforma web de inteligencia artificial especializada en Derecho peruano. Combina un motor de búsqueda jurídica (RAG híbrido: vectores + grafo de conocimiento Neo4j + verificación web en tiempo real) con una base de doctrina indexada y el texto vigente de la normativa nacional, para responder consultas legales con citas verificables y dictámenes descargables en PDF.');
para('Acceso 100% web (sin instalación), en español, con modo claro/oscuro y diseño responsive para PC, tablet y celular.');

// 3. Alcance funcional
h2('3', 'ALCANCE FUNCIONAL DE LA LICENCIA');
bullets([
  'Chat jurídico multi-rama: 5 especialidades (Civil, Constitucional, Laboral, Penal y Tributario) con detección automática de la materia consultada y prompts de especialista por rama.',
  'Base doctrinal indexada: 48 libros jurídicos con búsqueda híbrida; cada respuesta cita obra, autor, página y capítulo verificables en el visor de PDFs.',
  'Normativa vigente: acceso al texto de leyes y resoluciones (búsqueda semántica, por fechas, por texto y por tipo: Legislación / Jurisprudencia), con fecha de publicación visible en cada cita.',
  'Verificación web en tiempo real: contraste con fuentes oficiales (SUNAT, El Peruano, TC, Poder Judicial) mediante grounding de Google Search.',
  'Doble control de calidad: agente revisor que verifica cada respuesta contra la normativa vigente y aplica correcciones visibles antes de entregar.',
  'Dictamen PDF ejecutivo: exportación de cada respuesta como dictamen con citas, firmas de trazabilidad digital y nota de uso responsable.',
  'Historial y sesiones: conversaciones persistentes organizadas por rama, con filtros por documento y categoría.',
  'Cuotas de uso: 5 consultas web + 5 de base local por usuario al día (rol administrador ilimitado); acceso de invitados con 2 consultas diarias.',
  'Panel de administración: gestión de usuarios y roles, control de límites, bitácora de accesos y auditoría, estadísticas de visitas, buzón de feedback y alertas normativas.',
  'Seguridad: autenticación con control de sesiones concurrentes, roles (administrador / usuario) y registro de actividad.',
]);

// 4. Planes
h2('4', 'PLANES Y PRECIOS');
table(['Plan', 'Usuarios', 'Cuota diaria', 'Precio mensual', 'Precio anual'],
  CONFIG.planes, { 0: { fontStyle: 'bold' } });
para(`Moneda: ${CONFIG.moneda}. Los montos marcados [COMPLETAR] se definen a la firma de la cotización. Descuentos por pago anual y por volumen institucional a tratar.`, { size: 8, color: C.muted });

// 5. Condiciones
h2('5', 'CONDICIONES COMERCIALES');
bullets([
  `Vigencia: esta proforma y sus precios son válidos por ${CONFIG.vigenciaDias} días calendario.`,
  'Forma de pago: [COMPLETAR] (transferencia / depósito en cuenta). La activación se realiza dentro de las 24-48 horas hábiles posteriores al pago.',
  'Facturación: comprobante electrónico con IGV discriminado.',
  'Renovación: mensual o anual según el plan; la falta de pago suspende el acceso conservando el historial por 30 días.',
  'Soporte incluido: mesa de ayuda por correo electrónico en horario laboral (respuesta en 24 h hábiles) y actualizaciones de la plataforma.',
]);

// 6. Requerimientos y exclusiones
h2('6', 'REQUERIMIENTOS TÉCNICOS');
para('Solo se necesita un navegador moderno (Chrome, Edge, Firefox o Safari) con acceso a internet. No requiere instalación, servidores ni licencias de terceros por parte del cliente.');
h2('7', 'EXCLUSIONES (NO INCLUIDO EN LA LICENCIA)');
bullets([
  'Instalación on-premise o en infraestructura propia del cliente.',
  'Capacitaciones presenciales, personalizaciones, integraciones a medida o migración de contenidos: se cotizan por separado.',
  'Asesoría legal profesional: la plataforma es una herramienta de apoyo y no sustituye el criterio del abogado (ver nota de uso responsable en cada respuesta).',
]);

// 8. Aceptación
h2('8', 'ACEPTACIÓN');
need(30);
para('El cliente acepta la presente proforma y solicita la activación del plan: ____________________  por el período: ____________________.');
y += 6; need(24);
doc.setFontSize(9); doc.setTextColor(...C.slate);
doc.text('__________________________                        __________________________', M, y);
doc.text('El proveedor                                                            El cliente', M, y + 5);
doc.setFontSize(8); doc.setTextColor(...C.muted);
doc.text('Firma y sello                                                            Firma, nombre y DNI', M, y + 10);

// Footer + fecha vigencia
const n = doc.getNumberOfPages();
const limite = new Date(); limite.setDate(limite.getDate() + CONFIG.vigenciaDias);
for (let p = 1; p <= n; p++) {
  doc.setPage(p);
  doc.setFontSize(7); doc.setTextColor(...C.muted);
  doc.text(`IA-LEGAL · ${CONFIG.empresa.razon} · Proforma ${CONFIG.proformaNro} · Válida hasta el ${limite.toLocaleDateString('es-PE')}`, M, 290);
  doc.text(`Pág. ${p} de ${n}`, W - M, 290, { align: 'right' });
}

const fname = `Proforma_IALegal_${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.pdf`;
fs.writeFileSync(fname, Buffer.from(doc.output('arraybuffer')));
console.log('OK:', fname);
