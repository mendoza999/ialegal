import { prisma } from '../server/db';

async function main() {
  try {
    const rawRamas = await prisma.$queryRawUnsafe('SELECT * FROM "ramasDelDerecho"');
    console.log('ramasDelDerecho rows:', rawRamas);

    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ramasDelDerecho'
    `);
    console.log('ramasDelDerecho columns:', cols);
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
