-- Preço anterior não faz parte mais do domínio de Achadinhos do Café.
ALTER TABLE achadinhos_cafe_links
  DROP COLUMN IF EXISTS preco_anterior;
