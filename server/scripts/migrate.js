import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationDirectory = path.resolve(__dirname, '../db')

try {
  const files = (await fs.readdir(migrationDirectory)).filter(file => file.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationDirectory, file), 'utf8')
    await pool.query(sql)
    console.log(`Migração aplicada: ${file}`)
  }
  console.log('Migração concluída com sucesso.')
} catch (error) {
  console.error('Falha ao executar a migração:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
