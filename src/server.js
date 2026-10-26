import { app } from './app.js';
import { pool } from './db.js';

const porta = Number(process.env.PORT) || 3000;

try {
  await pool.query('SELECT 1'); // falha cedo se o banco estiver inacessível
} catch (erro) {
  console.error('Não foi possível conectar ao MySQL:', erro.code ?? erro.message);
  process.exit(1);
}

app.listen(porta, () => console.log(`API de vendas em http://localhost:${porta}`));
