ALTER TABLE carteira_titulos
  DROP CONSTRAINT IF EXISTS carteira_titulos_usuario_codigo_unique;

ALTER TABLE carteira_titulos
  ADD CONSTRAINT carteira_titulos_importacao_linha_unique
  UNIQUE (importacao_id, linha_origem);

CREATE INDEX IF NOT EXISTS carteira_titulos_usuario_codigo_idx
  ON carteira_titulos (usuario_id, codigo);
