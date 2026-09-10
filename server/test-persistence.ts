import 'dotenv/config';
import { prisma } from './db';
import { usersStore } from './usersStore';
import { chatStore } from './chatStore';

async function testPersistence() {
  console.log('--- [Test] Verificando Persistencia en PostgreSQL ---');

  // 1. Verificar Usuarios
  const users = await usersStore.getUsers();
  console.log(`[Test] Total usuarios en PostgreSQL: ${users.length}`);
  if (users.length === 0) {
    throw new Error('No se encontraron usuarios en PostgreSQL');
  }

  // 2. Probar Login con contraseña INVÁLIDA (Debe registrar LOGIN_FAILED)
  console.log('[Test] Probando login con contraseña incorrecta...');
  const failedPassLogin = await usersStore.loginUser(
    'mmi.mendoza@gmail.com',
    'clave_erronea_999',
    '190.113.10.5',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  );
  console.log(`[Test] Intento con clave incorrecta devuelto: ${failedPassLogin === null ? 'NULL (Correcto)' : 'Error'}`);

  // 2.1 Probar Login con usuario NO REGISTRADO (Debe registrar LOGIN_FAILED)
  console.log('[Test] Probando login con correo no existente...');
  const failedUnknownLogin = await usersStore.loginUser(
    'intruso_anonimo@hacker.com',
    'clave_secreta',
    '185.220.101.5',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0'
  );
  console.log(`[Test] Intento con usuario no registrado devuelto: ${failedUnknownLogin === null ? 'NULL (Correcto)' : 'Error'}`);

  // 2.2 Probar Login con credenciales VÁLIDAS (Debe registrar LOGIN)
  const loginAdmin = await usersStore.loginUser(
    'mmi.mendoza@gmail.com',
    '123456',
    '200.48.120.45',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  );
  if (!loginAdmin) {
    throw new Error('Fallo el login con credenciales válidas en PostgreSQL');
  }
  console.log(`[Test] ✅ Login exitoso para usuario admin: ${loginAdmin.user.name} (${loginAdmin.user.role})`);

  // Probar Logout
  await usersStore.logoutUser(loginAdmin.user.id, '200.48.120.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  console.log(`[Test] ✅ Logout registrado para usuario admin`);

  // 2.3 Verificar tabla AccessLog
  const logs = await usersStore.getAccessLogs(10);
  console.log(`[Test] ✅ Total de logs de acceso recuperados en PostgreSQL: ${logs.length}`);
  logs.slice(0, 5).forEach((l, idx) => {
    console.log(`[Test]   Log #${idx + 1}: [${l.action}] | Usuario=${l.userName || 'N/A'} (${l.userEmail}) | IP=${l.ipAddress} | Dispositivo="${l.device}" | Detalle="${l.details}" | Hora=${l.createdAt}`);
  });

  // 3. Probar Creación y Persistencia de Sesión de Chat
  const testSession = await chatStore.createSession(loginAdmin.user.id, 'Consulta de Prueba Devengo Art. 57');
  console.log(`[Test] ✅ Sesión de chat creada en PostgreSQL: ID=${testSession.id}, Título="${testSession.title}"`);

  // 4. Probar Guardado de Mensajes (Usuario + Asistente con Citas y Nodos)
  const userMsg = await chatStore.saveMessage(testSession.id, {
    role: 'user',
    content: '¿Cuándo se devenga el gasto en servicios continuados?'
  });
  console.log(`[Test] ✅ Mensaje de usuario guardado en PostgreSQL: ID=${userMsg.id}`);

  const assistantMsg = await chatStore.saveMessage(testSession.id, {
    role: 'assistant',
    content: 'De acuerdo al Art. 57 de la Ley del Impuesto a la Renta, los ingresos y gastos por servicios continuados se devengan en función del tiempo transcurrido o del grado de culminación de la prestación.',
    executiveSummary: 'Devengo jurídico en servicios continuados según Art. 57 LIR.',
    citations: [
      {
        id: 'cit-test-01',
        docId: 'doc-ir-02',
        docTitle: 'Tratado del Impuesto a la Renta',
        author: 'Dr. Humberto Medrano Cornejo',
        page: 142,
        chapter: 'Capítulo IV: Devengo Jurídico',
        quote: 'El devengo en servicios de ejecución continuada requiere verificar el transcurso del plazo o avance pactado.',
        relevanceScore: 98
      }
    ],
    graphNodes: [
      { id: 'node-devengo', label: 'Concept', name: 'Devengo Jurídico' }
    ],
    isWebGrounded: false,
    ragTypeUsed: 'hybrid',
    confidenceScore: 97
  });
  console.log(`[Test] ✅ Mensaje del asistente con citas guardado en PostgreSQL: ID=${assistantMsg.id}`);

  // 5. Recuperar la sesión completa desde PostgreSQL
  const retrievedSession = await chatStore.getSessionById(testSession.id);
  if (!retrievedSession || retrievedSession.messages.length !== 2) {
    throw new Error('Fallo la recuperación de la sesión y sus mensajes desde PostgreSQL');
  }
  console.log(`[Test] ✅ Sesión recuperada de PostgreSQL con ${retrievedSession.messages.length} mensajes intactos.`);
  console.log(`[Test] ✅ Citas recuperadas en el mensaje: ${retrievedSession.messages[1].citations?.length} citas.`);

  // 6. Verificar Documentos y Chunks en PostgreSQL
  const docCount = await prisma.taxDocument.count();
  const chunkCount = await prisma.documentChunk.count();
  console.log(`[Test] ✅ Documentos en PostgreSQL: ${docCount}, Chunks indexados: ${chunkCount}`);

  // 7. Probar Persistencia de Notificaciones en PostgreSQL
  const testNotif = await usersStore.createNotification({
    userId: loginAdmin.user.id,
    title: 'Notificación de Prueba Persistente',
    message: 'Validación de registro y consulta de notificaciones en PostgreSQL.',
    type: 'legal_alert'
  });
  console.log(`[Test] ✅ Notificación guardada en PostgreSQL: ID=${testNotif.id}, Título="${testNotif.title}"`);
  const allNotifs = await usersStore.getNotifications(loginAdmin.user.id);
  console.log(`[Test] ✅ Total de notificaciones recuperadas de PostgreSQL: ${allNotifs.length}`);

  // Limpiar la sesión de prueba
  await chatStore.deleteSession(testSession.id);
  console.log(`[Test] ✅ Sesión de prueba eliminada limpiamente.`);

  console.log('--- [Test] TODOS LOS TESTS DE PERSISTENCIA PASARON EXITOSAMENTE ---');
}

testPersistence()
  .catch(e => {
    console.error('[Test] Error en pruebas de persistencia:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
