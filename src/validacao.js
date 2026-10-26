import { ErroHttp } from './erros.js';

export function validarId(valor, nome = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, `${nome} deve ser um inteiro positivo`);
  return n;
}

function numero(valor, nome) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new ErroHttp(400, `${nome} deve ser numérico`);
  if (Math.round(valor * 100) / 100 !== valor) throw new ErroHttp(400, `${nome} aceita no máximo 2 casas decimais`);
  return valor;
}

export function validarMeta(valor) {
  if (numero(valor, 'meta_mensal') < 0) throw new ErroHttp(400, 'meta_mensal não pode ser negativa');
  return valor;
}

export function validarPercentual(valor, nome = 'percentual_base') {
  if (numero(valor, nome) < 0 || valor > 100) throw new ErroHttp(400, `${nome} deve estar entre 0 e 100`);
  return valor;
}

export function validarValorVenda(valor) {
  if (numero(valor, 'valor_venda') <= 0) throw new ErroHttp(400, 'valor_venda deve ser positivo');
  return valor;
}

export function validarNome(nome) {
  if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100)
    throw new ErroHttp(400, 'nome é obrigatório (até 100 caracteres)');
  return nome.trim();
}

export function validarTipoCliente(tipo) {
  if (tipo !== 'PF' && tipo !== 'PJ') throw new ErroHttp(400, "tipo_cliente deve ser 'PF' ou 'PJ'");
  return tipo;
}

// Aceita 'YYYY-MM-DD' ou 'YYYY-MM-DD HH:MM[:SS]' (também com 'T'). Devolve no formato do DATETIME do MySQL.
export function validarDataHora(valor) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?$/.exec(String(valor));
  if (!m || Number.isNaN(Date.parse(m[1]))) throw new ErroHttp(400, 'data_venda inválida (use YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS)');
  const [ano, mes, dia] = m[1].split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) throw new ErroHttp(400, 'data_venda inválida');
  return `${m[1]} ${m[2] ?? '00:00'}:${m[3] ?? '00'}`;
}

// Data simples YYYY-MM-DD (relatório).
export function validarData(valor, nome) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) throw new ErroHttp(400, `${nome} é obrigatória no formato YYYY-MM-DD`);
  return validarDataHora(valor).slice(0, 10);
}
