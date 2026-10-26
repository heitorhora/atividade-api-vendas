import { pool } from './db.js';
import { ErroHttp } from './erros.js';
import { validarData } from './validacao.js';

// Filtro de período: fim inclusivo (até 23:59:59 do dia final).
const PERIODO = 's.data_venda >= ? AND s.data_venda < DATE_ADD(?, INTERVAL 1 DAY)';

// Mês de referência das metas = mês da data inicial.
function limitesDoMes(inicio) {
  const [ano, mes] = inicio.split('-').map(Number);
  const prox = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  return { ini: `${ano}-${String(mes).padStart(2, '0')}-01`, prox };
}

export async function gerarRelatorioPerformance(inicioBruto, fimBruto, conexao = pool) {
  try {
    const inicio = validarData(inicioBruto, 'inicio');
    const fim = validarData(fimBruto, 'fim');
    if (inicio > fim) throw new ErroHttp(400, 'inicio não pode ser maior que fim');
    const p = [inicio, fim];

    const [[geral]] = await conexao.execute(
      `SELECT COUNT(*) AS total_vendas, COALESCE(SUM(s.valor_venda), 0) AS valor_total,
              COALESCE(ROUND(AVG(s.valor_comissao), 2), 0) AS comissao_media_geral
       FROM vendas s WHERE ${PERIODO}`, p);

    const [porRegiao] = await conexao.execute(
      `SELECT r.id_regiao, r.nome_regiao AS regiao, COUNT(s.id_venda) AS quantidade,
              COALESCE(SUM(s.valor_venda), 0) AS total_vendido,
              COALESCE(ROUND(AVG(s.valor_comissao), 2), 0) AS comissao_media
       FROM regioes r LEFT JOIN vendas s ON s.id_regiao = r.id_regiao AND ${PERIODO}
       GROUP BY r.id_regiao, r.nome_regiao ORDER BY r.id_regiao`, p);

    const [porTipo] = await conexao.execute(
      `SELECT s.tipo_cliente, COUNT(*) AS quantidade, SUM(s.valor_venda) AS total_vendido
       FROM vendas s WHERE ${PERIODO} GROUP BY s.tipo_cliente ORDER BY s.tipo_cliente`, p);

    const [[melhorVendedor = null]] = await conexao.execute(
      `SELECT v.id_vendedor, v.nome, SUM(s.valor_venda) AS total_vendido
       FROM vendas s JOIN vendedores v ON v.id_vendedor = s.id_vendedor
       WHERE ${PERIODO} GROUP BY v.id_vendedor, v.nome ORDER BY total_vendido DESC LIMIT 1`, p);

    const [[maiorComissao = null]] = await conexao.execute(
      `SELECT v.id_vendedor, v.nome, SUM(s.valor_comissao) AS comissao_acumulada
       FROM vendas s JOIN vendedores v ON v.id_vendedor = s.id_vendedor
       WHERE ${PERIODO} GROUP BY v.id_vendedor, v.nome ORDER BY comissao_acumulada DESC LIMIT 1`, p);

    const { ini, prox } = limitesDoMes(inicio);
    const [metas] = await conexao.execute(
      `SELECT v.id_vendedor, v.nome, v.meta_mensal, COALESCE(SUM(s.valor_venda), 0) AS total_no_mes
       FROM vendedores v
       LEFT JOIN vendas s ON s.id_vendedor = v.id_vendedor AND s.data_venda >= ? AND s.data_venda < ?
       WHERE v.ativo = TRUE GROUP BY v.id_vendedor, v.nome, v.meta_mensal ORDER BY v.id_vendedor`, [ini, prox]);
    const detalhes = metas.map((m) => ({ ...m, atingiu_meta: m.total_no_mes >= m.meta_mensal }));

    return {
      periodo: { inicio, fim },
      total_vendas: geral.total_vendas,
      valor_total_vendido: geral.valor_total,
      vendas_por_regiao: porRegiao,
      vendas_por_tipo_cliente: porTipo,
      melhor_vendedor: melhorVendedor,
      maior_comissao: maiorComissao,
      metas: {
        mes_referencia: ini.slice(0, 7),
        atingidas: detalhes.filter((m) => m.atingiu_meta).length,
        vendedores: detalhes
      },
      comissao_media_geral: geral.comissao_media_geral,
      comissao_media_por_regiao: porRegiao.map((r) => ({ regiao: r.regiao, comissao_media: r.comissao_media }))
    };
  } catch (erro) {
    console.error('Erro ao gerar relatório de performance:', erro.message);
    throw erro;
  }
}
