CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(320) NOT NULL,
  senha_hash TEXT,
  google_sub VARCHAR(255),
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_email_unique UNIQUE (email),
  CONSTRAINT usuarios_google_sub_unique UNIQUE (google_sub),
  CONSTRAINT usuarios_autenticacao_check CHECK (senha_hash IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS carteira_importacoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  hash_arquivo VARCHAR(64) NOT NULL,
  quantidade_titulos INTEGER NOT NULL,
  data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carteira_titulos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  importacao_id BIGINT NOT NULL REFERENCES carteira_importacoes(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  produto TEXT NOT NULL,
  tipo TEXT NOT NULL,
  valor_investido NUMERIC(20,2) NOT NULL,
  emissao DATE NOT NULL,
  vencimento DATE NOT NULL,
  dias_corridos INTEGER NOT NULL,
  dias_uteis INTEGER NOT NULL,
  taxa TEXT NOT NULL,
  tipo_indexador TEXT NOT NULL,
  preco_unitario NUMERIC(20,8) NOT NULL,
  quantidade NUMERIC(20,8) NOT NULL,
  valor_liquido NUMERIC(20,2) NOT NULL,
  rentabilidade_liquida NUMERIC(20,10) NOT NULL,
  rentabilidade_media NUMERIC(20,12) NOT NULL,
  linha_origem INTEGER NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carteira_titulos_usuario_codigo_unique UNIQUE (usuario_id, codigo)
);

CREATE INDEX IF NOT EXISTS usuarios_email_idx ON usuarios (LOWER(email));
CREATE INDEX IF NOT EXISTS carteira_importacoes_usuario_data_idx ON carteira_importacoes (usuario_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS carteira_titulos_usuario_idx ON carteira_titulos (usuario_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS carteira_titulos_vencimento_idx ON carteira_titulos (usuario_id, vencimento);
CREATE INDEX IF NOT EXISTS carteira_titulos_indexador_idx ON carteira_titulos (usuario_id, tipo_indexador);
