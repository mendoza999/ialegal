import fs from 'fs';
import path from 'path';
import { TaxDocument, DocumentChunk, GraphNode, GraphLink } from '../src/types';

// Preloaded library of Tax Law books and treatises (Derecho Tributario)
export const TRIBUTARIO_RAMA_ID = 'f5fa96ce-2733-44df-914a-c298aab14215';

export const INITIAL_TAX_DOCUMENTS: TaxDocument[] = [
  {
    id: 'doc-ct-01',
    title: 'Código Tributario Comentado y Concordado',
    author: 'Dr. Jorge Bravo Cucci & Instituto Peruano de Derecho Tributario (IPDT)',
    year: 2024,
    ramaId: TRIBUTARIO_RAMA_ID,
    category: 'codigo_tributario',
    categoryLabel: 'Código Tributario',
    totalPages: 580,
    fileSize: '14.2 MB',
    driveUrl: 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link',
    chunksCount: 124,
    entitiesCount: 68,
    status: 'indexed',
    uploadDate: '2026-08-15',
    description: 'Análisis exegético del Título Preliminar, Norma XVI (Cláusula Antielusiva General), Obligación Tributaria, Procedimientos de Cobranza Coactiva y Fiscalización.',
    tags: ['Código Tributario', 'Norma XVI', 'Elusión Fiscal', 'SUNAT', 'Fiscalización', 'Prescripción']
  },
  {
    id: 'doc-ir-02',
    title: 'Tratado del Impuesto a la Renta: Teoría del Hecho Imponible y Gastos Deducibles',
    author: 'Dr. Humberto Medrano Cornejo & Dra. Walker Rivera',
    year: 2023,
    ramaId: TRIBUTARIO_RAMA_ID,
    category: 'impuesto_renta',
    categoryLabel: 'Impuesto a la Renta',
    totalPages: 720,
    fileSize: '18.8 MB',
    driveUrl: 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link',
    chunksCount: 165,
    entitiesCount: 84,
    status: 'indexed',
    uploadDate: '2026-08-16',
    description: 'Estudio integral de la teoría del devengo jurídico (Art. 57 LIR), Principio de Causalidad (Art. 37 LIR), precios de transferencia y rentas de 1ra a 5ta categoría.',
    tags: ['Impuesto a la Renta', 'Devengo', 'Principio de Causalidad', 'Gastos Deducibles', 'Renta Neta']
  },
  {
    id: 'doc-igv-03',
    title: 'Manual Práctico del IGV e Imposición al Consumo',
    author: 'Dra. Carmen del Pilar Robles Moreno',
    year: 2024,
    ramaId: TRIBUTARIO_RAMA_ID,
    category: 'igv_iva',
    categoryLabel: 'IGV / IVA e Imposición al Consumo',
    totalPages: 440,
    fileSize: '11.5 MB',
    driveUrl: 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link',
    chunksCount: 98,
    entitiesCount: 52,
    status: 'indexed',
    uploadDate: '2026-08-18',
    description: 'Nacimiento de la obligación en venta de bienes y prestación de servicios, crédito fiscal, prorrata, sistema de detracciones (SPOT), retenciones y percepciones.',
    tags: ['IGV', 'Crédito Fiscal', 'Nacimiento Obligación', 'Detracciones SPOT', 'Prorrata']
  },
  {
    id: 'doc-proc-04',
    title: 'Procedimiento Contencioso Tributario y Jurisprudencia Relevante del Tribunal Fiscal',
    author: 'Dr. Francisco Escribano & Asociación Fiscal Iberoamericana',
    year: 2024,
    ramaId: TRIBUTARIO_RAMA_ID,
    category: 'procedimientos',
    categoryLabel: 'Procedimientos y Litigio Tributario',
    totalPages: 610,
    fileSize: '15.9 MB',
    driveUrl: 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link',
    chunksCount: 142,
    entitiesCount: 76,
    status: 'indexed',
    uploadDate: '2026-08-19',
    description: 'Guía procesal sobre Recurso de Reclamación ante SUNAT, Apelación ante Tribunal Fiscal, Queja por vulneración al debido proceso y Proceso Contencioso Administrativo.',
    tags: ['Tribunal Fiscal', 'Reclamación', 'Apelación', 'RTF', 'Debido Proceso', 'Queja']
  },
  {
    id: 'doc-const-05',
    title: 'Derecho Constitucional Tributario y Garantías del Contribuyente',
    author: 'Dr. César Landa Arroyo & Dr. Marcial Rubio Correa',
    year: 2023,
    ramaId: TRIBUTARIO_RAMA_ID,
    category: 'constitucional',
    categoryLabel: 'Derecho Constitucional Tributario',
    totalPages: 390,
    fileSize: '9.7 MB',
    driveUrl: 'https://drive.google.com/drive/folders/1iyYrvLg--yTYmR3zrVPlUOiPh2Tr6RTL?usp=drive_link',
    chunksCount: 88,
    entitiesCount: 45,
    status: 'indexed',
    uploadDate: '2026-08-20',
    description: 'Límites a la potestad tributaria del Estado: Principio de Reserva de Ley, Legalidad, Igualdad tributaria, No Confiscatoriedad y jurisprudencia del Tribunal Constitucional.',
    tags: ['Constitucional', 'No Confiscatoriedad', 'Reserva de Ley', 'Capacidad Contributiva', 'TC']
  }
];

