CREATE TABLE IF NOT EXISTS frases (
  id BIGSERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  publico BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS postagens (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(240) NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  url TEXT NOT NULL,
  publico BOOLEAN NOT NULL DEFAULT TRUE,
  data_publicacao DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS frases_publico_ordem_idx ON frases (publico, ordem);
CREATE INDEX IF NOT EXISTS postagens_publico_data_idx ON postagens (publico, data_publicacao DESC);
