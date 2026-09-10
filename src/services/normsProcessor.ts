import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIRECTORIO_BASE = "F:/normas2025/NormasLegales/ScrapNormas/paginas_procesadas";

function leerArchivoTexto(ruta: string): string {
  return fs.readFileSync(ruta, "utf-8").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function clasificarTipo(texto: string): string {
  const bajo = texto.toLowerCase();
  const esJuris = /sentencia|tribunal constitucional|jurisprudencia/i.test(bajo);
  const esNorma = /codigo tributario|ley del impuesto|art\./i.test(bajo);
  if (esJuris && !esNorma) return "jurisprudencia";
  return "norma";
}

function extraerFecha(ruta: string): string {
  const nombre = path.basename(ruta, path.extname(ruta));
  const m = nombre.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3];
  try {
    return fs.statSync(ruta).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function extraerOrganismo(texto: string): string | undefined {
  const lista = ["SUNAT", "Tribunal Fiscal", "Tribunal Constitucional", "Congreso"];
  for (const o of lista) {
    if (texto.includes(o)) return o;
  }
  return undefined;
}

function tituloCorto(texto: string): string {
  const partes = texto.split(".").slice(0, 3);
  for (const p of partes) {
    const limpio = p.replace(/[^\w\s]/g, " ").trim();
    if (limpio.length > 5 && limpio.length < 100) return limpio;
  }
  return "Norma Legal";
}

async function procesarDirectorioNormas(): Promise<void> {
  console.log("[NormsProcessor] Iniciando en: " + DIRECTORIO_BASE);
  if (!fs.existsSync(DIRECTORIO_BASE)) {
    console.error("Directorio no encontrado: " + DIRECTORIO_BASE);
    await prisma.$disconnect();
    return;
  }
  const carpetas = fs.readdirSync(DIRECTORIO_BASE).filter(function (c) {
    return fs.statSync(path.join(DIRECTORIO_BASE, c)).isDirectory();
  }).sort();
  console.log("[NormsProcessor] Carpetas: " + carpetas.length);
  let procesados = 0;
  let errores = 0;
  for (const carpeta of carpetas) {
    const dirCarpeta = path.join(DIRECTORIO_BASE, carpeta);
    const archivos = fs.readdirSync(dirCarpeta).filter(function (f) {
      return f.endsWith(".html") || f.endsWith(".pdf");
    });
    console.log("[NormsProcessor] " + carpeta + " archivos: " + archivos.length);
    for (const archivo of archivos) {
      const ruta = path.join(dirCarpeta, archivo);
      try {
        const texto = leerArchivoTexto(ruta);
        if (texto.length < 20) {
          errores++;
          continue;
        }
        const norma = await prisma.legalNorm.create({
          data: {
            titulo: path.basename(archivo, path.extname(archivo)),
            tipo: clasificarTipo(texto),
            fechaPublicacion: extraerFecha(ruta),
            fuente: ruta,
            rutaArchivo: ruta,
            contenidoCompleto: texto.slice(0, 50000),
            status: "processed",
            organismoEmisor: extraerOrganismo(texto),
            tituloCorta: tituloCorto(texto),
          },
        });
        // ponytail: sin chunks en document_chunks (su docId tiene FK a tax_documents, no a legal_norm)
        procesados++;
        if (procesados % 50 === 0) console.log("[NormsProcessor] Progreso: " + procesados);
      } catch (e: any) {
        console.error("[NormsProcessor] Error en " + archivo + ": " + e.message);
        errores++;
      }
    }
  }
  console.log("[NormsProcessor] Terminado. Procesados: " + procesados + " Errores: " + errores);
  await prisma.$disconnect();
}

procesarDirectorioNormas();