// Rich Chunks corpus from Tax Law documents with precise pages, chapters and legal references
export const INITIAL_CHUNKS: DocumentChunk[] = [
  {
    id: 'chunk-ct-001',
    docId: 'doc-ct-01',
    docTitle: 'Código Tributario Comentado y Concordado',
    author: 'Dr. Jorge Bravo Cucci',
    page: 45,
    chapter: 'Título Preliminar - Principios Generales',
    section: 'Norma XVI: Cláusula Antielusiva General y Calificación de Hechos',
    text: `La Norma XVI del Título Preliminar faculta a la SUNAT a aplicar la Cláusula Antielusiva General cuando se detecten actos artificiosos o impropios cuya única finalidad haya sido evitar total o parcialmente la realización del hecho imponible o disminuir la base imponible o la deuda tributaria. Para la aplicación del párrafo cuarto y quinto (elusión impropia y formal), es exigible la existencia de un informe previo emitido por un Comité Revisor colegiado. El estándar probatorio exige que la administración demuestre que no existen motivos económicos o comerciales sustanciales distintos al ahorro fiscal para la estructura adoptada por el deudor tributario.`,
    entities: ['Norma XVI', 'Cláusula Antielusiva', 'SUNAT', 'Comité Revisor', 'Ahorro Fiscal', 'Economía de Opción'],
    articlesReferenced: ['Norma XVI del T.P. del Código Tributario', 'D.S. 133-2013-EF']
  },
  {
    id: 'chunk-ct-002',
    docId: 'doc-ct-01',
    docTitle: 'Código Tributario Comentado y Concordado',
    author: 'Dr. Jorge Bravo Cucci',
    page: 112,
    chapter: 'Libro Primero - La Obligación Tributaria',
    section: 'Artículo 43 y 44: Cómputo del Plazo de Prescripción',
    text: `La acción de la Administración Tributaria para determinar la obligación tributaria, exigir su pago y aplicar sanciones prescribe a los cuatro (4) años para quienes hayan presentado la declaración jurada, y a los seis (6) años para quienes no la hayan presentado. Tratándose de tributos retenidos o percibidos, el plazo de prescripción es de diez (10) años. El término prescriptorio se computa desde el uno (1) de enero siguiente a la fecha en que vence el plazo para la presentación de la declaración anual respectiva, o desde que la obligación sea exigible tratándose de tributos liquidados por el deudor. Los actos de interrupción y suspensión se encuentran taxativamente enumerados en los artículos 45 y 46 del Código Tributario.`,
    entities: ['Prescripción Tributaria', 'Plazos de Prescripción', 'Interrupción', 'Suspensión', 'SUNAT'],
    articlesReferenced: ['Artículo 43 Código Tributario', 'Artículo 44 Código Tributario', 'Artículo 45 Código Tributario']
  },
  {
    id: 'chunk-ir-001',
    docId: 'doc-ir-02',
    docTitle: 'Tratado del Impuesto a la Renta',
    author: 'Dr. Humberto Medrano Cornejo',
    page: 88,
    chapter: 'Capítulo IV - Criterios de Imputación de Rentas y Gastos',
    section: 'Artículo 57 LIR: El Principio del Devengo Jurídico Tributario',
    text: `A partir de la reforma del Decreto Legislativo N° 1425, el artículo 57 de la Ley del Impuesto a la Renta introdujo una definición legal y positiva del principio de devengo. Las rentas de tercera categoría se entienden devengadas cuando se han producido los hechos sustanciales para su generación, siempre que el derecho a obtenerlas o la obligación de pagarlas no esté sujeto a una condición suspensiva, independientemente de la oportunidad en que se cobren o paguen y aun cuando no se hubiere fijado los términos precisos para su cobro. En la prestación de servicios de ejecución continuada en el tiempo, el devengo se reconoce a lo largo del plazo de ejecución en función del grado de realización o cumplimiento.`,
    entities: ['Principio de Devengo', 'Devengo Jurídico', 'Artículo 57 LIR', 'Condición Suspensiva', 'Rentas de Tercera Categoría', 'Servicios Continuados'],
    articlesReferenced: ['Artículo 57 TUO Ley Impuesto a la Renta', 'D. Leg. 1425']
  },
  {
    id: 'chunk-ir-002',
    docId: 'doc-ir-02',
    docTitle: 'Tratado del Impuesto a la Renta',
    author: 'Dr. Humberto Medrano Cornejo',
    page: 215,
    chapter: 'Capítulo VI - Determinación de la Renta Neta Imponible',
    section: 'Artículo 37 LIR: Principio de Causalidad y Gastos Deducibles',
    text: `El Principio de Causalidad contemplado en el artículo 37 de la LIR postula que a fin de establecer la renta neta de tercera categoría se deducirá de la renta bruta los gastos necesarios para producirla y mantener su fuente productora, así como los vinculados con la generación de ganancias de capital. La jurisprudencia del Tribunal Fiscal (RTF N° 01281-4-2020 y RTF N° 04845-5-2017) ha sentado de manera uniforme que para que un gasto sea deducible debe cumplir concurrentemente con los criterios de: a) Razonabilidad, b) Proporcionalidad en relación con el volumen de ingresos, c) Generalidad (tratándose de retribuciones al personal), y d) Fehaciencia probatoria (medios de pago y sustento documental fehaciente).`,
    entities: ['Principio de Causalidad', 'Gastos Deducibles', 'Artículo 37 LIR', 'Fehaciencia', 'Razonabilidad', 'Generalidad'],
    articlesReferenced: ['Artículo 37 TUO Ley Impuesto a la Renta', 'RTF 01281-4-2020', 'RTF 04845-5-2017']
  },
  {
    id: 'chunk-ir-003',
    docId: 'doc-ir-02',
    docTitle: 'Tratado del Impuesto a la Renta',
    author: 'Dra. Walker Rivera',
    page: 340,
    chapter: 'Capítulo IX - Gastos Sujetos a Límite y No Deducibles',
    section: 'Artículo 44 LIR: Gastos Recreativos, Representación y Vehículos de Dirección',
    text: `El artículo 44 de la LIR prohíbe la deducción de gastos personales del contribuyente o de sus accionistas. Los gastos de representación son deducibles únicamente hasta el límite del 0.5% de los ingresos brutos con un tope de 40 UIT. Asimismo, los gastos en vehículos automotores asignados a actividades de dirección, administración y representación solo son deducibles si el valor de adquisición no supera las 30 UIT y dentro de la escala máxima según el volumen de ingresos netos anuales establecido en el Reglamento de la LIR. Todo gasto sin medio de pago bancarizado en los términos de la Ley N° 28194 deviene en no deducible de pleno derecho.`,
    entities: ['Gastos No Deducibles', 'Gastos de Representación', 'Vehículos de Dirección', 'Bancarización', 'Ley 28194'],
    articlesReferenced: ['Artículo 44 Ley Impuesto a la Renta', 'Ley 28194 Ley para la Lucha contra la Evasión']
  },
  {
    id: 'chunk-igv-001',
    docId: 'doc-igv-03',
    docTitle: 'Manual Práctico del IGV e Imposición al Consumo',
    author: 'Dra. Carmen del Pilar Robles Moreno',
    page: 62,
    chapter: 'Capítulo II - Ámbito de Aplicación y Hecho Generador',
    section: 'Artículo 1 y 2: Operaciones Gravadas con el IGV',
    text: `El Impuesto General a las Ventas grava: a) La venta en el país de bienes muebles; b) La prestación o utilización de servicios en el país; c) Los contratos de construcción; d) La primera venta de inmuebles que realicen los constructores; y e) La importación de bienes. La obligación tributaria nace en la fecha en que se emita el comprobante de pago o en la fecha en que se entregue el bien o se perciba la retribución, lo que ocurra primero. En la prestación de servicios, el hecho imponible se configura con la percepción del pago o la culminación del servicio conforme a lo pactado.`,
    entities: ['Hecho Generador IGV', 'Operaciones Gravadas', 'Nacimiento de Obligación', 'Comprobante de Pago', 'Utilización de Servicios'],
    articlesReferenced: ['Artículo 1 Ley del IGV', 'Artículo 2 Ley del IGV', 'Artículo 4 Ley del IGV']
  },
  {
    id: 'chunk-igv-002',
    docId: 'doc-igv-03',
    docTitle: 'Manual Práctico del IGV e Imposición al Consumo',
    author: 'Dra. Carmen del Pilar Robles Moreno',
    page: 148,
    chapter: 'Capítulo IV - Crédito Fiscal y Prorrata',
    section: 'Artículo 18 y 19: Requisitos Sustanciales y Formales del Crédito Fiscal',
    text: `Para ejercer el derecho al crédito fiscal del IGV, se deben cumplir dos requisitos sustanciales esenciales (Art. 18): 1) Que las adquisiciones sean permitidas como gasto o costo de la empresa de acuerdo con la legislación del Impuesto a la Renta, aun cuando el contribuyente no esté afecto a este último impuesto; y 2) Que se destinen a operaciones por las que se deba pagar el impuesto. Los requisitos formales (Art. 19) exigen comprobante de pago debidamente emitido, consignación del impuesto de manera discriminada, anotación en el Registro de Compras dentro del plazo legal y que el pago haya sido canalizado a través de Medios de Pago autorizados si supera el umbral legal.`,
    entities: ['Crédito Fiscal', 'Requisitos Sustanciales', 'Requisitos Formales', 'Registro de Compras', 'Prorrata IGV'],
    articlesReferenced: ['Artículo 18 Ley del IGV', 'Artículo 19 Ley del IGV', 'D.S. 029-94-EF']
  },
  {
    id: 'chunk-proc-001',
    docId: 'doc-proc-04',
    docTitle: 'Procedimiento Contencioso Tributario y Jurisprudencia Relevante',
    author: 'Dr. Francisco Escribano',
    page: 78,
    chapter: 'Título II - Recursos Administrativos Tributarios',
    section: 'Artículos 135 al 146: Recurso de Reclamación y Apelación',
    text: `El Procedimiento Contencioso Tributario consta de dos etapas administrativas: la Reclamación ante el órgano administrador (SUNAT o Gobiernos Locales) y la Apelación ante el Tribunal Fiscal. El plazo para interponer Reclamación contra Resoluciones de Determinación o de Multa es de veinte (20) días hábiles computados desde el día hábil siguiente a su notificación. Vencido dicho plazo, procede la reclamación previa acreditación del pago de la totalidad de la deuda o presentación de carta fianza bancaria. El Tribunal Fiscal constituye la última instancia administrativa nacional y sus Resoluciones de Observancia Obligatoria (RTF precedentes vinculantes) fijan jurisprudencia obligatoria para toda la administración pública tributaria.`,
    entities: ['Reclamación Tributaria', 'Apelación Tribunal Fiscal', 'Plazo de Impugnación', 'Carta Fianza', 'RTF Observancia Obligatoria'],
    articlesReferenced: ['Artículo 135 Código Tributario', 'Artículo 137 Código Tributario', 'Artículo 154 Código Tributario']
  },
  {
    id: 'chunk-const-001',
    docId: 'doc-const-05',
    docTitle: 'Derecho Constitucional Tributario y Garantías del Contribuyente',
    author: 'Dr. César Landa Arroyo',
    page: 54,
    chapter: 'Capítulo II - Principios Constitucionales Tributarios',
    section: 'Artículo 74 de la Constitución: Reserva de Ley y No Confiscatoriedad',
    text: `El artículo 74 de la Constitución Política del Perú establece que los tributos se crean, modifican o derogan, o se establece una exoneración, exclusivamente por ley o decreto legislativo en caso de delegación de facultades. El Tribunal Constitucional, en reiterada jurisprudencia (STC N° 0048-2004-AI/TC y STC N° 0053-2004-AI/TC), ha definido que el principio de No Confiscatoriedad protege la propiedad y el patrimonio del contribuyente frente a exacciones fiscales desmedidas que absorban una parte sustancial de la renta o del capital. La confiscatoriedad puede ser cualitativa (cuando se vulneran otros principios o garantías formales) o cuantitativa (cuando la alícuota o efecto económico total resulta desproporcionado respecto a la real capacidad contributiva).`,
    entities: ['Artículo 74 Constitución', 'Principio de Reserva de Ley', 'No Confiscatoriedad', 'Capacidad Contributiva', 'Tribunal Constitucional'],
    articlesReferenced: ['Artículo 74 Constitución Política', 'STC 0048-2004-AI/TC', 'STC 0053-2004-AI/TC']
  }
];

