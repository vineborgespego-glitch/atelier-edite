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

    const dbHost = process.env.DATABASE_URL?.split('@')[1] || 'URL não definida';
    console.log(`📡 Database Host: ${dbHost.split(':')[0]}`);
    console.log(`🚀 Env: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configurado ✅' : 'Usando padrão inseguro ⚠️'}`);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🧵 Atelier Édite API running on port ${PORT}`);
      
      // Delay initial run by 1 minute to allow server to stabilize
      setTimeout(() => {
        console.log('🤖 Starting initial auto-archive pass...');
        runAutoArchive();
      }, 60000);

      // Schedule every 24h
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
