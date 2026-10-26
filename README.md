# API de Vendas, Comissões e Metas

Back-End em **Node.js (JavaScript, ES Modules) + Express + MySQL** (`mysql2/promise`, `async/await`, consultas parametrizadas). Cadastra vendedores e vendas, calcula comissões automaticamente e gera relatório de performance.

## Requisitos

- Node.js 18 ou superior
- MySQL 8.0.16 ou superior (usa restrições `CHECK`)

## Instalação e execução

```bash
# 1. dependências
npm install

# 2. banco, tabelas e dados de teste (5 vendedores, 4 regiões, 15 vendas)
mysql -u root -p < sql/db_vendas.sql

# 3. credenciais (o .env não vai para o git)
cp .env.example .env      # Windows: copy .env.example .env
# edite .env com usuário e senha do seu MySQL

# 4. subir a API
npm start                 # http://localhost:3000
```

Variáveis do `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`. Se o banco estiver inacessível, o servidor avisa no console e encerra; se cair depois, a API responde `503`.

Testes automáticos (não precisam de MySQL): `npm test`

## Estrutura

```
sql/db_vendas.sql        criação do banco, tabelas, FKs, CHECKs e dados de teste
src/server.js            conecta ao banco e sobe o Express
src/app.js               rotas, respostas JSON e tratamento de erros HTTP
src/db.js                pool mysql2/promise (credenciais do .env)
src/vendedores.js        cadastrarVendedor, listarVendedores, consultarVendedor, atualizarVendedor, desativarVendedor
src/vendas.js            registrarVenda, listarVendas, consultarVendasPorVendedor/Regiao, excluirVenda
src/comissao.js          calcularComissao (única regra de comissão)
src/relatorios.js        gerarRelatorioPerformance
src/validacao.js         validações de entrada
tests/                   testes com node:test
docs/                    coleção Postman/Insomnia e pasta de capturas
```

## Regra de comissão

`comissão = valor_venda × (percentual_base + bônus_cliente + bônus_região) / 100` — percentuais somados, sem composição.

| Cliente | Bônus | Região | Bônus |
|---|---|---|---|
| PF | 2% | Norte | 1% |
| PJ | 3% | Nordeste | 1% |
| | | Sudeste | 0% |
| | | Sul | 0,5% |

Exemplo: R$ 2.000, PJ, Norte, base 5% → 9% → **R$ 180,00**. O bônus regional vem da tabela `regioes`; o de cliente está em `src/comissao.js`. A comissão é gravada em `vendas.valor_comissao` no momento da venda: alterar o `percentual_base` depois não muda vendas já registradas.

## Endpoints

| Método | Rota | Operação | Sucesso |
|---|---|---|---|
| POST | `/vendedores` | Cadastrar (`nome`, `meta_mensal`, `percentual_base`) | 201 |
| GET | `/vendedores` | Listar | 200 |
| GET | `/vendedores/:id` | Consultar | 200 |
| PUT | `/vendedores/:id` | Atualizar `meta_mensal` e/ou `percentual_base` | 200 |
| PATCH | `/vendedores/:id/desativar` | Desativar (mantém histórico) | 200 |
| POST | `/vendas` | Registrar (`id_vendedor`, `id_regiao`, `valor_venda`, `tipo_cliente`; opcionais `id_venda`, `data_venda`) | 201 |
| GET | `/vendas` | Listar | 200 |
| GET | `/vendas/vendedor/:id` | Por vendedor | 200 |
| GET | `/vendas/regiao/:id` | Por região | 200 |
| DELETE | `/vendas/:id` | Excluir | 200 |
| GET | `/relatorios/performance?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Relatório gerencial | 200 |

Erros (`{ "erro": "mensagem" }`): `400` dados inválidos ou vendedor inativo · `404` vendedor/região/venda inexistente · `409` código de venda duplicado · `503` banco indisponível · `500` erro interno.

`id_venda` é o código único da venda: se omitido, o MySQL gera; se enviado e já existir, retorna 409. `data_venda` omitida usa a data/hora atual.

## Relatório de performance

Período `inicio`–`fim` (fim inclusivo). Todos os indicadores saem de SQL com `JOIN`, `GROUP BY`, `SUM()`, `AVG()`, `COUNT()`:
total de vendas, vendas por região, vendas por tipo de cliente, melhor vendedor (maior valor vendido), maior comissão acumulada, metas atingidas, comissão média geral e por região.

Decisões: o **mês de referência das metas é o mês de `inicio`** (soma das vendas do vendedor ativo nesse mês calendário comparada à `meta_mensal`); em empate de "melhor vendedor"/"maior comissão" retorna um só.

## Testes obrigatórios (coleção `docs/api-vendas.postman_collection.json`)

Importe a coleção no Postman, Insomnia ou Thunder Client (variável `baseUrl`). Ordem sugerida e prints esperados em `docs/capturas/`:

| # | Teste | Requisição da coleção |
|---|---|---|
| 9 | Cadastro de vendedor e venda com comissão correta | Cadastrar vendedor; Registrar venda (R$ 180,00) |
| 10 | Código de venda duplicado | Registrar com `id_venda: 100` duas vezes → 409 |
| 11 | Vendedor inexistente ou inativo | Desativar vendedor 5, depois vender para 5 → 400; vendedor 999 → 404 |
| 12 | Atualização de meta mensal | PUT `/vendedores/1` |
| 13 | Consulta por região e vendedor | `/vendas/regiao/3`, `/vendas/vendedor/1` |
| 14 | Relatório mensal com metas | `/relatorios/performance?inicio=2026-10-01&fim=2026-10-31` |
| 15 | Erro de conexão/consulta | Pare o MySQL e chame `GET /vendedores` → 503 |

Com os dados do script, em outubro/2026 atingem a meta: Ana (R$ 10.700 de 10.000), Carla (R$ 16.000 de 15.000) e Diego (R$ 5.700 de 5.000); Bruno e Elisa não.