// Initial Knowledge Graph nodes for Neo4j synchronization & GraphRAG
export const INITIAL_GRAPH_NODES: GraphNode[] = [
  { id: 'book-ct', label: 'Book', name: 'Código Tributario Comentado', properties: { year: 2024, author: 'Dr. Jorge Bravo Cucci' } },
  { id: 'book-ir', label: 'Book', name: 'Tratado del Impuesto a la Renta', properties: { year: 2023, author: 'Dr. Humberto Medrano' } },
  { id: 'book-igv', label: 'Book', name: 'Manual Práctico del IGV', properties: { year: 2024, author: 'Dra. Carmen Robles' } },
  { id: 'book-proc', label: 'Book', name: 'Procedimiento Contencioso Tributario', properties: { year: 2024, author: 'Dr. Francisco Escribano' } },
  { id: 'book-const', label: 'Book', name: 'Derecho Constitucional Tributario', properties: { year: 2023, author: 'Dr. César Landa' } },

  { id: 'law-ct', label: 'Law', name: 'TUO del Código Tributario D.S. 133-2013-EF', properties: { legalBasis: 'Decreto Supremo 133-2013-EF' } },
  { id: 'law-lir', label: 'Law', name: 'TUO de la Ley del Impuesto a la Renta D.S. 179-2004-EF', properties: { legalBasis: 'D.S. 179-2004-EF y D. Leg. 1425' } },
  { id: 'law-ligv', label: 'Law', name: 'TUO de la Ley del IGV e ISC D.S. 055-99-EF', properties: { legalBasis: 'D.S. 055-99-EF' } },
  { id: 'law-const', label: 'Law', name: 'Constitución Política del Perú 1993 - Art. 74', properties: { legalBasis: 'Artículo 74 Constitución' } },

  { id: 'art-norma16', label: 'Article', name: 'Norma XVI: Cláusula Antielusiva General', properties: { summary: 'Calificación de actos elusivos y comité revisor SUNAT' } },
  { id: 'art-57-lir', label: 'Article', name: 'Art. 57 LIR: Devengo Jurídico', properties: { summary: 'Hechos sustanciales y ausencia de condición suspensiva' } },
  { id: 'art-37-lir', label: 'Article', name: 'Art. 37 LIR: Principio de Causalidad', properties: { summary: 'Deducción de gastos necesarios para mantener la fuente' } },
  { id: 'art-44-lir', label: 'Article', name: 'Art. 44 LIR: Gastos No Deducibles', properties: { summary: 'Gastos personales y límites a representación y vehículos' } },
  { id: 'art-18-igv', label: 'Article', name: 'Art. 18 LIGV: Requisitos Sustanciales Crédito Fiscal', properties: { summary: 'Destino a operaciones gravadas y condición de costo/gasto' } },
  { id: 'art-19-igv', label: 'Article', name: 'Art. 19 LIGV: Requisitos Formales Crédito Fiscal', properties: { summary: 'Comprobante de pago, registro de compras y bancarización' } },
  { id: 'art-135-ct', label: 'Article', name: 'Art. 135 CT: Recurso de Reclamación', properties: { summary: 'Impugnación administrativa ante SUNAT en plazo de 20 días' } },
  { id: 'art-74-const', label: 'Article', name: 'Art. 74 Const: Potestad Tributaria', properties: { summary: 'Reserva de ley, igualdad y no confiscatoriedad' } },

  { id: 'conc-devengo', label: 'Concept', name: 'Devengo Tributario', properties: { definition: 'Reconocimiento temporal de ingresos y gastos sin sujeción a condición suspensiva.' } },
  { id: 'conc-causalidad', label: 'Concept', name: 'Principio de Causalidad', properties: { definition: 'Relación de necesidad lógica y económica entre el gasto incurrido y la generación de renta neta.' } },
  { id: 'conc-antielusion', label: 'Concept', name: 'Cláusula Antielusiva General', properties: { definition: 'Mecanismo legal para desconocer ventajas tributarias indebidas obtenidas mediante artificios.' } },
  { id: 'conc-creditofiscal', label: 'Concept', name: 'Crédito Fiscal del IGV', properties: { definition: 'Deducción del impuesto pagado en adquisiciones de bienes y servicios gravados.' } },
  { id: 'conc-noconfiscatorio', label: 'Concept', name: 'Principio de No Confiscatoriedad', properties: { definition: 'Límite sustantivo que prohíbe exacciones tributarias que absorban sustancialmente la riqueza o el capital.' } },
  { id: 'conc-fehaciencia', label: 'Concept', name: 'Fehaciencia Probatoria del Gasto', properties: { definition: 'Acreditación material y fáctica de la real ejecución de operaciones mediante medios de prueba idóneos.' } },

  { id: 'juris-rtf-causalidad', label: 'Jurisprudence', name: 'RTF N° 01281-4-2020', properties: { summary: 'Criterio uniforme sobre causalidad, proporcionalidad y necesidad del gasto.' } },
  { id: 'juris-tc-confiscatorio', label: 'Jurisprudence', name: 'STC N° 0048-2004-AI/TC', properties: { summary: 'Precedente vinculante sobre límites a la confiscatoriedad cuantitativa y cualitativa.' } }
];

