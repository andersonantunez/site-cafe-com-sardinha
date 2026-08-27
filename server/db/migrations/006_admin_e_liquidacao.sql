ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE carteira_titulos ADD COLUMN IF NOT EXISTS liquidado BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE usuarios u
SET is_admin = TRUE, atualizado_em = NOW()
FROM configuracoes_sistema c
WHERE c.id = 1 AND c.administrador_usuario_id = u.id AND NOT u.is_admin;

DO $$
DECLARE
  unico_usuario_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE is_admin AND ativo) THEN
    SELECT MIN(id) INTO unico_usuario_id
    FROM usuarios
    WHERE ativo AND google_sub IS NOT NULL
    HAVING COUNT(*) = 1;

    IF unico_usuario_id IS NOT NULL THEN
      UPDATE usuarios SET is_admin = TRUE, atualizado_em = NOW() WHERE id = unico_usuario_id;
    END IF;
  END IF;
END $$;

DELETE FROM carteira_titulos WHERE NOT ativo;
UPDATE carteira_titulos SET ativo = TRUE WHERE NOT ativo;

CREATE INDEX IF NOT EXISTS usuarios_admin_idx ON usuarios (is_admin) WHERE ativo AND is_admin;
CREATE INDEX IF NOT EXISTS carteira_titulos_usuario_liquidado_idx
  ON carteira_titulos (usuario_id, liquidado, id) WHERE ativo;

