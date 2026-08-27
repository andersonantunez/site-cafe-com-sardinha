CREATE TABLE IF NOT EXISTS carteira_configuracoes (
  usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  mostrar_vencimento BOOLEAN NOT NULL DEFAULT TRUE,
  mostrar_tipo_produto BOOLEAN NOT NULL DEFAULT TRUE,
  mostrar_taxa BOOLEAN NOT NULL DEFAULT TRUE,
  compartilhamento_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  token_hash VARCHAR(64),
  token_criado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carteira_configuracoes_token_unique UNIQUE (token_hash),
  CONSTRAINT carteira_configuracoes_token_check CHECK (
    (compartilhamento_ativo = FALSE) OR (token_hash IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  administrador_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT configuracoes_sistema_singleton CHECK (id = 1)
);

INSERT INTO configuracoes_sistema (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS conteudos_site (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  subtitulo VARCHAR(320) NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conteudos_site_tipo_check CHECK (tipo IN (
    'sobre', 'achadinho', 'produto', 'livro', 'artigo', 'frase',
    'postagem', 'depoimento'
  ))
);

CREATE INDEX IF NOT EXISTS carteira_configuracoes_compartilhamento_idx
  ON carteira_configuracoes (token_hash) WHERE compartilhamento_ativo;
CREATE INDEX IF NOT EXISTS conteudos_site_tipo_ordem_idx
  ON conteudos_site (tipo, ativo, ordem, id);

