ALTER TABLE postagens ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS postagens_publico_ordem_idx ON postagens (publico, ordem, id);