export const INITIAL_GRAPH_LINKS: GraphLink[] = [
  { source: 'book-ct', target: 'law-ct', type: 'CITES' },
  { source: 'book-ir', target: 'law-lir', type: 'CITES' },
  { source: 'book-igv', target: 'law-ligv', type: 'CITES' },
  { source: 'book-proc', target: 'law-ct', type: 'CITES' },
  { source: 'book-const', target: 'law-const', type: 'CITES' },

  { source: 'law-ct', target: 'art-norma16', type: 'CONTAINS' },
  { source: 'law-ct', target: 'art-135-ct', type: 'CONTAINS' },
  { source: 'law-lir', target: 'art-57-lir', type: 'CONTAINS' },
  { source: 'law-lir', target: 'art-37-lir', type: 'CONTAINS' },
  { source: 'law-lir', target: 'art-44-lir', type: 'CONTAINS' },
  { source: 'law-ligv', target: 'art-18-igv', type: 'CONTAINS' },
  { source: 'law-ligv', target: 'art-19-igv', type: 'CONTAINS' },
  { source: 'law-const', target: 'art-74-const', type: 'CONTAINS' },

  { source: 'art-57-lir', target: 'conc-devengo', type: 'DEFINES' },
  { source: 'art-37-lir', target: 'conc-causalidad', type: 'DEFINES' },
  { source: 'art-37-lir', target: 'conc-fehaciencia', type: 'APPLIES_TO' },
  { source: 'art-norma16', target: 'conc-antielusion', type: 'DEFINES' },
  { source: 'art-18-igv', target: 'conc-creditofiscal', type: 'DEFINES' },
  { source: 'art-18-igv', target: 'conc-causalidad', type: 'APPLIES_TO' },
  { source: 'art-74-const', target: 'conc-noconfiscatorio', type: 'DEFINES' },

  { source: 'conc-causalidad', target: 'juris-rtf-causalidad', type: 'APPLIES_TO' },
  { source: 'conc-noconfiscatorio', target: 'juris-tc-confiscatorio', type: 'APPLIES_TO' }
];

