DO $$
DECLARE
  unico_usuario_id BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM configuracoes_sistema
    WHERE id = 1 AND administrador_usuario_id IS NULL
  ) THEN
    SELECT MIN(id) INTO unico_usuario_id
    FROM usuarios
    WHERE ativo
    HAVING COUNT(*) = 1;

    IF unico_usuario_id IS NOT NULL THEN
      UPDATE configuracoes_sistema
      SET administrador_usuario_id = unico_usuario_id,
          atualizado_por = unico_usuario_id,
          atualizado_em = NOW()
      WHERE id = 1 AND administrador_usuario_id IS NULL;
    END IF;
  END IF;
END $$;
