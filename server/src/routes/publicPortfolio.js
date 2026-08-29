import crypto from 'node:crypto'
import { Router } from 'express'
import { query } from '../config/database.js'
import { getAdminPublicPortfolio, getUserPortfolio, sanitizePublicPortfolio } from '../services/portfolioService.js'

export const publicPortfolioRouter = Router()
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex')

publicPortfolioRouter.get('/admin', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(await getAdminPublicPortfolio())
})

publicPortfolioRouter.get('/:token', async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const token = String(req.params.token || '')
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return res.status(404).json({ error: 'Carteira pública não encontrada.' })
  const { rows } = await query(`SELECT usuario_id FROM carteira_configuracoes
    WHERE token_hash=$1 AND compartilhamento_ativo`, [tokenHash(token)])
  if (!rows[0]) return res.status(404).json({ error: 'Carteira pública não encontrada.' })
  res.json(sanitizePublicPortfolio(await getUserPortfolio(rows[0].usuario_id)))
})
