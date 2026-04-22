if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
import app from './app';
import { prisma } from './lib/prisma';
import { runAutoArchive } from './services/autoArchive';

// Capturar erros globais para diagnóstico
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const dbHost = process.env.DATABASE_URL?.split('@')[1] || 'URL não definida';
    const hasTimeouts = process.env.DATABASE_URL?.includes('connect_timeout');
    
    console.log(`📡 Database Host: ${dbHost.split(':')[0]}`);
    console.log(`🚀 Env: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configurado ✅' : 'Usando padrão inseguro ⚠️'}`);
    console.log(`⏱️ DB Timeouts: ${hasTimeouts ? 'Configurados ✅' : 'Não detectados (Recomendado: connect_timeout=30) ⚠️'}`);

    // FORÇAR PORTA 80 (PADRÃO UNIVERSAL)
    const FINAL_PORT = 80;

    app.listen(FINAL_PORT, '0.0.0.0', () => {
      console.log(`🧵 Atelier Édite API running on port ${FINAL_PORT}`);
      
      // Monitorar ping do Health Check de forma simplificada
      app.get('/ping', (req, res) => {
        console.log('💓 PING (Health Check) received');
        res.status(200).send('pong');
      });
      
      app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      // Capturar sinal de desligamento para saber quem matou o processo
      process.on('SIGTERM', () => {
        console.log('🛑 SIGTERM received: Server is being killed by the orchestrator (Easypanel/Docker)');
        process.exit(0);
      });

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
