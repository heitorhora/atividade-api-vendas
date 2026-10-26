import { pool } from './db.js';
import { calcularComissao } from './comissao.js';
import { ErroHttp } from './erros.js';
import { consultarVendedor } from './vendedores.js';
import { validarDataHora, validarId, validarTipoCliente, validarValorVenda } from './validacao.js';

const SELECT_VENDAS = `
  SELECT s.id_venda, s.id_vendedor, v.nome AS vendedor, s.id_regiao, r.nome_regiao AS regiao,
         s.data_venda, s.valor_venda, s.tipo_cliente, s.valor_comissao
  FROM vendas s
  JOIN vendedores v ON v.id_vendedor = s.id_vendedor
  JOIN regioes r ON r.id_regiao = s.id_regiao`;

async function consultarRegiao(id, conexao) {
  const [[regiao]] = await conexao.execute('SELECT * FROM regioes WHERE id_regiao = ?', [validarId(id, 'id_regiao')]);
  if (!regiao) throw new ErroHttp(404, 'Região não encontrada');
  return regiao;
}

async function consultarVenda(id, conexao) {
  const [[venda]] = await conexao.execute(`${SELECT_VENDAS} WHERE s.id_venda = ?`, [id]);
  return venda;
}

// Valida, calcula a comissão e grava. id_venda é opcional (gerado automaticamente se omitido).
export async function registrarVenda(dados, conexao = pool) {
  try {
    const { id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente } = dados;
    const idVenda = id_venda === undefined ? null : validarId(id_venda, 'id_venda');
    validarId(id_vendedor, 'id_vendedor');
    validarId(id_regiao, 'id_regiao');
    validarValorVenda(valor_venda);
    validarTipoCliente(tipo_cliente);
    const data = data_venda === undefined ? null : validarDataHora(data_venda);

    const vendedor = await consultarVendedor(id_vendedor, conexao); // 404 se não existe
    if (!vendedor.ativo) throw new ErroHttp(400, 'Vendedor inativo não pode registrar vendas');
    if (idVenda !== null && (await consultarVenda(idVenda, conexao)))
      throw new ErroHttp(409, `Já existe venda com o código ${idVenda}`);

    const valor_comissao = await calcularComissao(
      { valor: valor_venda, percentualBase: vendedor.percentual_base, tipoCliente: tipo_cliente, idRegiao: id_regiao },
      conexao
    ); // 404 se a região não existe
    const [r] = await conexao.execute(
      'INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao) VALUES (?, ?, ?, COALESCE(?, NOW()), ?, ?, ?)',
      [idVenda, Number(id_vendedor), Number(id_regiao), data, valor_venda, tipo_cliente, valor_comissao]
    );
    return await consultarVenda(idVenda ?? r.insertId, conexao);
  } catch (erro) {
    console.error('Erro ao registrar venda:', erro.message);
    throw erro;
  }
}

export async function listarVendas(conexao = pool) {
  try {
    const [vendas] = await conexao.execute(`${SELECT_VENDAS} ORDER BY s.data_venda, s.id_venda`);
    return vendas;
  } catch (erro) {
    console.error('Erro ao consultar vendas:', erro.message);
    throw erro;
  }
}

export async function consultarVendasPorVendedor(id, conexao = pool) {
  try {
    await consultarVendedor(id, conexao);
    const [vendas] = await conexao.execute(`${SELECT_VENDAS} WHERE s.id_vendedor = ? ORDER BY s.data_venda, s.id_venda`, [Number(id)]);
    return vendas;
  } catch (erro) {
    console.error('Erro ao consultar vendas do vendedor:', erro.message);
    throw erro;
  }
}

export async function consultarVendasPorRegiao(id, conexao = pool) {
  try {
    await consultarRegiao(id, conexao);
    const [vendas] = await conexao.execute(`${SELECT_VENDAS} WHERE s.id_regiao = ? ORDER BY s.data_venda, s.id_venda`, [Number(id)]);
    return vendas;
  } catch (erro) {
    console.error('Erro ao consultar vendas da região:', erro.message);
    throw erro;
  }
}

export async function excluirVenda(id, conexao = pool) {
  try {
    const idVenda = validarId(id, 'id_venda');
    if (!(await consultarVenda(idVenda, conexao))) throw new ErroHttp(404, 'Venda não encontrada');
    await conexao.execute('DELETE FROM vendas WHERE id_venda = ?', [idVenda]);
  } catch (erro) {
    console.error('Erro ao excluir venda:', erro.message);
    throw erro;
  }
}
