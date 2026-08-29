CREATE TABLE lojas_comercio (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lojas_comercio_nome_unique UNIQUE (nome)
);

INSERT INTO lojas_comercio (nome,ordem) VALUES
  ('Amazon',1),('Shopee',2),('Mercado Livre',3),('Magazine Luiza',4),
  ('Americanas',5),('Casas Bahia',6),('AliExpress',7),('KaBuM!',8),
  ('Carrefour',9),('Ponto',10),('Estante Virtual',11)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO lojas_comercio (nome,ordem)
SELECT DISTINCT loja,100 FROM livros_interessantes_links WHERE loja<>''
UNION
SELECT DISTINCT loja,100 FROM achadinhos_cafe_links WHERE loja<>''
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE livros_interessantes_links ADD COLUMN loja_id BIGINT REFERENCES lojas_comercio(id);
ALTER TABLE achadinhos_cafe_links ADD COLUMN loja_id BIGINT REFERENCES lojas_comercio(id);

UPDATE livros_interessantes_links link SET loja_id=loja.id
FROM lojas_comercio loja WHERE LOWER(loja.nome)=LOWER(link.loja);
UPDATE achadinhos_cafe_links link SET loja_id=loja.id
FROM lojas_comercio loja WHERE LOWER(loja.nome)=LOWER(link.loja);

ALTER TABLE livros_interessantes_links ALTER COLUMN loja_id SET NOT NULL;
ALTER TABLE achadinhos_cafe_links ALTER COLUMN loja_id SET NOT NULL;
ALTER TABLE livros_interessantes_links DROP COLUMN loja;
ALTER TABLE achadinhos_cafe_links DROP COLUMN loja;

CREATE INDEX lojas_comercio_ativo_ordem_idx ON lojas_comercio (ativo,ordem,nome,id);
