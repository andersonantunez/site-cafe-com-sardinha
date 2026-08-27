import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.resolve(__dirname, '../../data/samples/Tabela.txt')
const monthNumbers = { Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12 }
const clean = value => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const percent = value => Number(value.replace('%', '').replace(/\./g, '').replace(',', '.'))

try {
  const source = await fs.readFile(sourcePath, 'utf8')
  const headers = [...source.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(match => clean(match[1])).slice(1)
  const rows = [...source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(match => [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => clean(cell[1])))
    .filter(row => row.length)
  const values = Object.fromEntries(rows.map(row => [row[0], row.slice(1)]))
  if (!headers.length || !values.Carteira || !values.CDI || !values['% do CDI']) throw new Error('Tabela.txt não contém a estrutura esperada.')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const [index, label] of headers.entries()) {
      const [month, shortYear] = label.split('/')
      const competence = `${2000 + Number(shortYear)}-${String(monthNumbers[month]).padStart(2, '0')}-01`
      await client.query(`INSERT INTO rentabilidade_mensal
        (competencia,rentabilidade_carteira,rentabilidade_cdi,percentual_cdi,publicado)
        VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (competencia) DO UPDATE SET
        rentabilidade_carteira=EXCLUDED.rentabilidade_carteira,
        rentabilidade_cdi=EXCLUDED.rentabilidade_cdi,
        percentual_cdi=EXCLUDED.percentual_cdi,atualizado_em=NOW()`,
      [competence, percent(values.Carteira[index]), percent(values.CDI[index]), percent(values['% do CDI'][index])])
    }
    await client.query('COMMIT')
    console.log(`${headers.length} competências importadas de Tabela.txt.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
} catch (error) {
  console.error('Falha ao importar rentabilidade:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
