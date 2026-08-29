ALTER TABLE artigos_interessantes
  ADD COLUMN conteudo_pago BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE mensagens_contato
  ADD COLUMN email_enviado_em TIMESTAMPTZ,
  ADD COLUMN erro_email VARCHAR(500);

CREATE TABLE pedidos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(36) NOT NULL UNIQUE,
  chave_idempotencia VARCHAR(36) NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  valor_total NUMERIC(14,2) NOT NULL CHECK (valor_total > 0),
  moeda CHAR(3) NOT NULL DEFAULT 'BRL',
  asaas_checkout_id VARCHAR(80) UNIQUE,
  asaas_checkout_url TEXT,
  asaas_checkout_status VARCHAR(40),
  forma_pagamento VARCHAR(80),
  pago_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  expirado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pedidos_status_check CHECK (status IN ('PENDING','PAID','CANCELED','EXPIRED','REFUNDED')),
  CONSTRAINT pedidos_moeda_check CHECK (moeda = 'BRL'),
  CONSTRAINT pedidos_usuario_idempotencia_unique UNIQUE (usuario_id, chave_idempotencia)
);

CREATE TABLE pedido_itens (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  artigo_id BIGINT REFERENCES artigos_interessantes(id) ON DELETE RESTRICT,
  produto_id BIGINT REFERENCES produtos_cafe(id) ON DELETE RESTRICT,
  produto_variante_id BIGINT REFERENCES produtos_cafe_variantes(id) ON DELETE RESTRICT,
  descricao VARCHAR(320) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario NUMERIC(14,2) NOT NULL CHECK (valor_unitario > 0),
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pedido_itens_tipo_check CHECK (tipo IN ('ARTICLE','PRODUCT')),
  CONSTRAINT pedido_itens_referencia_check CHECK (
    (tipo = 'ARTICLE' AND artigo_id IS NOT NULL AND produto_id IS NULL AND produto_variante_id IS NULL)
    OR
    (tipo = 'PRODUCT' AND artigo_id IS NULL AND produto_id IS NOT NULL AND produto_variante_id IS NOT NULL)
  )
);

CREATE TABLE acessos_artigos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  artigo_id BIGINT NOT NULL REFERENCES artigos_interessantes(id) ON DELETE CASCADE,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE RESTRICT,
  concedido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revogado_em TIMESTAMPTZ,
  CONSTRAINT acessos_artigos_usuario_artigo_unique UNIQUE (usuario_id, artigo_id)
);

CREATE TABLE asaas_webhook_eventos (
  id BIGSERIAL PRIMARY KEY,
  evento_id VARCHAR(120) NOT NULL UNIQUE,
  tipo_evento VARCHAR(80) NOT NULL,
  checkout_id VARCHAR(80),
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE SET NULL,
  situacao VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  payload JSONB NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ,
  mensagem VARCHAR(500),
  CONSTRAINT asaas_webhook_eventos_situacao_check CHECK (situacao IN ('RECEIVED','PROCESSED','IGNORED','FAILED'))
);

CREATE TABLE pedido_notificacoes (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
  ultimo_erro VARCHAR(500),
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pedido_notificacoes_tipo_check CHECK (tipo IN ('CUSTOMER_CONFIRMATION','ADMIN_NEW_SALE')),
  CONSTRAINT pedido_notificacoes_status_check CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED')),
  CONSTRAINT pedido_notificacoes_pedido_tipo_unique UNIQUE (pedido_id, tipo)
);

CREATE TABLE contato_tentativas (
  id BIGSERIAL PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  email_hash VARCHAR(64),
  resultado VARCHAR(30) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contato_tentativas_resultado_check CHECK (resultado IN ('ACCEPTED','RATE_LIMITED','HONEYPOT','TOO_FAST','TURNSTILE_FAILED','INVALID'))
);

CREATE INDEX pedidos_usuario_data_idx ON pedidos (usuario_id, criado_em DESC);
CREATE INDEX pedidos_status_data_idx ON pedidos (status, criado_em DESC);
CREATE INDEX pedido_itens_pedido_idx ON pedido_itens (pedido_id);
CREATE INDEX pedido_itens_artigo_idx ON pedido_itens (artigo_id) WHERE artigo_id IS NOT NULL;
CREATE INDEX pedido_itens_produto_idx ON pedido_itens (produto_id, produto_variante_id) WHERE produto_id IS NOT NULL;
CREATE INDEX acessos_artigos_usuario_idx ON acessos_artigos (usuario_id, artigo_id) WHERE revogado_em IS NULL;
CREATE INDEX asaas_webhook_checkout_idx ON asaas_webhook_eventos (checkout_id, recebido_em DESC);
CREATE INDEX pedido_notificacoes_pendentes_idx ON pedido_notificacoes (status, criado_em) WHERE status <> 'SENT';
CREATE INDEX contato_tentativas_ip_data_idx ON contato_tentativas (ip_hash, criado_em DESC);
CREATE INDEX contato_tentativas_email_data_idx ON contato_tentativas (email_hash, criado_em DESC) WHERE email_hash IS NOT NULL;
