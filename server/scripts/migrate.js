import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationDirectory = path.resolve(__dirname, '../db/migrations')

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    nome TEXT PRIMARY KEY,
    aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  const applied = new Set((await pool.query('SELECT nome FROM schema_migrations')).rows.map(row => row.nome))
  const files = (await fs.readdir(migrationDirectory)).filter(file => file.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Migração já aplicada: ${file}`)
      continue
    }
    const sql = await fs.readFile(path.join(migrationDirectory, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Migração aplicada: ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  console.log('Migração concluída com sucesso.')
} catch (error) {
  console.error('Falha ao executar a migração:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
