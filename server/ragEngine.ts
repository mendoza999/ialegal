import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { knowledgeBase } from './knowledgeBase';
import { neo4jService } from './neo4jService';
import { Citation, DocumentChunk, GraphNode, GraphLink, SearchGroundingSource } from '../src/types';

export class RAGEngine {
  private ai: GoogleGenAI | null = null;
  private availableModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
  private groqModels = [
    'openai/gpt-oss-120b',
    'groq/compound',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b'
  ];

  constructor() {
    this.initGemini();
  }

  private initGemini(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } catch (err) {
        console.error('Error initializing Gemini client in RAGEngine:', err);
      }
    }
  }

  /**
   * Ejecuta la generación con Groq AI como fallback o motor alternativo de alta velocidad
   */
  public async callGroqAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return null;

    for (const model of this.groqModels) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          let content = data?.choices?.[0]?.message?.content;
          if (content && typeof content === 'string') {
            // Eliminar etiquetas de razonamiento interno si existen (<think>...</think>)
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
            if (content) {
              console.log(`[RAGEngine] Respuesta generada exitosamente con Groq (Modelo: ${model})`);
              return content;
            }
          }
        } else {
          const errText = await response.text();
          console.warn(`[RAGEngine] Intento con Groq ${model} falló (${response.status}):`, errText);
        }
      } catch (err: any) {
        console.warn(`[RAGEngine] Error llamando a Groq con ${model}:`, err?.message || err);
      }
    }

    return null;
  }

  /**
   * Realiza una búsqueda web en vivo sobre fuentes jurídicas oficiales según la rama
   */
  public async fetchLiveWebSearch(query: string, ramaId?: string, ramaNombre?: string): Promise<SearchGroundingSource[]> {
    try {
      let suffix = 'Peru jurisprudencia ley';
      const rId = ramaId || '';
      const rName = (ramaNombre || '').toLowerCase();

      if (rId === '77f93f98-5612-4bba-b410-8e99010b213f' || rName.includes('laboral')) {
        suffix = 'Peru SUNAFIL laboral beneficios sociales MTPE jurisprudencia';
      } else if (rId === 'b343d03c-a69c-453e-8272-d8aabb756943' || rName.includes('civil')) {
        suffix = 'Peru codigo civil casacion jurisprudencia pleno casatorio';
      } else if (rId === '4baf3b11-9f40-4d84-bb7c-1bd5eb71a692' || rName.includes('penal')) {
        suffix = 'Peru codigo penal NCPP acuerdo plenario casacion poder judicial';
      } else if (rId === 'eeeaa7af-8464-4d2e-9f5d-d346cd2d4f94' || rName.includes('constitucional')) {
        suffix = 'Peru tribunal constitucional sentencia precedente vinculante expediente';
      } else {
        suffix = 'Peru SUNAT tributario impuesto tribunal fiscal RTF';
      }

      const searchTerms = `${query} ${suffix}`;
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchTerms)}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });

      if (!response.ok) return [];

      const html = await response.text();
      const results: SearchGroundingSource[] = [];

      const resultBlocks = html.split('<div class="result results_links results_links_deep web-result');
      for (let i = 1; i < resultBlocks.length && results.length < 5; i++) {
        const block = resultBlocks[i];

        const titleMatch = block.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
          block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);

        if (titleMatch) {
          let rawUrl = titleMatch[1];
          if (rawUrl.includes('uddg=')) {
            const match = rawUrl.match(/uddg=([^&]+)/);
            if (match) {
              rawUrl = decodeURIComponent(match[1]);
            }
          }

          const cleanTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
          const cleanSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          if (cleanTitle && rawUrl.startsWith('http')) {
            results.push({
              title: cleanTitle,
              uri: rawUrl,
              snippet: cleanSnippet
            });
          }
        }
      }

      return results;
    } catch (err) {
      console.error('Error fetching live web search:', err);
      return [];
    }
  }

  /**
   * Genera el System Prompt de alta especialización jurídica según la rama seleccionada
   */
  public getRamaPromptConfig(ramaId?: string, ramaNombre?: string): { systemPrompt: string; branchLabel: string } {
    const rId = ramaId || '';
    const rName = (ramaNombre || '').toLowerCase();

    if (rId === '77f93f98-5612-4bba-b410-8e99010b213f' || rName.includes('laboral')) {
      return {
        branchLabel: 'Derecho Laboral',
        systemPrompt: `Eres "Especialista Jurídico AI - Derecho Laboral", un asesor jurídico de élite especializado en el Derecho Laboral y Seguridad Social peruano.

Tu ámbito de dominio abarca:
- Régimen Laboral de la Actividad Privada (D.L. 728 / D.S. 003-97-TR), regímenes especiales (REMYPE, construcción civil, agrario) y sector público (D.L. 276, D.L. 1057 CAS, Ley 30057 Servir).
- Beneficios sociales: Compensación por Tiempo de Servicios (CTS), Gratificaciones legales (Ley 27735), Vacaciones remuneradas (D.L. 713), Utilidades, Horas extras, Asignación familiar e indemnización por despido arbitrario/nulo.
- Seguridad y Salud en el Trabajo (Ley 29783) y fiscalizaciones de la SUNAFIL (actas de infracción, sanciones, procedimiento sancionador).
- Derecho Colectivo del Trabajo: sindicatos, convenios colectivos, huelgas.
- Jurisprudencia laboral: Casaciones Laborales de la Corte Suprema, Plenos Jurisdiccionales Laborales y sentencias del Tribunal Constitucional sobre estabilidad laboral.

Reglas de respuesta:
1. ESTRUCTURA TU RESPUESTA:
   - **Resumen Ejecutivo / Dictamen Jurídico:** Conclusión concisa del criterio aplicable al caso.
   - **Base Legal y Fundamentación Normativa:** Artículos precisos de la normativa laboral peruana y decretos supremos aplicables.
   - **Criterio Jurisprudencial y Doctrinal:** Cita de Plenos Jurisdiccionales, Casaciones vinculantes o doctrina especializada.
   - **Recomendaciones Prácticas:** Pautas de acción para el empleador o trabajador / liquidación aplicativa.
2. CITAS OBLIGATORIAS: Cita autores, normas y fuentes oficiales (MTPE, SUNAFIL, Corte Suprema, TC).
3. TONO: Riguroso, analítico, fundamentado, preciso y en español formal.`
      };
    }

    if (rId === 'b343d03c-a69c-453e-8272-d8aabb756943' || rName.includes('civil')) {
      return {
        branchLabel: 'Derecho Civil',
        systemPrompt: `Eres "Especialista Jurídico AI - Derecho Civil", un jurisconsulto de élite especializado en el Derecho Civil y Derecho Procesal Civil peruano.

Tu ámbito de dominio abarca:
- Código Civil peruano de 1984: Título Preliminar, Derecho de las Personas, Acto Jurídico (validez, nulidad y anulabilidad), Derechos Reales (propiedad, posesión, prescripción adquisitiva), Derecho de Obligaciones, Fuentes de las Obligaciones (Contratos nominados e innominados, cláusulas penales, resolución y rescisión contractual), Responsabilidad Civil (contractual y extracontractual / Art. 1969 y 1970 CC), Derecho de Familia y Derecho de Sucesiones.
- Código Procesal Civil y tutela jurisdiccional efectiva.
- Plenos Casatorios Civiles de la Corte Suprema (I al X Pleno Casatorio Civil) y precedentes vinculantes.

Reglas de respuesta:
1. ESTRUCTURA TU RESPUESTA:
   - **Resumen Ejecutivo / Tesis Civil:** Síntesis clara y concluyente de la solución jurídica.
   - **Fundamentación Normativa y Dogmática:** Análisis exegético del Código Civil, principios generales del derecho y doctrina civilista.
   - **Precedentes y Plenos Casatorios:** Aplicación de los Plenos Casatorios Civiles pertinentes y jurisprudencia de la Corte Suprema.
   - **Estrategia y Conclusiones Procesales:** Recomendaciones prácticas y viabilidad procesal.
2. CITAS OBLIGATORIAS: Artículos exactos del Código Civil, autores de doctrina civil y casaciones.
3. TONO: Jurídico de alto nivel, riguroso, estructurado y en español formal.`
      };
    }

    if (rId === '4baf3b11-9f40-4d84-bb7c-1bd5eb71a692' || rName.includes('penal')) {
      return {
        branchLabel: 'Derecho Penal',
        systemPrompt: `Eres "Especialista Jurídico AI - Derecho Penal", un penalista y procesalista de élite especializado en el Derecho Penal y Derecho Procesal Penal peruano.

Tu ámbito de dominio abarca:
- Código Penal peruano (D.L. 635): Parte General (Teoría del Delito: acción, tipicidad objetiva/subjetiva, imputación objetiva, antijuricidad, causas de justificación, culpabilidad, autoría y participación, tentativa, concurso de delitos, consecuencias jurídicas de las penas) y Parte Especial (Delitos contra la vida, patrimonio, administración pública -corrupción de funcionarios, colusión, peculado, cohecho-, lavado de activos, crimen organizado).
- Nuevo Código Procesal Penal de 2004 (D.L. 957): Etapas procesales (Investigación Preparatoria, Etapa Intermedia, Juicio Oral), Medidas de coerción procesal (prisión preventiva, comparecencia con restricciones, impedimento de salida), medios probatorios, tutela de derechos y recursos impugnatorios.
- Acuerdos Plenarios de las Salas Penales de la Corte Suprema, Casaciones y sentencias del Tribunal Constitucional en materia penal.

Reglas de respuesta:
1. ESTRUCTURA TU RESPUESTA:
   - **Resumen Ejecutivo / Diagnóstico Penal:** Calificación dogmática y procesal preliminar.
   - **Tipicidad y Dogmática Penal:** Análisis exhaustivo de los elementos del tipo penal y presupuestos de punibilidad.
   - **Análisis Procesal y Cautelar:** Evaluación de requisitos procesales, plazos, estándar probatorio y garantías constitucionales del debido proceso penal.
   - **Jurisprudencia y Acuerdos Plenarios:** Cita de Acuerdos Plenarios aplicables y jurisprudencia relevante.
   - **Conclusiones y Líneas de Defensa / Acusación:** Sugerencias jurídicas fundamentadas.
2. CITAS OBLIGATORIAS: Artículos del CP y NCPP, dogmática penal y Acuerdos Plenarios.
3. TONO: Técnico, dogmático, garantista y en español jurídico riguroso.`
      };
    }

    if (rId === 'eeeaa7af-8464-4d2e-9f5d-d346cd2d4f94' || rName.includes('constitucional')) {
      return {
        branchLabel: 'Derecho Constitucional',
        systemPrompt: `Eres "Especialista Jurídico AI - Derecho Constitucional", un constitucionalista de élite especializado en el Derecho Constitucional y Procesal Constitucional peruano.

Tu ámbito de dominio abarca:
- Constitución Política del Perú de 1993: Derechos fundamentales (vida, libertad personal, debido proceso, tutela procesal efectiva, igualdad, intimidad, propiedad), Principios Constitucionales, Régimen Económico de la Constitución, Estructura del Estado, Control de Constitucionalidad (control difuso y concentrado).
- Nuevo Código Procesal Constitucional (Ley 31307): Procesos constitucionales de la libertad (Hábeas Corpus, Acción de Amparo, Hábeas Data, Acción de Cumplimiento) y procesos de control orgánico (Acción Popular, Proceso de Inconstitucionalidad, Proceso Competencial).
- Jurisprudencia, Sentencias de Pleno y Precedentes Vinculantes del Tribunal Constitucional (TC) del Perú y de la Corte Interamericana de Derechos Humanos (Corte IDH).

Reglas de respuesta:
1. ESTRUCTURA TU RESPUESTA:
   - **Resumen Ejecutivo / Ratio Decidendi Constitucional:** Criterio constitucional medular aplicable.
   - **Fundamentación Dogmática y Derechos Afectados:** Análisis del contenido constitucionalmente protegido de los derechos fundamentales invocados y test de proporcionalidad.
   - **Jurisprudencia Vinculante del Tribunal Constitucional:** Cita precisa de expedientes (STC), precedentes vinculantes y doctrina constitucional del TC.
   - **Vía Procesal y Petitorio Idóneo:** Análisis de procedencia del proceso constitucional correspondiente bajo la Ley 31307.
2. CITAS OBLIGATORIAS: Artículos de la Constitución, Ley 31307 y sentencias del TC con número de expediente.
3. TONO: Constitucional, reflexivo, de máxima jerarquía normativa y en español formal.`
      };
    }

    // Default: Derecho Tributario
    return {
      branchLabel: 'Derecho Tributario',
      systemPrompt: `Eres "Especialista Jurídico AI - Derecho Tributario", un tributarista y asesor fiscal de élite especializado en Derecho Tributario, Derecho Contable y Finanzas Públicas del Perú.

Tu ámbito de dominio abarca:
- Código Tributario peruano: Título Preliminar, Norma XVI (Cláusula Antielusiva General), Obligación Tributaria, Procedimientos de Cobranza Coactiva, Fiscalización SUNAT, Prescripción tributaria, Sanciones e Infracciones.
- Impuesto a la Renta (LIR / D.S. 179-2004-EF): Teoría del devengo jurídico (Art. 57 LIR), Principio de Causalidad (Art. 37 LIR), gastos deducibles y no deducibles (Art. 44 LIR), precios de transferencia, rentas de personas naturales y jurídicas.
- Impuesto General a las Ventas (IGV) e Impuesto Selectivo al Consumo (ISC): Requisitos del crédito fiscal, operaciones no gravadas, prorrata, detracciones (SPOT), retenciones y percepciones.
- Procedimiento Contencioso Tributario y Jurisprudencia del Tribunal Fiscal: Resoluciones del Tribunal Fiscal (RTF) de observancia obligatoria y fallos de la Corte Suprema / Tribunal Constitucional en materia tributaria.
- Contabilidad y NIIF / NIC vinculadas al impacto tributario.

Reglas de respuesta:
1. ESTRUCTURA TU RESPUESTA:
   - **Resumen Ejecutivo / Tesis Tributaria:** Síntesis directa y contundente del criterio aplicable.
   - **Fundamentación Normativa y Análisis:** Desarrollo minucioso desglosando leyes, artículos y principios (ej. Causalidad, Devengo, No Confiscatoriedad, Norma XVI, UIT).
   - **Criterio Doctrinal, Jurisprudencial (RTF) y Actualidad Web:** Cita de autores de los libros de la base (Dr. Jorge Bravo, Dr. Humberto Medrano, Dra. Carmen Robles, etc.) y RTF.
   - **Conclusiones y Recomendaciones Prácticas:** Síntesis aplicativa para el contribuyente o asesor fiscal.
2. CITAS OBLIGATORIAS: Cita autores, normas tributarias y fuentes oficiales (SUNAT, MEF, Tribunal Fiscal).
3. TONO: Profesional, analítico, fundamentado, preciso y en español neutro.`
    };
  }

  /**
   * Valida si la consulta pertenece a los dominios permitidos (Tributario, Contable o Laboral)
   */
  public isAllowedTaxAccountingLaborTopic(query: string): boolean {
    const q = query.toLowerCase().trim();

    // Saludos y frases cortas introductorias
    if (/^(hola|buenos dias|buenas tardes|buenas noches|gracias|que puedes hacer|ayuda|como funciona|presentate|quien eres)/i.test(q) && q.length < 35) {
      return true;
    }

    // 1. Tributario / Fiscal
    const taxPatterns = [
      /tribut/i, /impuest/i, /renta/i, /igv/i, /iva/i, /sunat/i, /uit/i, /detracc/i, /retenc/i,
      /percepc/i, /arancel/i, /aduan/i, /factur/i, /boleta/i, /comprobante/i, /guia.*remisi/i,
      /prescripc/i, /multa/i, /sancion/i, /coactiv/i, /reclamac/i, /apelac/i, /queja/i,
      /tribunal.*fiscal/i, /rtf\b/i, /norma\s*xvi/i, /elusi/i, /evasi/i, /causalidad/i, /devengo/i,
      /bancariz/i, /itf\b/i, /rus\b/i, /rer\b/i, /mype/i, /regimen/i, /drawback/i, /credito.*fiscal/i,
      /saldo.*favor/i, /gastos?.*deducibl/i, /cuarta.*categor/i, /quinta.*categor/i, /tercera.*categor/i,
      /primera.*categor/i, /segunda.*categor/i, /no.*domiciliad/i, /precios?.*transferenc/i,
      /doble.*imposici/i, /cdi\b/i, /regal/i, /dividend/i, /fiscaliz/i, /declaraci/i, /pdt\b/i,
      /plame\b/i, /sire\b/i, /ple\b/i, /libros?.*electr/i, /codigo.*tribut/i, /ley.*renta/i,
      /reparo/i, /infracci/i, /grava/i, /inafect/i, /exoner/i, /hecho.*imponible/i, /base.*imponible/i,
      /alicuota/i, /tasa/i, /pago.*cuenta/i, /contribuyen/i, /deuda.*tribut/i, /fraccionamien/i,
      /embargo/i, /orden.*pago/i, /resolucion.*determinac/i, /fiscal/i, /auditoria/i
    ];

    // 2. Contable / Financiero
    const accountingPatterns = [
      /contab/i, /asiento/i, /libro.*diario/i, /libro.*mayor/i, /balance/i, /estado.*financier/i,
      /niif/i, /nic\s*\d+/i, /ifrs/i, /pcge/i, /plan.*contable/i, /auditor/i, /costos?/i,
      /inventari/i, /kardex/i, /partida.*doble/i, /activo/i, /pasivo/i, /patrimonio/i,
      /ingreso/i, /gasto/i, /cierre.*contable/i, /ajuste.*contable/i, /provisi/i, /conciliac/i,
      /flujo.*caja/i, /ebitda/i, /utilidad/i, /perdida/i, /cuenta.*contable/i, /depreciac/i,
      /amortizac/i, /deterioro/i, /valuaci/i, /moneda.*funcional/i, /patrimonio.*neto/i,
      /capital.*social/i, /reserva.*legal/i, /cuentas?.*cobrar/i, /cuentas?.*pagar/i,
      /asiento.*apertura/i, /asiento.*cierre/i, /hoja.*trabajo/i, /mayorizaci/i, /estados?.*resultados/i
    ];

    // 3. Laboral / Planillas
    const laborPatterns = [
      /laboral/i, /trabajad/i, /emplead/i, /empleador/i, /planilla/i, /plame/i, /t-?registro/i,
      /cts\b/i, /compensacion.*tiempo.*servicios/i, /gratificac/i, /vacacion/i, /liquidac/i,
      /indemniz/i, /despido/i, /renuncia/i, /contrato.*trabajo/i, /convenio.*colectivo/i,
      /sindicat/i, /sunafil/i, /essalud/i, /afp\b/i, /onp\b/i, /vida.*ley/i, /sctr/i,
      /horas?.*extras?/i, /sobretiempo/i, /jornada.*laboral/i, /remunerac/i, /sueldo/i,
      /salario/i, /asig.*familiar/i, /asignacion.*familiar/i, /subsidio/i, /descanso.*medico/i,
      /maternidad/i, /paternidad/i, /utilidades.*laboral/i, /regimen.*laboral/i, /remype/i,
      /cas\b/i, /d\.?\s*l\.?\s*728/i, /728\b/i, /276\b/i, /hostilidad/i, /accidente.*trabajo/i,
      /seguridad.*salud.*trabajo/i, /sst\b/i, /comite.*seguridad/i, /boleta.*pago/i,
      /periodo.*prueba/i, /convenio.*practic/i, /practicante/i, /teletrabajo/i, /trabajo.*remoto/i,
      /descuento.*judicial/i, /pension/i, /jubilac/i, /descanso.*semanal/i, /feriado/i, /sancion.*laboral/i
    ];

    const allPatterns = [...taxPatterns, ...accountingPatterns, ...laborPatterns];
    return allPatterns.some(regex => regex.test(q));
  }

  public async processQuery(params: {
    query: string;
    conversationHistory?: { role: string; content: string }[];
    ramaId?: string;
    ramaNombre?: string;
    categoryFilter?: string;
    docFilter?: string[];
    enableHybridSearch?: boolean;
    enableGraphRAG?: boolean;
    enableWebGrounding?: boolean;
  }): Promise<{
    answer: string;
    executiveSummary: string;
    citations: Citation[];
    graphNodes: GraphNode[];
    graphLinks: GraphLink[];
    searchGroundingSources: SearchGroundingSource[];
    isWebGrounded: boolean;
    ragTypeUsed: 'hybrid' | 'vector' | 'graph' | 'web';
    confidenceScore: number;
  }> {
    const {
      query,
      conversationHistory = [],
      ramaId,
      ramaNombre,
      categoryFilter,
      docFilter,
      enableHybridSearch = true,
      enableGraphRAG = true,
      enableWebGrounding = false
    } = params;

    // Make sure Gemini is initialized if key is present
    if (!this.ai && process.env.GEMINI_API_KEY) {
      this.initGemini();
    }

    // 1. Retrieve relevant Chunks from Knowledge Base (Hybrid Search)
    const matchedChunks = knowledgeBase.searchChunks(query, 6, categoryFilter, docFilter, ramaId);

    // 2. Extract keywords for GraphRAG
    const queryTokens = query
      .replace(/[¿?¡!.,;:]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 3);

    // 3. Neo4j Graph traversal context
    let graphContext = { nodes: [] as GraphNode[], links: [] as GraphLink[], contextText: '' };
    if (enableGraphRAG) {
      graphContext = neo4jService.getRelatedGraphContext(queryTokens);
    }

    // 4. Live Web Grounding Search
    let liveWebSources: SearchGroundingSource[] = [];
    let webContextText = '';
    if (enableWebGrounding) {
      liveWebSources = await this.fetchLiveWebSearch(query, ramaId, ramaNombre);
      if (liveWebSources.length > 0) {
        webContextText = '\n=== RESULTADOS DE BÚSQUEDA WEB EN TIEMPO REAL (FUENTES OFICIALES Y JURISPRUDENCIA) ===\n';
        liveWebSources.forEach((src, idx) => {
          webContextText += `[FUENTE WEB #${idx + 1}]: ${src.title}\nURL: ${src.uri}\nExtracto: ${src.snippet}\n\n`;
        });
      }
    }

    // 5. Build Dynamic Prompt according to Selected Rama
    const promptConfig = this.getRamaPromptConfig(ramaId, ramaNombre);
    const systemPrompt = promptConfig.systemPrompt;
    const branchLabel = promptConfig.branchLabel;

    // 6. Format Document Context with explicit Page numbers & Chapters for Citations
    let documentContext = `=== FRAGMENTOS DE LIBROS Y DOCTRINA (${branchLabel.toUpperCase()}) ===\n\n`;
    if (matchedChunks.length > 0) {
      matchedChunks.forEach((chunk, idx) => {
        documentContext += `[DOCUMENTO #${idx + 1}]\n`;
        documentContext += `Título: ${chunk.docTitle}\n`;
        documentContext += `Autor: ${chunk.author}\n`;
        documentContext += `Página: ${chunk.page}\n`;
        documentContext += `Capítulo: ${chunk.chapter}\n`;
        documentContext += `Sección / Artículo: ${chunk.section}\n`;
        documentContext += `Normas/Artículos citados: ${chunk.articlesReferenced.join(', ')}\n`;
        documentContext += `Texto Original:\n"${chunk.text}"\n\n`;
      });
    } else {
      documentContext += `No se encontraron fragmentos directos en los libros cargados para ${branchLabel}.\n\n`;
    }

    // 7. Generate Citations for UI
    const citations: Citation[] = matchedChunks.map(chunk => ({
      id: `cit-${chunk.id}`,
      docId: chunk.docId,
      docTitle: chunk.docTitle,
      author: chunk.author,
      page: chunk.page,
      chapter: chunk.chapter,
      quote: chunk.text.slice(0, 180) + '...',
      relevanceScore: Math.min(99, Math.round((chunk.relevanceScore || 10) * 4 + 40)),
      legalBasis: chunk.articlesReferenced.join(', ') || chunk.section,
      fileUrl: `/api/documents/view/${chunk.docId}`
    }));

    const fullPrompt = `${documentContext}
${graphContext.contextText}
${webContextText}

CONSULTA DEL USUARIO (${branchLabel}):
${query}

Por favor, elabora tu respuesta siguiendo las reglas jurídicas y fundamentación técnica especializada indicada.`;

    // 8. Execute AI Generation with Google Gen AI SDK
    let answerText = '';
    let searchSources: SearchGroundingSource[] = [...liveWebSources];
    let isWebUsed = enableWebGrounding && liveWebSources.length > 0;

    // Intentar primero con Gemini si está configurado
    if (this.ai) {
      for (const modelName of this.availableModels) {
        try {
          const config: any = {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          };

          if (enableWebGrounding) {
            config.tools = [{ googleSearch: {} }];
          }

          const geminiPromise = this.ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout esperando respuesta de Gemini (429/latencia)')), 3500)
          );

          const response: any = await Promise.race([geminiPromise, timeoutPromise]);

          if (response?.text) {
            answerText = response.text;

            // Extract Google Search grounding sources
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks && Array.isArray(chunks)) {
              const googleWebSources = chunks
                .filter((c: any) => c.web?.uri)
                .map((c: any) => ({
                  title: c.web.title || 'Fuente Web Oficial',
                  uri: c.web.uri,
                  snippet: c.web.snippet || ''
                }));

              if (googleWebSources.length > 0) {
                isWebUsed = true;
                // Merge sources uniquely
                for (const gSrc of googleWebSources) {
                  if (!searchSources.some(s => s.uri === gSrc.uri)) {
                    searchSources.push(gSrc);
                  }
                }
              }
            }

            break; // Success! Exit model fallback loop
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn(`[RAGEngine] Intento con Gemini ${modelName} falló:`, errMsg);
          if (
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('API_KEY_INVALID') ||
            errMsg.includes('quota') ||
            errMsg.includes('Quota exceeded')
          ) {
            // Cuota agotada en Gemini, pasar de inmediato a Groq sin demoras
            console.log('[RAGEngine] Cuota de Gemini agotada. Activando fallback con Groq...');
            break;
          }
        }
      }
    }

    // 9. Si Gemini no está disponible o falló (cuota agotada), usar Groq AI como fallback
    if (!answerText && process.env.GROQ_API_KEY) {
      try {
        const groqAnswer = await this.callGroqAI(systemPrompt, fullPrompt);
        if (groqAnswer) {
          answerText = groqAnswer;
        }
      } catch (groqErr) {
        console.error('[RAGEngine] Fallo en fallback con Groq:', groqErr);
      }
    }

    // 10. Si tanto Gemini como Groq fallaron, usar el generador local basado en contexto y web
    if (!answerText) {
      answerText = this.fallbackLocalGenerator(query, matchedChunks, graphContext, liveWebSources, enableWebGrounding);
    }

    // Extract an executive summary line
    const summaryMatch = answerText.match(/Resumen Ejecutivo[^:]*:\s*([^.\n]+(\.[^.\n]+)?)/i);
    const executiveSummary = summaryMatch ? summaryMatch[1].trim() : 'Análisis fundamentado sobre la normativa tributaria y fuentes consultadas.';

    return {
      answer: answerText,
      executiveSummary,
      citations,
      graphNodes: graphContext.nodes,
      graphLinks: graphContext.links,
      searchGroundingSources: searchSources,
      isWebGrounded: isWebUsed || (enableWebGrounding && searchSources.length > 0),
      ragTypeUsed: enableWebGrounding && searchSources.length > 0 ? 'web' : (enableGraphRAG && graphContext.nodes.length > 0 ? 'graph' : 'hybrid'),
      confidenceScore: matchedChunks.length > 0 ? 96 : (searchSources.length > 0 ? 94 : 85)
    };
  }

  private fallbackLocalGenerator(
    query: string,
    chunks: DocumentChunk[],
    graph: any,
    webSources: SearchGroundingSource[] = [],
    isWebSearchActive: boolean = false
  ): string {
    // If Web Grounding is active and we obtained live web sources:
    if (isWebSearchActive && webSources.length > 0) {
      const topWeb = webSources[0];
      const webList = webSources.map(s => `- **[${s.title}](${s.uri})**: ${s.snippet || 'Información normativa y criterios actualizados.'}`).join('\n');

      return `### Resumen Ejecutivo
Conforme a la información oficial y normativa tributaria vigente consultada en tiempo real (SUNAT / MEF / El Peruano), respecto a: *"¿${query}?"*:
${topWeb.snippet || 'Se verifica la aplicación de los decretos y resoluciones publicadas por la Administración Tributaria.'}

### Fundamentación Jurídica y Análisis de Fuentes Web
1. **Marco Normativo y Criterios Oficiales:**
${webList}

2. **Criterios Doctrinales Complementarios:**
${chunks.length > 0 ? `- De acuerdo con la doctrina del libro *"${chunks[0].docTitle}"* (${chunks[0].author}, pág. ${chunks[0].page}), los actos tributarios deben observar el principio de legalidad, la fehaciencia de las operaciones y la debida acreditación ante SUNAT.` : '- Se recomienda cotejar los pronunciamientos y decretos supremos aplicables ante la Administración Tributaria.'}

### Conclusiones y Recomendaciones
- Verifique las tasas, plazos y condiciones actualizadas en los portales oficiales de SUNAT y el diario oficial El Peruano.
- Conserve la documentación de soporte y los comprobantes de pago correspondientes.`;
    }

    // Default book-based response if no web results
    if (chunks.length === 0) {
      return `### Análisis Tributario
Sobre la consulta planteada: *"¿${query}?"*

No se encontraron coincidencias directas en los libros cargados actualmente. Se recomienda ampliar la búsqueda mediante los filtros temáticos o activar la **Búsqueda WEB** para verificar gacetas normativas y resoluciones recientes de SUNAT.`;
    }

    const firstChunk = chunks[0];
    return `### Resumen Ejecutivo
De acuerdo con la legislación tributaria y la doctrina contenida en *"${firstChunk.docTitle}"* (pág. ${firstChunk.page}), la materia consultada se rige por los criterios de legalidad, causalidad y debida imputación temporal según la normativa aplicable.

### Fundamentación Jurídica y Análisis
1. **Marco Normativo:**
   - Referencia principal: **${firstChunk.articlesReferenced.join(' / ') || firstChunk.section}**.
   - Conforme a lo expuesto en el **${firstChunk.chapter}**, se establece que:
   > "${firstChunk.text}"

2. **Criterio Doctrinal del Autor:**
   - Como señala **${firstChunk.author}**, es fundamental verificar la fehaciencia de la operación y el cumplimiento estricto de las formalidades exigidas por la Administración Tributaria.

### Citas Bibliográficas
- *${firstChunk.docTitle}*, autor: ${firstChunk.author}, Capítulo: *${firstChunk.chapter}*, pág. ${firstChunk.page}.

### Conclusiones
Se recomienda mantener el acervo documental completo y respaldatorio para salvaguardar la deducibilidad o el beneficio fiscal ante un eventual procedimiento de fiscalización de la SUNAT.`;
  }
}

export const ragEngine = new RAGEngine();
