import crypto from 'node:crypto'
import { Router } from 'express'
import { requireAuth } from '../services/authService.js'
import { pool, query } from '../config/database.js'
import { parsePortfolioFile, parsePortfolioJson } from '../services/portfolioParser.js'
import { getUserPortfolio } from '../services/portfolioService.js'
import { appendUserPortfolio, replaceUserPortfolio } from '../services/portfolioImportService.js'

export const carteiraRouter = Router()
carteiraRouter.use(requireAuth)

carteiraRouter.get('/', async (req, res) => {
  res.json(await getUserPortfolio(req.userId))
})

carteiraRouter.put('/configuracoes', async (req, res) => {
  const mostrarVencimento = req.body.mostrarVencimento !== false
  const mostrarTipoProduto = req.body.mostrarTipoProduto !== false
  const mostrarTaxa = req.body.mostrarTaxa !== false
  const mostrarEmissor = req.body.mostrarEmissor !== false
  const nomeCarteira = String(req.body.nomeCarteira || '').trim()
  if (nomeCarteira.length < 2 || nomeCarteira.length > 120) return res.status(400).json({ error: 'O nome da carteira deve ter entre 2 e 120 caracteres.' })
  const { rows } = await query(`INSERT INTO carteira_configuracoes
    (usuario_id,mostrar_vencimento,mostrar_tipo_produto,mostrar_taxa,mostrar_emissor,nome_carteira)
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (usuario_id) DO UPDATE SET
    mostrar_vencimento=EXCLUDED.mostrar_vencimento,
    mostrar_tipo_produto=EXCLUDED.mostrar_tipo_produto,
    mostrar_taxa=EXCLUDED.mostrar_taxa,
    mostrar_emissor=EXCLUDED.mostrar_emissor,
    nome_carteira=EXCLUDED.nome_carteira,atualizado_em=NOW()
    RETURNING mostrar_vencimento,mostrar_tipo_produto,mostrar_taxa,mostrar_emissor,nome_carteira,compartilhamento_ativo`,
  [req.userId, mostrarVencimento, mostrarTipoProduto, mostrarTaxa, mostrarEmissor, nomeCarteira])
  res.json({
    mostrarVencimento: rows[0].mostrar_vencimento,
    mostrarTipoProduto: rows[0].mostrar_tipo_produto,
    mostrarTaxa: rows[0].mostrar_taxa,
    mostrarEmissor: rows[0].mostrar_emissor,
    nomeCarteira: rows[0].nome_carteira,
    compartilhamentoAtivo: rows[0].compartilhamento_ativo,
  })
})

const createShareToken = () => crypto.randomBytes(32).toString('base64url')
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')

carteiraRouter.post('/compartilhamento', async (req, res) => {
  const { rows: portfolioRows } = await query('SELECT 1 FROM carteira_titulos WHERE usuario_id=$1 AND ativo LIMIT 1', [req.userId])
  if (!portfolioRows.length) return res.status(409).json({ error: 'Importe uma carteira antes de habilitar o compartilhamento.' })
  const token = createShareToken()
  await query(`INSERT INTO carteira_configuracoes
    (usuario_id,compartilhamento_ativo,token_hash,token_criado_em)
    VALUES ($1,TRUE,$2,NOW()) ON CONFLICT (usuario_id) DO UPDATE SET
    compartilhamento_ativo=TRUE,token_hash=EXCLUDED.token_hash,
    token_criado_em=NOW(),atualizado_em=NOW()`, [req.userId, hashToken(token)])
  res.status(201).json({ token, path: `/carteira/publica/${token}` })
})

carteiraRouter.delete('/compartilhamento', async (req, res) => {
  await query(`INSERT INTO carteira_configuracoes (usuario_id,compartilhamento_ativo)
    VALUES ($1,FALSE) ON CONFLICT (usuario_id) DO UPDATE SET
    compartilhamento_ativo=FALSE,token_hash=NULL,token_criado_em=NULL,atualizado_em=NOW()`, [req.userId])
  res.status(204).end()
})

carteiraRouter.post('/importar', async (req, res) => {
  const conteudo = String(req.body.conteudo || '')
  if (Buffer.byteLength(conteudo, 'utf8') > 2 * 1024 * 1024) return res.status(413).json({ error: 'O arquivo deve ter no máximo 2 MB.' })
  const nomeArquivo = String(req.body.nomeArquivo || 'Ativos.txt').replace(/[\r\n\0]/g, '').slice(0, 255)
  const formato = String(req.body.formato || 'tsv').toLowerCase()
  const modo = String(req.body.modo || 'substituir').toLowerCase()
  if (!['tsv', 'json'].includes(formato)) return res.status(400).json({ error: 'Formato de importação inválido.' })
  if (!['substituir', 'acrescentar'].includes(modo)) return res.status(400).json({ error: 'Modo de importação inválido.' })
  let parsed
  try { parsed = formato === 'json' ? parsePortfolioJson(conteudo) : parsePortfolioFile(conteudo) } catch (error) { return res.status(400).json({ error: error.message }) }
  const client = await pool.connect()
  try {
    const importer = modo === 'acrescentar' ? appendUserPortfolio : replaceUserPortfolio
    await importer(client, {
      userId: req.userId,
      fileName: nomeArquivo,
      hash: parsed.hash,
      assets: parsed.assets,
    })
    res.status(201).json({ imported: parsed.assets.length, mode: modo, format: formato })
  } finally {
    client.release()
  }
})
