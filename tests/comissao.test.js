import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularComissao, calcularValorComissao } from '../src/comissao.js';

test('exemplo do enunciado: R$ 2.000, PJ, Norte, base 5% => R$ 180,00', () => {
  assert.equal(calcularValorComissao(2000, 5, 'PJ', 1), 180);
});

test('PF no Sudeste: base 4% + 2% + 0% sobre R$ 1.800', () => {
  assert.equal(calcularValorComissao(1800, 4, 'PF', 0), 108);
});

test('PJ no Sul: bônus regional 0,5% e arredondamento em centavos', () => {
  assert.equal(calcularValorComissao(3200, 5, 'PJ', 0.5), 272);
  assert.equal(calcularValorComissao(99.99, 3.5, 'PF', 0.5), 6); // 6% de 99,99 = 5,9994 => 6,00
});

test('tipo de cliente inválido => 400', () => {
  assert.throws(() => calcularValorComissao(100, 5, 'XX', 1), { status: 400 });
});

test('calcularComissao busca o bônus da região no banco', async () => {
  const conexao = { execute: async () => [[{ percentual_bonus: 1 }]] };
  const v = await calcularComissao({ valor: 2000, percentualBase: 5, tipoCliente: 'PJ', idRegiao: 1 }, conexao);
  assert.equal(v, 180);
});

test('região inexistente => 404', async () => {
  const conexao = { execute: async () => [[]] };
  await assert.rejects(
    calcularComissao({ valor: 100, percentualBase: 5, tipoCliente: 'PF', idRegiao: 99 }, conexao),
    { status: 404 }
  );
});
