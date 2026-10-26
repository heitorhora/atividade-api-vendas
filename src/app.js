import express from 'express';
import { atualizarVendedor, cadastrarVendedor, consultarVendedor, desativarVendedor, listarVendedores } from './vendedores.js';
import { consultarVendasPorRegiao, consultarVendasPorVendedor, excluirVenda, listarVendas, registrarVenda } from './vendas.js';
import { gerarRelatorioPerformance } from './relatorios.js';
import { ErroHttp } from './erros.js';

const CODIGOS_CONEXAO = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'];

export const app = express();
app.use(express.json());

// Corpo ausente (req.body undefined) vira objeto vazio para a validação responder 400.
const corpo = (req) => req.body ?? {};

app.post('/vendedores', async (req, res) => res.status(201).json(await cadastrarVendedor(corpo(req))));
app.get('/vendedores', async (req, res) => res.json(await listarVendedores()));
app.get('/vendedores/:id', async (req, res) => res.json(await consultarVendedor(req.params.id)));
app.put('/vendedores/:id', async (req, res) => res.json(await atualizarVendedor(req.params.id, corpo(req))));
app.patch('/vendedores/:id/desativar', async (req, res) => res.json(await desativarVendedor(req.params.id)));

app.post('/vendas', async (req, res) => res.status(201).json(await registrarVenda(corpo(req))));
app.get('/vendas', async (req, res) => res.json(await listarVendas()));
app.get('/vendas/vendedor/:id', async (req, res) => res.json(await consultarVendasPorVendedor(req.params.id)));
app.get('/vendas/regiao/:id', async (req, res) => res.json(await consultarVendasPorRegiao(req.params.id)));
app.delete('/vendas/:id', async (req, res) => {
  await excluirVenda(req.params.id);
  res.json({ mensagem: 'Venda excluída com sucesso' });
});

app.get('/relatorios/performance', async (req, res) =>
  res.json(await gerarRelatorioPerformance(req.query.inicio, req.query.fim)));

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// Express 5 encaminha rejeições de handlers async para cá.
app.use((erro, req, res, next) => {
  if (erro instanceof ErroHttp) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Registro duplicado (código de venda já existe)' });
  if (CODIGOS_CONEXAO.includes(erro.code)) {
    return res.status(503).json({ erro: 'Banco de dados indisponível. Verifique a conexão e as credenciais.' });
  }
  res.status(500).json({ erro: 'Erro interno do servidor' }); // detalhes ficam só no log
});
