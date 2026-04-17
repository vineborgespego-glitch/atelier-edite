if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
import app from './app';
import { prisma } from './lib/prisma';
import { runAutoArchive } from './services/autoArchive';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Ensure ARCHIVED status exists in the enum (safe, idempotent)
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED'`);
      console.log('✅ OrderStatus enum up-to-date');
    } catch (e) {
      console.log('ℹ️ ARCHIVED status already exists or skipped');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🧵 Atelier Édite API running on port ${PORT}`);
      console.log(`🌍 Public URL: https://atelier-edite-production.up.railway.app`);
      
      // Initial run and schedule every 24h
      runAutoArchive();
      setInterval(runAutoArchive, 24 * 60 * 60 * 1000); 
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
