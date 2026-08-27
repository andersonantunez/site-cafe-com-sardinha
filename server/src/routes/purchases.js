import { Router } from 'express'
import { query } from '../config/database.js'
import { requireAuth } from '../services/authService.js'

export const purchasesRouter = Router()
purchasesRouter.use(requireAuth)

purchasesRouter.get('/', async (req, res) => {
  const status = String(req.query.status || 'todos')
  if (!['todos', 'comprado', 'cancelado'].includes(status)) return res.status(400).json({ error: 'Filtro de compra inválido.' })
  const values = [req.userId]
  const filter = status === 'todos' ? '' : ` AND status=$${values.push(status)}`
  const { rows } = await query(`SELECT id,data_compra,tipo,descricao,valor_pago,forma_pagamento,status,vencimento,arquivo_url
    FROM compras_usuario WHERE usuario_id=$1${filter} ORDER BY data_compra DESC,id DESC`, values)
  res.json(rows.map(row => ({ ...row, valor_pago: Number(row.valor_pago) })))
})
