-- Sistema de Vendas com Comissões, Metas e Performance
-- Executar: mysql -u root -p < sql/db_vendas.sql   (recria as tabelas e os dados de teste; requer MySQL 8.0.16+)

CREATE DATABASE IF NOT EXISTS db_vendas CHARACTER SET utf8mb4;
USE db_vendas;

DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS vendedores;
DROP TABLE IF EXISTS regioes;

CREATE TABLE vendedores (
  id_vendedor     INT AUTO_INCREMENT PRIMARY KEY,
  nome            VARCHAR(100)  NOT NULL,
  meta_mensal     DECIMAL(12,2) NOT NULL,
  percentual_base DECIMAL(5,2)  NOT NULL,
  ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_vendedor_meta CHECK (meta_mensal >= 0),
  CONSTRAINT ck_vendedor_perc CHECK (percentual_base BETWEEN 0 AND 100)
);

CREATE TABLE regioes (
  id_regiao        INT AUTO_INCREMENT PRIMARY KEY,
  nome_regiao      VARCHAR(50)  NOT NULL UNIQUE,
  percentual_bonus DECIMAL(5,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_regiao_nome  CHECK (nome_regiao IN ('Norte', 'Nordeste', 'Sudeste', 'Sul')),
  CONSTRAINT ck_regiao_bonus CHECK (percentual_bonus >= 0)
);

CREATE TABLE vendas (
  id_venda       INT AUTO_INCREMENT PRIMARY KEY,
  id_vendedor    INT           NOT NULL,
  id_regiao      INT           NOT NULL,
  data_venda     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_venda    DECIMAL(12,2) NOT NULL,
  tipo_cliente   ENUM('PF','PJ') NOT NULL,
  valor_comissao DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_venda_vendedor FOREIGN KEY (id_vendedor) REFERENCES vendedores (id_vendedor),
  CONSTRAINT fk_venda_regiao   FOREIGN KEY (id_regiao)   REFERENCES regioes (id_regiao),
  CONSTRAINT ck_venda_valor    CHECK (valor_venda > 0),
  CONSTRAINT ck_venda_comissao CHECK (valor_comissao >= 0),
  INDEX idx_venda_data (data_venda),
  INDEX idx_venda_vendedor (id_vendedor),
  INDEX idx_venda_regiao (id_regiao)
);

-- Dados de teste ------------------------------------------------------------

INSERT INTO regioes (id_regiao, nome_regiao, percentual_bonus) VALUES
  (1, 'Norte', 1.00), (2, 'Nordeste', 1.00), (3, 'Sudeste', 0.00), (4, 'Sul', 0.50);

INSERT INTO vendedores (id_vendedor, nome, meta_mensal, percentual_base) VALUES
  (1, 'Ana Souza',     10000.00, 5.00),
  (2, 'Bruno Lima',     8000.00, 4.00),
  (3, 'Carla Mendes',  15000.00, 6.00),
  (4, 'Diego Alves',    5000.00, 3.50),
  (5, 'Elisa Ribeiro', 12000.00, 5.00);

-- valor_comissao = valor_venda × (percentual_base + bônus cliente [PF 2 / PJ 3] + bônus região) / 100
INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao) VALUES
(1, 1, 1, '2026-10-02 10:15:00', 4000.00, 'PJ', 360.00),
(2, 1, 3, '2026-10-10 14:30:00', 3500.00, 'PF', 245.00),
(3, 1, 4, '2026-10-18 09:45:00', 3200.00, 'PJ', 272.00),
(4, 2, 2, '2026-10-03 11:00:00', 2500.00, 'PF', 175.00),
(5, 2, 1, '2026-10-12 16:20:00', 3000.00, 'PJ', 240.00),
(6, 2, 3, '2026-10-20 13:10:00', 1800.00, 'PF', 108.00),
(7, 3, 3, '2026-10-05 10:00:00', 6000.00, 'PJ', 540.00),
(8, 3, 4, '2026-10-14 15:40:00', 5200.00, 'PJ', 494.00),
(9, 3, 2, '2026-10-22 12:25:00', 4800.00, 'PF', 432.00),
(10, 4, 1, '2026-10-04 09:30:00', 2000.00, 'PJ', 150.00),
(11, 4, 4, '2026-10-16 17:05:00', 1500.00, 'PF', 90.00),
(12, 4, 2, '2026-10-25 10:50:00', 2200.00, 'PJ', 165.00),
(13, 5, 3, '2026-10-08 14:00:00', 2000.00, 'PF', 140.00),
(14, 5, 1, '2026-10-19 11:35:00', 1500.00, 'PF', 120.00),
(15, 5, 4, '2026-10-27 16:00:00', 1800.00, 'PJ', 153.00);
