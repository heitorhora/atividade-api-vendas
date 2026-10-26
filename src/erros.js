// Erro com código HTTP; lançado pelas funções e convertido em JSON pelo middleware da API.
export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
