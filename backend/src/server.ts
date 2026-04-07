import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🧵 Atelier Édite API running on port ${PORT}`);
      console.log(`🌍 Public URL: https://atelier-edite-production.up.railway.app`);
    });
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR: Failed to start server');
    console.error('--- Error Details ---');
    console.error(error.message || error);
    if (error.code) console.error(`Error Code: ${error.code}`);
    console.error('----------------------');
    process.exit(1);
  }
}

main();
