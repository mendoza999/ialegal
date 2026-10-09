// Datos compartidos de la proforma IA-LEGAL (los usan proforma.mjs y proforma-doc.mjs).
export const CONFIG = {
  proformaNro: '[COMPLETAR]',
  fecha: new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }),
  vigenciaDias: 15,
  empresa: {
    razon: 'Algoritmo Jurídico S.A.C.',
    ruc: '[COMPLETAR]',
    direccion: '[COMPLETAR]',
    telefono: '[COMPLETAR]',
    correo: '[COMPLETAR]',
    web: 'servicios.algoritmojuridico.com/ialegal/',
  },
  cliente: { nombre: '[COMPLETAR]', ruc: '[COMPLETAR]', contacto: '[COMPLETAR]', correo: '[COMPLETAR]' },
  // Precios en soles. [COMPLETAR] hasta definirlos.
  planes: [
    ['Profesional', '1 usuario', '5 web + 5 base local / día', '[COMPLETAR]', '[COMPLETAR]'],
    ['Corporativo', 'Hasta 10 usuarios', '5 web + 5 base local / día c/u', '[COMPLETAR]', '[COMPLETAR]'],
    ['Institucional', 'Usuarios ilimitados', 'Límites ampliados + admin dedicado', '[COMPLETAR]', '[COMPLETAR]'],
  ],
  moneda: 'Soles (PEN), más IGV',
};
