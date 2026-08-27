CREATE TABLE IF NOT EXISTS depoimentos (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  texto TEXT NOT NULL,
  identificacao VARCHAR(240) NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artigos_interessantes (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(240) NOT NULL,
  resumo TEXT NOT NULL DEFAULT '',
  autor VARCHAR(160) NOT NULL DEFAULT '',
  fonte VARCHAR(160) NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  imagem_url TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12,2),
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT artigos_interessantes_preco_check CHECK (preco IS NULL OR preco >= 0)
);

CREATE TABLE IF NOT EXISTS livros_interessantes (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(240) NOT NULL,
  autor VARCHAR(160) NOT NULL DEFAULT '',
  resumo TEXT NOT NULL DEFAULT '',
  capa_url TEXT NOT NULL DEFAULT '',
  amazon_url TEXT NOT NULL,
  preco NUMERIC(12,2),
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT livros_interessantes_preco_check CHECK (preco IS NULL OR preco >= 0)
);

CREATE TABLE IF NOT EXISTS produtos_recomendados (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(240) NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12,2),
  link_compra TEXT NOT NULL,
  loja VARCHAR(160) NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT produtos_recomendados_preco_check CHECK (preco IS NULL OR preco >= 0)
);

CREATE TABLE IF NOT EXISTS achadinhos_cafe (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(240) NOT NULL,
  descricao_curta TEXT NOT NULL DEFAULT '',
  imagem_url TEXT NOT NULL DEFAULT '',
  preco NUMERIC(12,2),
  preco_anterior NUMERIC(12,2),
  amazon_url TEXT NOT NULL,
  categoria VARCHAR(120) NOT NULL DEFAULT '',
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT achadinhos_cafe_preco_check CHECK (preco IS NULL OR preco >= 0),
  CONSTRAINT achadinhos_cafe_preco_anterior_check CHECK (preco_anterior IS NULL OR preco_anterior >= 0)
);

INSERT INTO depoimentos (nome,texto,identificacao,avatar_url,ordem,publicado)
SELECT titulo,COALESCE(NULLIF(conteudo,''),titulo),subtitulo,imagem_url,ordem,ativo
FROM conteudos_site c WHERE tipo='depoimento'
AND NOT EXISTS (SELECT 1 FROM depoimentos d WHERE d.nome=c.titulo AND d.texto=COALESCE(NULLIF(c.conteudo,''),c.titulo));

INSERT INTO artigos_interessantes (titulo,resumo,url,imagem_url,ordem,publicado)
SELECT titulo,conteudo,url,imagem_url,ordem,ativo FROM conteudos_site c WHERE tipo='artigo' AND url<>''
AND NOT EXISTS (SELECT 1 FROM artigos_interessantes a WHERE a.titulo=c.titulo AND a.url=c.url);

INSERT INTO livros_interessantes (titulo,resumo,capa_url,amazon_url,ordem,publicado)
SELECT titulo,conteudo,imagem_url,url,ordem,ativo FROM conteudos_site c WHERE tipo='livro' AND url<>''
AND NOT EXISTS (SELECT 1 FROM livros_interessantes l WHERE l.titulo=c.titulo AND l.amazon_url=c.url);

INSERT INTO produtos_recomendados (nome,descricao,imagem_url,link_compra,ordem,publicado)
SELECT titulo,conteudo,imagem_url,url,ordem,ativo FROM conteudos_site c WHERE tipo='produto' AND url<>''
AND NOT EXISTS (SELECT 1 FROM produtos_recomendados p WHERE p.nome=c.titulo AND p.link_compra=c.url);

INSERT INTO achadinhos_cafe (nome,descricao_curta,imagem_url,amazon_url,ordem,publicado)
SELECT titulo,conteudo,imagem_url,url,ordem,ativo FROM conteudos_site c WHERE tipo='achadinho' AND url<>''
AND NOT EXISTS (SELECT 1 FROM achadinhos_cafe a WHERE a.nome=c.titulo AND a.amazon_url=c.url);

DELETE FROM conteudos_site WHERE tipo <> 'sobre';
ALTER TABLE conteudos_site DROP CONSTRAINT IF EXISTS conteudos_site_tipo_check;
ALTER TABLE conteudos_site ADD CONSTRAINT conteudos_site_tipo_check CHECK (tipo = 'sobre');

CREATE INDEX IF NOT EXISTS depoimentos_publicacao_idx ON depoimentos (publicado,ordem,id);
CREATE INDEX IF NOT EXISTS artigos_interessantes_publicacao_idx ON artigos_interessantes (publicado,ordem,id);
CREATE INDEX IF NOT EXISTS livros_interessantes_publicacao_idx ON livros_interessantes (publicado,ordem,id);
CREATE INDEX IF NOT EXISTS produtos_recomendados_publicacao_idx ON produtos_recomendados (publicado,ordem,id);
CREATE INDEX IF NOT EXISTS achadinhos_cafe_publicacao_idx ON achadinhos_cafe (publicado,destaque DESC,ordem,id);

