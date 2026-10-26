import { ErroHttp } from './erros.js';

// Bônus por tipo de cliente (%). O bônus regional vem da tabela regioes.
export const BONUS_CLIENTE = { PF: 2, PJ: 3 };

// Regra única: valor × (base + cliente + região) / 100. Percentuais somados, sem composição.
export function calcularValorComissao(valor, percentualBase, tipoCliente, percentualRegiao) {
  const bonusCliente = BONUS_CLIENTE[tipoCliente];
  if (bonusCliente === undefined) throw new ErroHttp(400, "tipo_cliente deve ser 'PF' ou 'PJ'");
  const percentualTotal = Math.round((percentualBase + bonusCliente + percentualRegiao) * 100) / 100;
  return Math.round(valor * percentualTotal) / 100; // arredonda para centavos
}

// Busca o bônus da região no banco e aplica a regra.
export async function calcularComissao({ valor, percentualBase, tipoCliente, idRegiao }, conexao) {
  try {
    const [[regiao]] = await conexao.execute('SELECT percentual_bonus FROM regioes WHERE id_regiao = ?', [idRegiao]);
    if (!regiao) throw new ErroHttp(404, 'Região não encontrada');
    return calcularValorComissao(valor, percentualBase, tipoCliente, regiao.percentual_bonus);
  } catch (erro) {
    console.error('Erro ao calcular comissão:', erro.message);
    throw erro;
  }
}
