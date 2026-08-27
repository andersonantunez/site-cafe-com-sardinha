ALTER TABLE carteira_configuracoes
  ADD COLUMN IF NOT EXISTS mostrar_emissor BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS nome_carteira VARCHAR(120) NOT NULL DEFAULT 'Minha carteira';

ALTER TABLE carteira_configuracoes
  DROP CONSTRAINT IF EXISTS carteira_configuracoes_nome_carteira_check;

ALTER TABLE carteira_configuracoes
  ADD CONSTRAINT carteira_configuracoes_nome_carteira_check
  CHECK (CHAR_LENGTH(BTRIM(nome_carteira)) BETWEEN 2 AND 120);
