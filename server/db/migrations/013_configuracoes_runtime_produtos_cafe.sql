DROP TABLE IF EXISTS configuracoes_sistema;

CREATE TABLE configuracoes_sistema (
  chave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao VARCHAR(320) NOT NULL DEFAULT '',
  atualizado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT configuracoes_sistema_chave_check CHECK (chave ~ '^[a-z][a-z0-9_]{2,99}$')
);

INSERT INTO configuracoes_sistema (chave, valor, descricao)
VALUES ('carteira_cafe_usuario_email', 'anderson.ant.oli@gmail.com', 'E-mail do usuário cuja carteira alimenta a Carteira Pública do Café.');

CREATE TABLE produtos_cafe (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  icone VARCHAR(40) NOT NULL DEFAULT 'shirt',
  preco NUMERIC(14,2),
  publicado BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT produtos_cafe_preco_check CHECK (preco IS NULL OR preco >= 0)
);

CREATE TABLE produtos_cafe_variantes (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos_cafe(id) ON DELETE CASCADE,
  cor_nome VARCHAR(80) NOT NULL,
  cor_hex VARCHAR(7) NOT NULL,
  tamanho VARCHAR(30),
  imagem_url TEXT NOT NULL,
  preco NUMERIC(14,2),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT produtos_cafe_variantes_cor_check CHECK (cor_hex ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT produtos_cafe_variantes_preco_check CHECK (preco IS NULL OR preco >= 0),
  CONSTRAINT produtos_cafe_variantes_unique UNIQUE (produto_id, cor_nome, tamanho)
);

CREATE INDEX produtos_cafe_publicado_ordem_idx ON produtos_cafe (publicado, ordem, id);
CREATE INDEX produtos_cafe_variantes_produto_idx ON produtos_cafe_variantes (produto_id, ativo, ordem, id);

INSERT INTO produtos_cafe (slug,nome,descricao,icone,ordem) VALUES
('canecas','Canecas','Cerâmica com a identidade Café com Sardinha para acompanhar suas melhores conversas.','coffee',1),
('bones','Bonés','Modelo casual com logo frontal bordado e ajuste traseiro.','sparkles',2),
('moletons','Moletons','Moletom com capuz, bolso canguru e estampa frontal da marca.','shirt',3),
('camisetas','Camisetas','Camiseta de corte confortável com estampa frontal Café com Sardinha.','shirt',4);

INSERT INTO produtos_cafe_variantes (produto_id,cor_nome,cor_hex,tamanho,imagem_url,ordem)
SELECT p.id,v.cor_nome,v.cor_hex,v.tamanho,v.imagem_url,v.ordem FROM produtos_cafe p JOIN (VALUES
('canecas','Marrom','#493326',NULL,'/src/assets/images/products/caneca-marrom.png',1),
('canecas','Laranja','#d77b20',NULL,'/src/assets/images/products/caneca-laranja.png',2),
('canecas','Azul-claro','#72a9c2',NULL,'/src/assets/images/products/caneca-azul-claro.png',3),
('canecas','Azul-marinho','#173d65',NULL,'/src/assets/images/products/caneca-azul-marinho.png',4),
('bones','Marrom','#4a3325',NULL,'/src/assets/images/products/bone-marrom.png',1),
('bones','Azul-marinho','#142f50',NULL,'/src/assets/images/products/bone-azul-marinho.png',2),
('moletons','Marrom','#3b2b21','P','/src/assets/images/products/moletom-marrom.png',1),
('moletons','Marrom','#3b2b21','M','/src/assets/images/products/moletom-marrom.png',2),
('moletons','Marrom','#3b2b21','G','/src/assets/images/products/moletom-marrom.png',3),
('moletons','Marrom','#3b2b21','GG','/src/assets/images/products/moletom-marrom.png',4),
('moletons','Marrom','#3b2b21','XGG','/src/assets/images/products/moletom-marrom.png',5),
('moletons','Azul-marinho','#152e4d','P','/src/assets/images/products/moletom-azul-marinho.png',6),
('moletons','Azul-marinho','#152e4d','M','/src/assets/images/products/moletom-azul-marinho.png',7),
('moletons','Azul-marinho','#152e4d','G','/src/assets/images/products/moletom-azul-marinho.png',8),
('moletons','Azul-marinho','#152e4d','GG','/src/assets/images/products/moletom-azul-marinho.png',9),
('moletons','Azul-marinho','#152e4d','XGG','/src/assets/images/products/moletom-azul-marinho.png',10),
('camisetas','Marrom','#3c2d25','P','/src/assets/images/products/camiseta-marrom.png',1),
('camisetas','Marrom','#3c2d25','M','/src/assets/images/products/camiseta-marrom.png',2),
('camisetas','Marrom','#3c2d25','G','/src/assets/images/products/camiseta-marrom.png',3),
('camisetas','Marrom','#3c2d25','GG','/src/assets/images/products/camiseta-marrom.png',4),
('camisetas','Marrom','#3c2d25','XGG','/src/assets/images/products/camiseta-marrom.png',5),
('camisetas','Azul','#315d83','P','/src/assets/images/products/camiseta-azul.png',6),
('camisetas','Azul','#315d83','M','/src/assets/images/products/camiseta-azul.png',7),
('camisetas','Azul','#315d83','G','/src/assets/images/products/camiseta-azul.png',8),
('camisetas','Azul','#315d83','GG','/src/assets/images/products/camiseta-azul.png',9),
('camisetas','Azul','#315d83','XGG','/src/assets/images/products/camiseta-azul.png',10),
('camisetas','Laranja','#d56e25','P','/src/assets/images/products/camiseta-laranja.png',11),
('camisetas','Laranja','#d56e25','M','/src/assets/images/products/camiseta-laranja.png',12),
('camisetas','Laranja','#d56e25','G','/src/assets/images/products/camiseta-laranja.png',13),
('camisetas','Laranja','#d56e25','GG','/src/assets/images/products/camiseta-laranja.png',14),
('camisetas','Laranja','#d56e25','XGG','/src/assets/images/products/camiseta-laranja.png',15)
) AS v(slug,cor_nome,cor_hex,tamanho,imagem_url,ordem) ON p.slug=v.slug;
