import { pool } from './db.js';
import { ErroHttp } from './erros.js';
import { validarId, validarMeta, validarNome, validarPercentual } from './validacao.js';

export async function cadastrarVendedor({ nome, meta_mensal, percentual_base }, conexao = pool) {
  try {
    const nomeOk = validarNome(nome);
    validarMeta(meta_mensal);
    validarPercentual(percentual_base);
    const [r] = await conexao.execute(
      'INSERT INTO vendedores (nome, meta_mensal, percentual_base) VALUES (?, ?, ?)',
      [nomeOk, meta_mensal, percentual_base]
    );
    return await consultarVendedor(r.insertId, conexao);
  } catch (erro) {
    console.error('Erro ao cadastrar vendedor:', erro.message);
    throw erro;
  }
}

export async function listarVendedores(conexao = pool) {
  try {
    const [vendedores] = await conexao.execute('SELECT * FROM vendedores ORDER BY id_vendedor');
    return vendedores;
  } catch (erro) {
    console.error('Erro ao consultar vendedores:', erro.message);
    throw erro;
  }
}

export async function consultarVendedor(id, conexao = pool) {
  try {
    const [[vendedor]] = await conexao.execute('SELECT * FROM vendedores WHERE id_vendedor = ?', [validarId(id)]);
    if (!vendedor) throw new ErroHttp(404, 'Vendedor não encontrado');
    return vendedor;
  } catch (erro) {
    console.error('Erro ao consultar vendedor:', erro.message);
    throw erro;
  }
}

// Atualiza meta mensal e/ou percentual base. Vendas já registradas mantêm a comissão original.
export async function atualizarVendedor(id, { meta_mensal, percentual_base }, conexao = pool) {
  try {
    if (meta_mensal === undefined && percentual_base === undefined)
      throw new ErroHttp(400, 'Informe meta_mensal e/ou percentual_base');
    if (meta_mensal !== undefined) validarMeta(meta_mensal);
    if (percentual_base !== undefined) validarPercentual(percentual_base);
    await consultarVendedor(id, conexao);
    await conexao.execute(
      'UPDATE vendedores SET meta_mensal = COALESCE(?, meta_mensal), percentual_base = COALESCE(?, percentual_base) WHERE id_vendedor = ?',
      [meta_mensal ?? null, percentual_base ?? null, Number(id)]
    );
    return await consultarVendedor(id, conexao);
  } catch (erro) {
    console.error('Erro ao atualizar vendedor:', erro.message);
    throw erro;
  }
}

// Soft delete: o histórico de vendas fica preservado.
export async function desativarVendedor(id, conexao = pool) {
  try {
    await consultarVendedor(id, conexao);
    await conexao.execute('UPDATE vendedores SET ativo = FALSE WHERE id_vendedor = ?', [Number(id)]);
    return await consultarVendedor(id, conexao);
  } catch (erro) {
    console.error('Erro ao desativar vendedor:', erro.message);
    throw erro;
  }
}
