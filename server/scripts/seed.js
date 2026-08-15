import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(projectRoot, relativePath), 'utf8'))
}

function parseBrazilianDate(value) {
  if (!value) return null
  const [day, month, year] = value.split('-')
  return `${year}-${month}-${day}`
}

const client = await pool.connect()
try {
  const [frasesData, postagensData] = await Promise.all([
    readJson('src/data/frases.json'),
    readJson('src/data/postagens.json'),
  ])

  await client.query('BEGIN')
  for (const [index, frase] of frasesData.frases.entries()) {
    await client.query(
      'INSERT INTO frases (id, texto, publico, ordem) VALUES ($1,$2,TRUE,$3) ON CONFLICT (id) DO UPDATE SET texto=EXCLUDED.texto, ordem=EXCLUDED.ordem, atualizado_em=NOW()',
      [frase.id, frase.texto, index],
    )
  }

  for (const postagem of postagensData.postagens) {
    await client.query(
      `INSERT INTO postagens (id, titulo, conteudo, hashtags, url, publico, data_publicacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET titulo=EXCLUDED.titulo, conteudo=EXCLUDED.conteudo, hashtags=EXCLUDED.hashtags, url=EXCLUDED.url, publico=EXCLUDED.publico, data_publicacao=EXCLUDED.data_publicacao, atualizado_em=NOW()`,
      [postagem.id, postagem.titulo, postagem.conteudo, postagem.hashtags, postagem.url, postagem.publico, parseBrazilianDate(postagem.data_publicacao)],
    )
  }

  await client.query("SELECT setval(pg_get_serial_sequence('frases','id'), COALESCE(MAX(id),1)) FROM frases")
  await client.query("SELECT setval(pg_get_serial_sequence('postagens','id'), COALESCE(MAX(id),1)) FROM postagens")
  await client.query('COMMIT')
  console.log(`Dados importados: ${frasesData.frases.length} frases e ${postagensData.postagens.length} postagens.`)
} catch (error) {
  await client.query('ROLLBACK')
  console.error('Falha ao importar os dados:', error.message)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
