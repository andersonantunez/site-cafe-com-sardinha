ALTER TABLE frases RENAME TO frases_interessantes;
ALTER INDEX IF EXISTS frases_pkey RENAME TO frases_interessantes_pkey;
ALTER INDEX IF EXISTS frases_publico_ordem_idx RENAME TO frases_interessantes_publico_ordem_idx;

CREATE TABLE livros_interessantes_links (
  id BIGSERIAL PRIMARY KEY,
  livro_id BIGINT NOT NULL REFERENCES livros_interessantes(id) ON DELETE CASCADE,
  loja VARCHAR(120) NOT NULL,
  url TEXT NOT NULL,
  preco NUMERIC(12,2),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT livros_links_preco_check CHECK (preco IS NULL OR preco >= 0),
  CONSTRAINT livros_links_url_check CHECK (url ~ '^https?://')
);

CREATE TABLE achadinhos_cafe_links (
  id BIGSERIAL PRIMARY KEY,
  achadinho_id BIGINT NOT NULL REFERENCES achadinhos_cafe(id) ON DELETE CASCADE,
  loja VARCHAR(120) NOT NULL,
  url TEXT NOT NULL,
  preco NUMERIC(12,2),
  preco_anterior NUMERIC(12,2),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT achadinhos_links_preco_check CHECK (preco IS NULL OR preco >= 0),
  CONSTRAINT achadinhos_links_preco_anterior_check CHECK (preco_anterior IS NULL OR preco_anterior >= 0),
  CONSTRAINT achadinhos_links_url_check CHECK (url ~ '^https?://')
);

INSERT INTO livros_interessantes_links (livro_id,loja,url,preco,ordem)
SELECT id,'Amazon',amazon_url,preco,0 FROM livros_interessantes
WHERE amazon_url<>'' AND NOT EXISTS (
  SELECT 1 FROM livros_interessantes_links link WHERE link.livro_id=livros_interessantes.id
);

INSERT INTO achadinhos_cafe_links (achadinho_id,loja,url,preco,preco_anterior,ordem)
SELECT id,'Amazon',amazon_url,preco,preco_anterior,0 FROM achadinhos_cafe
WHERE amazon_url<>'' AND NOT EXISTS (
  SELECT 1 FROM achadinhos_cafe_links link WHERE link.achadinho_id=achadinhos_cafe.id
);

CREATE INDEX livros_interessantes_links_livro_idx ON livros_interessantes_links (livro_id,ativo,ordem,id);
CREATE INDEX achadinhos_cafe_links_achadinho_idx ON achadinhos_cafe_links (achadinho_id,ativo,ordem,id);

ALTER TABLE livros_interessantes DROP COLUMN amazon_url;
ALTER TABLE livros_interessantes DROP COLUMN preco;
ALTER TABLE achadinhos_cafe DROP COLUMN amazon_url;
ALTER TABLE achadinhos_cafe DROP COLUMN preco;
ALTER TABLE achadinhos_cafe DROP COLUMN preco_anterior;
ALTER TABLE artigos_interessantes DROP COLUMN autor;
ALTER TABLE artigos_interessantes DROP COLUMN fonte;
