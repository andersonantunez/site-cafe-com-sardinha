import { Router } from 'express'
import { query } from '../config/database.js'
import { requireAuth } from '../services/authService.js'
import { requireAdmin } from '../services/adminService.js'

export const postagensRouter = Router()
const validUrl = value => { try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false } }

postagensRouter.get('/', async (req, res) => {
  const { rows } = await query('SELECT id, titulo, conteudo, hashtags, url, publico, ordem, data_publicacao, criado_em, atualizado_em FROM postagens WHERE publico = TRUE ORDER BY ordem, data_publicacao DESC NULLS LAST, id DESC')
  res.json(rows)
})

postagensRouter.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM postagens WHERE id=$1 AND publico=TRUE', [req.params.id])
  if (!rows[0]) return res.status(404).json({ erro: 'Postagem não encontrada.' })
  res.json(rows[0])
})

postagensRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { titulo, conteudo = '', hashtags = [], url, publico = true, data_publicacao = null } = req.body
  if (!titulo?.trim() || !validUrl(url)) return res.status(400).json({ erro: 'Título e URL HTTP(S) válida são obrigatórios.' })
  const { rows } = await query('INSERT INTO postagens (titulo, conteudo, hashtags, url, publico, data_publicacao) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [titulo.trim(), conteudo, hashtags, url.trim(), Boolean(publico), data_publicacao])
  res.status(201).json(rows[0])
})

postagensRouter.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { titulo, conteudo = '', hashtags = [], url, publico = true, data_publicacao = null } = req.body
  if (!titulo?.trim() || !validUrl(url)) return res.status(400).json({ erro: 'Título e URL HTTP(S) válida são obrigatórios.' })
  const { rows } = await query('UPDATE postagens SET titulo=$1, conteudo=$2, hashtags=$3, url=$4, publico=$5, data_publicacao=$6, atualizado_em=NOW() WHERE id=$7 RETURNING *', [titulo.trim(), conteudo, hashtags, url.trim(), Boolean(publico), data_publicacao, req.params.id])
  if (!rows[0]) return res.status(404).json({ erro: 'Postagem não encontrada.' })
  res.json(rows[0])
})

postagensRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const result = await query('DELETE FROM postagens WHERE id=$1', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ erro: 'Postagem não encontrada.' })
  res.status(204).end()
})
