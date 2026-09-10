import 'dotenv/config';
import { prisma } from './db';
import { usersStore } from './usersStore';

async function testConcurrentSessions() {
  console.log('--- [Test] Verificando Control de Sesiones Concurrentes ---');

  const testEmail = 'mmi.mendoza@gmail.com';
  const testPass = '123456';

  // 1. Simular inicio de sesión en Dispositivo 1
  const loginDev1 = await usersStore.loginUser(testEmail, testPass);
  if (!loginDev1 || !loginDev1.sessionToken) {
    throw new Error('Fallo el login en Dispositivo 1');
  }
  const tokenDev1 = loginDev1.sessionToken;
  console.log(`[Test] ✅ Dispositivo 1 inició sesión. Token: ${tokenDev1.substring(0, 20)}...`);

  // Verificar que Dispositivo 1 es válido
  const checkDev1Initial = await usersStore.validateSession(loginDev1.user.id, tokenDev1);
  if (!checkDev1Initial.valid) {
    throw new Error('La sesión de Dispositivo 1 debería ser válida');
  }
  console.log('[Test] ✅ Sesión de Dispositivo 1 verificada como ACTIVA y VÁLIDA.');

  // 2. Simular inicio de sesión concurrente en Dispositivo 2 (misma cuenta)
  const loginDev2 = await usersStore.loginUser(testEmail, testPass);
  if (!loginDev2 || !loginDev2.sessionToken) {
    throw new Error('Fallo el login en Dispositivo 2');
  }
  const tokenDev2 = loginDev2.sessionToken;
  console.log(`[Test] ⚡ Dispositivo 2 inició sesión. Nuevo Token: ${tokenDev2.substring(0, 20)}...`);

  // 3. Verificar que Dispositivo 1 quedó INVALIDADO automáticamente
  const checkDev1After = await usersStore.validateSession(loginDev1.user.id, tokenDev1);
  if (checkDev1After.valid) {
    throw new Error('FALLO: Dispositivo 1 todavía figura activo tras inicio de sesión concurrente!');
  }
  console.log(`[Test] 🔒 ÉXITO: Dispositivo 1 fue invalidado por concurrencia (${checkDev1After.reason})`);

  // 4. Verificar que Dispositivo 2 es la ÚNICA sesión activa
  const checkDev2 = await usersStore.validateSession(loginDev2.user.id, tokenDev2);
  if (!checkDev2.valid) {
    throw new Error('FALLO: Dispositivo 2 debería ser la sesión activa válida');
  }
  console.log('[Test] ✅ Dispositivo 2 es la ÚNICA sesión activa en PostgreSQL.');

  // 5. Simular cierre de sesión
  await usersStore.logoutUser(loginDev2.user.id);
  const checkAfterLogout = await usersStore.validateSession(loginDev2.user.id, tokenDev2);
  if (checkAfterLogout.valid) {
    throw new Error('FALLO: La sesión sigue activa después de cerrar sesión!');
  }
  console.log('[Test] ✅ Sesión cerrada y token limpiado correctamente.');

  console.log('--- [Test] CONTROL DE SESIONES CONCURRENTES COMPLETADO EXITOSAMENTE ---');
}

testConcurrentSessions()
  .catch(e => {
    console.error('[Test] Error en test de concurrencia:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
