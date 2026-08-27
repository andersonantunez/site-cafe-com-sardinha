CREATE TABLE IF NOT EXISTS rentabilidade_mensal (
  id BIGSERIAL PRIMARY KEY,
  competencia DATE NOT NULL,
  rentabilidade_carteira NUMERIC(12,6) NOT NULL,
  rentabilidade_cdi NUMERIC(12,6) NOT NULL,
  percentual_cdi NUMERIC(14,6) NOT NULL,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rentabilidade_mensal_competencia_unique UNIQUE (competencia),
  CONSTRAINT rentabilidade_mensal_primeiro_dia_check CHECK (EXTRACT(DAY FROM competencia) = 1),
  CONSTRAINT rentabilidade_mensal_valores_check CHECK (
    rentabilidade_carteira BETWEEN -100 AND 1000 AND
    rentabilidade_cdi BETWEEN -100 AND 1000 AND
    percentual_cdi BETWEEN -100000 AND 100000
  )
);

CREATE INDEX IF NOT EXISTS rentabilidade_mensal_publicacao_idx
  ON rentabilidade_mensal (publicado, competencia);

CREATE TABLE IF NOT EXISTS compras_usuario (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data_compra TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo VARCHAR(30) NOT NULL,
  descricao VARCHAR(240) NOT NULL,
  valor_pago NUMERIC(14,2) NOT NULL CHECK (valor_pago >= 0),
  forma_pagamento VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'comprado',
  vencimento DATE,
  arquivo_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compras_usuario_tipo_check CHECK (tipo IN ('ebook','caneca','camiseta','blusao','assinatura','consultoria','outro')),
  CONSTRAINT compras_usuario_status_check CHECK (status IN ('comprado','cancelado')),
  CONSTRAINT compras_usuario_arquivo_check CHECK (arquivo_url IS NULL OR arquivo_url LIKE '/%')
);

CREATE INDEX IF NOT EXISTS compras_usuario_consulta_idx
  ON compras_usuario (usuario_id, status, data_compra DESC);

CREATE TABLE IF NOT EXISTS mensagens_contato (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(320) NOT NULL,
  assunto VARCHAR(240) NOT NULL,
  mensagem TEXT NOT NULL,
  ip_hash VARCHAR(64) NOT NULL,
  user_agent VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'nova',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mensagens_contato_status_check CHECK (status IN ('nova','lida','respondida','arquivada'))
);

CREATE INDEX IF NOT EXISTS mensagens_contato_status_data_idx
  ON mensagens_contato (status, criado_em DESC);
