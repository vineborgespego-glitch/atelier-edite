import 'dotenv/config';
import app from './app';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🧵 Atelier Édite API running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
