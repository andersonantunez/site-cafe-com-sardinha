import { Router } from 'express'
import { query } from '../db.js'

export const frasesRouter = Router()

frasesRouter.get('/', async (req, res) => {
  const { rows } = await query('SELECT id, texto, publico, ordem, criado_em, atualizado_em FROM frases WHERE publico = TRUE ORDER BY ordem, id')
  res.json(rows)
})

frasesRouter.post('/', async (req, res) => {
  const { texto, publico = true, ordem = 0 } = req.body
  if (!texto?.trim()) return res.status(400).json({ erro: 'O campo texto é obrigatório.' })
  const { rows } = await query('INSERT INTO frases (texto, publico, ordem) VALUES ($1, $2, $3) RETURNING *', [texto.trim(), Boolean(publico), Number(ordem)])
  res.status(201).json(rows[0])
})

frasesRouter.put('/:id', async (req, res) => {
  const { texto, publico = true, ordem = 0 } = req.body
  if (!texto?.trim()) return res.status(400).json({ erro: 'O campo texto é obrigatório.' })
  const { rows } = await query('UPDATE frases SET texto=$1, publico=$2, ordem=$3, atualizado_em=NOW() WHERE id=$4 RETURNING *', [texto.trim(), Boolean(publico), Number(ordem), req.params.id])
  if (!rows[0]) return res.status(404).json({ erro: 'Frase não encontrada.' })
  res.json(rows[0])
})

frasesRouter.delete('/:id', async (req, res) => {
  const result = await query('DELETE FROM frases WHERE id=$1', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ erro: 'Frase não encontrada.' })
  res.status(204).end()
})
