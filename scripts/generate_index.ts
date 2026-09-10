import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const HTML_DIR = path.resolve(__dirname, '../html');
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/books_index.json');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function processHtmlFile(fileName: string) {
  const filePath = path.join(HTML_DIR, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const id = fileName.replace('.html', '').replace(/\s+/g, '-').toLowerCase();
  
  // Basic Regex Extraction
  const yearMatch = fileName.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : 'Desconocido';
  
  let documentType = 'Doctrina / Artículo';
  const upperName = fileName.toUpperCase();
  if (upperName.includes('RESOLUCIÓN') || upperName.includes('RTF') || upperName.includes('CASACIÓN') || upperName.includes('SENTENCIA')) {
    documentType = 'Jurisprudencia';
  } else if (upperName.includes('LEY') || upperName.includes('DECRETO') || upperName.includes('REGLAMENTO') || upperName.includes('CÓDIGO')) {
    documentType = 'Legislación';
  } else if (upperName.includes('LIBRO') || upperName.includes('MANUAL') || upperName.includes('GUÍA') || upperName.includes('GUIA')) {
    documentType = 'Libro / Manual';
  }
  
  if (!ai) {
    console.log(`No hay API Key. Usando metadatos básicos para ${fileName}`);
    return {
      id,
      fileName,
      title: fileName.replace('.html', '').replace(/-/g, ' '),
      author: 'Doctrina',
      category: 'General',
      documentType,
      year,
      abstract: 'Documento tributario: ' + fileName.replace('.html', ''),
      tags: ['Tributario', documentType]
    };
  }

  const textContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 15000);

  const prompt = `Analiza el siguiente texto extraído de un libro o documento tributario peruano (título del archivo: ${fileName}).
Por favor, extrae los siguientes metadatos en formato estrictamente JSON:
{
  "title": "El título del libro o documento (mejóralo si el nombre de archivo es feo)",
  "author": "El autor (si no se encuentra, usa 'Desconocido' o 'Doctrina')",
  "category": "Una categoría principal (ej. 'Impuesto a la Renta', 'IGV', 'Código Tributario', 'Jurisprudencia', 'Otros')",
  "documentType": "Clasifica como: 'Jurisprudencia', 'Legislación', 'Libro / Manual', o 'Doctrina / Artículo'",
  "year": "Extrae el año de publicación o de la resolución. Si no se menciona, usa '${year}'",
  "abstract": "Un breve resumen de 2-3 líneas sobre qué trata el documento.",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3", "etiqueta4"]
}

TEXTO A ANALIZAR:
"""
${textContent}
"""
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    
    return {
      id,
      fileName,
      ...parsed,
    };
  } catch (error) {
    console.error(`Error procesando ${fileName}:`, error);
    return null;
  }
}

async function main() {
  if (!ai) {
    console.warn('ADVERTENCIA: GEMINI_API_KEY no encontrada. Se generará un índice básico sin análisis de IA.');
  }

  console.log(`Buscando archivos HTML en ${HTML_DIR}...`);
  const files = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));
  console.log(`Se encontraron ${files.length} archivos. Iniciando procesamiento...`);

  const indexData = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`Procesando (${i + 1}/${files.length}): ${file}`);
    const metadata = await processHtmlFile(file);
    if (metadata) {
      indexData.push(metadata);
    }
    if (ai) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexData, null, 2), 'utf-8');
  console.log(`¡Procesamiento completado! Índice guardado en ${OUTPUT_FILE}`);
}

main().catch(console.error);
