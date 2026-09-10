import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { UserProfile, TaxDocument, DocumentChunk } from '../src/types';

async function main() {
  console.log('--- [Seed] Iniciando migración a PostgreSQL con carga masiva ---');

  // 1. Migrar Usuarios desde users.json
  const usersPath = path.join(process.cwd(), 'server', 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const rawUsers = fs.readFileSync(usersPath, 'utf-8');
      const data = JSON.parse(rawUsers);
      const userList: UserProfile[] = data.users || [];

      console.log(`[Seed] Procesando ${userList.length} usuarios...`);

      for (const u of userList) {
        const rawPassword = u.password || '123456';
        const hashedPassword = rawPassword.startsWith('$2')
          ? rawPassword
          : await bcrypt.hash(rawPassword, 10);

        await prisma.user.upsert({
          where: { email: u.email },
          update: {
            name: u.name,
            avatar: u.avatar || null,
            role: (u.role as string) || 'user',
            organization: u.organization || 'Estudio Jurídico',
          },
          create: {
            id: u.id,
            name: u.name || 'Usuario',
            email: u.email,
            password: hashedPassword,
            avatar: u.avatar || null,
            role: (u.role as string) || 'user',
            authProvider: u.authProvider || 'email',
            organization: u.organization || 'Estudio Jurídico',
            lastLogin: u.lastLogin || null,
            queryCount: u.queryCount || 0,
            dailyWebCount: u.dailyWebQueries?.count || 0,
            dailyWebDate: u.dailyWebQueries?.date || new Date().toISOString().split('T')[0]
          }
        });
      }
      console.log(`[Seed] ✅ Usuarios migrados y sincronizados.`);
    } catch (e: any) {
      console.error('[Seed] Error migrando usuarios:', e);
    }
  }

  // 2. Migrar Documentos y Fragmentos (Chunks) desde data.json
  const dataPath = path.join(process.cwd(), 'server', 'data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(rawData);
      const documents: TaxDocument[] = data.documents || [];
      const chunks: DocumentChunk[] = data.chunks || [];

      console.log(`[Seed] Procesando ${documents.length} documentos y ${chunks.length} fragmentos...`);

      for (const doc of documents) {
        await prisma.taxDocument.upsert({
          where: { id: doc.id },
          update: {
            title: doc.title,
            author: doc.author,
            year: doc.year || 2024,
            category: doc.category,
            categoryLabel: doc.categoryLabel,
            totalPages: doc.totalPages || 0,
            fileSize: doc.fileSize || '1 MB',
            driveUrl: doc.driveUrl || null,
            fileUrl: doc.fileUrl || null,
            fileName: doc.fileName || null,
            chunksCount: doc.chunksCount || 0,
            entitiesCount: doc.entitiesCount || 0,
            status: doc.status || 'indexed',
            uploadDate: doc.uploadDate || new Date().toISOString().split('T')[0],
            description: doc.description || '',
            tags: doc.tags || []
          },
          create: {
            id: doc.id,
            title: doc.title,
            author: doc.author,
            year: doc.year || 2024,
            category: doc.category,
            categoryLabel: doc.categoryLabel,
            totalPages: doc.totalPages || 0,
            fileSize: doc.fileSize || '1 MB',
            driveUrl: doc.driveUrl || null,
            fileUrl: doc.fileUrl || null,
            fileName: doc.fileName || null,
            chunksCount: doc.chunksCount || 0,
            entitiesCount: doc.entitiesCount || 0,
            status: doc.status || 'indexed',
            uploadDate: doc.uploadDate || new Date().toISOString().split('T')[0],
            description: doc.description || '',
            tags: doc.tags || []
          }
        });
      }
      console.log(`[Seed] ✅ Documentos sincronizados.`);

      // Bulk create chunks in batches of 100
      const existingDocIds = new Set(documents.map(d => d.id));
      const validChunks = chunks.filter(c => existingDocIds.has(c.docId)).map(chunk => ({
        id: chunk.id,
        docId: chunk.docId,
        docTitle: chunk.docTitle,
        author: chunk.author,
        page: chunk.page || 1,
        chapter: chunk.chapter || 'Capítulo General',
        section: chunk.section || 'Sección General',
        text: chunk.text || '',
        entities: chunk.entities || [],
        articlesReferenced: chunk.articlesReferenced || [],
        relevanceScore: chunk.relevanceScore || 0
      }));

      const BATCH_SIZE = 100;
      for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
        const batch = validChunks.slice(i, i + BATCH_SIZE);
        await prisma.documentChunk.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
      console.log(`[Seed] ✅ Fragmentos insertados con createMany (${validChunks.length} chunks).`);

    } catch (e: any) {
      console.error('[Seed] Error migrando documentos/chunks:', e);
    }
  }

  console.log('--- [Seed] Migración completada exitosamente ---');
}

main()
  .catch(e => {
    console.error('[Seed] Error crítico en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
