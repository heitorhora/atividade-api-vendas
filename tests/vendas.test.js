import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarVenda } from '../src/vendas.js';
import { gerarRelatorioPerformance } from '../src/relatorios.js';

// Conexão falsa: responde conforme o SQL recebido (não precisa de MySQL).
function fake({ vendedor, venda, regiao = { percentual_bonus: 1 } } = {}) {
  const chamadas = [];
  return {
    chamadas,
    execute: async (sql, params) => {
      chamadas.push({ sql, params });
      if (sql.includes('FROM vendedores WHERE')) return [vendedor ? [vendedor] : []];
      if (sql.includes('FROM regioes WHERE')) return [regiao ? [regiao] : []];
      if (sql.includes('INSERT INTO vendas')) return [{ insertId: 7 }];
      if (sql.includes('FROM vendas s')) return [venda ? [venda] : []];
      throw new Error('SQL inesperado: ' + sql);
    }
  };
}
const ativo = { id_vendedor: 1, ativo: 1, percentual_base: 5 };
const dados = { id_vendedor: 1, id_regiao: 1, valor_venda: 2000, tipo_cliente: 'PJ' };

test('registra venda com comissão correta (R$ 180,00)', async () => {
  const c = fake({ vendedor: ativo, venda: { id_venda: 7, valor_comissao: 180 } });
  const venda = await registrarVenda(dados, c);
  assert.equal(venda.valor_comissao, 180);
  const insert = c.chamadas.find((x) => x.sql.includes('INSERT INTO vendas'));
  assert.equal(insert.params[6], 180);
});

test('código de venda duplicado => 409', async () => {
  const c = fake({ vendedor: ativo, venda: { id_venda: 5 } });
  await assert.rejects(registrarVenda({ ...dados, id_venda: 5 }, c), { status: 409 });
});

test('vendedor inexistente => 404', async () => {
  await assert.rejects(registrarVenda(dados, fake({ vendedor: null })), { status: 404 });
});

test('vendedor inativo => 400', async () => {
  await assert.rejects(registrarVenda(dados, fake({ vendedor: { ...ativo, ativo: 0 } })), { status: 400 });
});

test('região inexistente => 404', async () => {
  await assert.rejects(registrarVenda(dados, fake({ vendedor: ativo, regiao: null })), { status: 404 });
});

test('valor zero, negativo ou tipo inválido => 400 (sem consultar o banco)', async () => {
  const c = fake({ vendedor: ativo });
  await assert.rejects(registrarVenda({ ...dados, valor_venda: 0 }, c), { status: 400 });
  await assert.rejects(registrarVenda({ ...dados, valor_venda: -10 }, c), { status: 400 });
  await assert.rejects(registrarVenda({ ...dados, tipo_cliente: 'XX' }, c), { status: 400 });
  assert.equal(c.chamadas.length, 0);
});

test('relatório: datas ausentes, inválidas ou invertidas => 400', async () => {
  await assert.rejects(gerarRelatorioPerformance(undefined, '2026-10-31', fake()), { status: 400 });
  await assert.rejects(gerarRelatorioPerformance('2026-13-01', '2026-10-31', fake()), { status: 400 });
  await assert.rejects(gerarRelatorioPerformance('2026-10-31', '2026-10-01', fake()), { status: 400 });
});

test('erro de conexão do banco é propagado', async () => {
  const c = { execute: async () => { throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }); } };
  await assert.rejects(registrarVenda(dados, c), { code: 'ECONNREFUSED' });
});
