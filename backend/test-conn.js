const { Client } = require('pg');
require('dotenv').config();

// Use the URL from .env or construct it
const connectionString = process.env.DATABASE_URL;

console.log('Tentando conectar ao banco de dados...');
console.log('Host:', connectionString.split('@')[1].split(':')[0]);

const client = new Client({
  connectionString: connectionString,
});

client.connect()
  .then(() => {
    console.log('✅ SUCESSO: Conectado ao banco de dados!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Hora no banco:', res.rows[0].now);
    return client.end();
  })
  .catch(err => {
    console.error('❌ ERRO de conexão:', err.message);
    if (err.message.includes('ETIMEDOUT')) {
      console.log('\nDica: Isso geralmente significa que o servidor está bloqueando o seu IP.');
    }
  });