const DATA_FILE = path.join(process.cwd(), 'server', 'data.json');

import { prisma } from './db';

// Persistent runtime document and chunks store
export class KnowledgeBaseStore {
  private documents: TaxDocument[] = [];
  private chunks: DocumentChunk[] = [];
  private nodes: GraphNode[] = [];
  private links: GraphLink[] = [];

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      // First try loading from PostgreSQL
      const dbDocs = await prisma.taxDocument.findMany({
        include: { chunks: true },
        orderBy: { createdAt: 'desc' }
      });

      if (dbDocs && dbDocs.length > 0) {
        this.documents = dbDocs.map(d => ({
          id: d.id,
          title: d.title,
          author: d.author,
          year: d.year,
          category: d.category as any,
          categoryLabel: d.categoryLabel,
          totalPages: d.totalPages,
          fileSize: d.fileSize,
          driveUrl: d.driveUrl || undefined,
          fileUrl: d.fileUrl || undefined,
          fileName: d.fileName || undefined,
          chunksCount: d.chunksCount,
          entitiesCount: d.entitiesCount,
          status: d.status as any,
          uploadDate: d.uploadDate,
          description: d.description,
          tags: (d.tags as any) || []
        }));

        this.chunks = dbDocs.flatMap(d => d.chunks.map(c => ({
          id: c.id,
          docId: c.docId,
          docTitle: c.docTitle,
          author: c.author,
          page: c.page,
          chapter: c.chapter,
          section: c.section,
          text: c.text,
          entities: (c.entities as any) || [],
          articlesReferenced: (c.articlesReferenced as any) || [],
          relevanceScore: c.relevanceScore || undefined
        })));

        if (fs.existsSync(DATA_FILE)) {
          const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
          this.nodes = data.nodes || [...INITIAL_GRAPH_NODES];
          this.links = data.links || [...INITIAL_GRAPH_LINKS];
        } else {
          this.nodes = [...INITIAL_GRAPH_NODES];
          this.links = [...INITIAL_GRAPH_LINKS];
        }
        return;
      }
    } catch (dbErr) {
      console.warn('[KnowledgeBase] Fallback to data.json:', (dbErr as Error).message);
    }

    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        this.documents = data.documents || [];
        this.chunks = data.chunks || [];
        this.nodes = data.nodes || [];
        this.links = data.links || [];
      } else {
        this.documents = [...INITIAL_TAX_DOCUMENTS];
        this.chunks = [...INITIAL_CHUNKS];
        this.nodes = [...INITIAL_GRAPH_NODES];
        this.links = [...INITIAL_GRAPH_LINKS];
        this.saveData();
      }
    } catch (err) {
      console.error('Error loading knowledge base data:', err);
      this.documents = [...INITIAL_TAX_DOCUMENTS];
      this.chunks = [...INITIAL_CHUNKS];
      this.nodes = [...INITIAL_GRAPH_NODES];
      this.links = [...INITIAL_GRAPH_LINKS];
    }
  }

  private saveData() {
    try {
      const data = {
        documents: this.documents,
        chunks: this.chunks,
        nodes: this.nodes,
        links: this.links
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving knowledge base data:', err);
    }
  }

  public getDocuments(ramaId?: string): TaxDocument[] {
    if (ramaId) {
      return this.documents.filter(d => (d.ramaId || TRIBUTARIO_RAMA_ID) === ramaId);
    }
    return this.documents;
  }

  public getDocumentById(id: string): TaxDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  public getChunks(): DocumentChunk[] {
    return this.chunks;
  }

  public getGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
    return {
      nodes: this.nodes,
      links: this.links
    };
  }

  public async addDocument(doc: TaxDocument, newChunks: DocumentChunk[], newNodes: GraphNode[] = [], newLinks: GraphLink[] = []): Promise<void> {
    const docWithRama: TaxDocument = {
      ...doc,
      ramaId: doc.ramaId || TRIBUTARIO_RAMA_ID
    };
    this.documents.unshift(docWithRama);
    this.chunks.push(...newChunks);

    // Add nodes preventing duplicates by ID
    for (const node of newNodes) {
      if (!this.nodes.some(n => n.id === node.id)) {
        this.nodes.push(node);
      }
    }

    // Add links
    for (const link of newLinks) {
      if (!this.links.some(l => l.source === link.source && l.target === link.target && l.type === link.type)) {
        this.links.push(link);
      }
    }

    this.saveData();

    // Persist to PostgreSQL asynchronously
    try {
      await prisma.taxDocument.upsert({
        where: { id: docWithRama.id },
        update: {
          title: docWithRama.title,
          author: docWithRama.author,
          year: docWithRama.year,
          ramaId: docWithRama.ramaId,
          category: docWithRama.category,
          categoryLabel: docWithRama.categoryLabel,
          totalPages: docWithRama.totalPages,
          fileSize: docWithRama.fileSize,
          driveUrl: docWithRama.driveUrl || null,
          fileUrl: docWithRama.fileUrl || null,
          fileName: docWithRama.fileName || null,
          chunksCount: docWithRama.chunksCount,
          entitiesCount: docWithRama.entitiesCount,
          status: docWithRama.status,
          uploadDate: docWithRama.uploadDate,
          description: docWithRama.description,
          tags: docWithRama.tags || []
        },
        create: {
          id: docWithRama.id,
          title: docWithRama.title,
          author: docWithRama.author,
          year: docWithRama.year,
          ramaId: docWithRama.ramaId,
          category: docWithRama.category,
          categoryLabel: docWithRama.categoryLabel,
          totalPages: docWithRama.totalPages,
          fileSize: docWithRama.fileSize,
          driveUrl: docWithRama.driveUrl || null,
          fileUrl: docWithRama.fileUrl || null,
          fileName: docWithRama.fileName || null,
          chunksCount: docWithRama.chunksCount,
          entitiesCount: docWithRama.entitiesCount,
          status: doc.status,
          uploadDate: doc.uploadDate,
          description: doc.description,
          tags: doc.tags || []
        }
      });

      if (newChunks.length > 0) {
        await prisma.documentChunk.createMany({
          data: newChunks.map(c => ({
            id: c.id,
            docId: c.docId,
            docTitle: c.docTitle,
            author: c.author,
            page: c.page,
            chapter: c.chapter,
            section: c.section,
            text: c.text,
            entities: c.entities || [],
            articlesReferenced: c.articlesReferenced || [],
            relevanceScore: c.relevanceScore || 0
          })),
          skipDuplicates: true
        });
      }
    } catch (err) {
      console.error('[KnowledgeBase] Error persisting document to PostgreSQL:', err);
    }
  }

  public async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex(d => d.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      this.chunks = this.chunks.filter(c => c.docId !== id);
      this.saveData();

      try {
        await prisma.taxDocument.delete({
          where: { id }
        });
      } catch (err) {
        console.error(`[KnowledgeBase] Error deleting document ${id} from PostgreSQL:`, err);
      }

      return true;
    }
    return false;
  }

  public getChunksByDocId(docId: string): DocumentChunk[] {
    return this.chunks.filter(c => c.docId === docId);
  }

  public searchChunks(query: string, limit = 6, categoryFilter?: string, docFilter?: string[], ramaId?: string): DocumentChunk[] {
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    return this.chunks
      .filter(chunk => {
        if (docFilter && docFilter.length > 0 && !docFilter.includes(chunk.docId)) {
          return false;
        }
        const parentDoc = this.documents.find(d => d.id === chunk.docId);
        if (ramaId) {
          if (parentDoc && (parentDoc.ramaId || TRIBUTARIO_RAMA_ID) !== ramaId) {
            return false;
          }
        }
        if (categoryFilter) {
          if (parentDoc && parentDoc.category !== categoryFilter) {
            return false;
          }
        }
        return true;
      })
      .map(chunk => {
        let score = 0;
        const textLower = chunk.text.toLowerCase();
        const chapterLower = chunk.chapter.toLowerCase();
        const sectionLower = chunk.section.toLowerCase();

        for (const token of tokens) {
          if (textLower.includes(token)) score += 3;
          if (chapterLower.includes(token)) score += 5;
          if (sectionLower.includes(token)) score += 6;

          for (const ent of chunk.entities) {
            if (ent.toLowerCase().includes(token)) score += 8;
          }
          for (const art of chunk.articlesReferenced) {
            if (art.toLowerCase().includes(token)) score += 10;
          }
        }

        // Exact phrase bonus
        if (textLower.includes(query.toLowerCase())) {
          score += 15;
        }

        return {
          ...chunk,
          relevanceScore: score
        };
      })
      .filter(c => (c.relevanceScore || 0) > 0)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  }
}

export const knowledgeBase = new KnowledgeBaseStore();
