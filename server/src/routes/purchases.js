import { Router } from 'express'
import { query } from '../config/database.js'
import { requireAuth } from '../services/authService.js'

export const purchasesRouter = Router()
purchasesRouter.use(requireAuth)

purchasesRouter.get('/', async (req, res) => {
  const status = String(req.query.status || 'todos')
  if (!['todos', 'comprado', 'cancelado'].includes(status)) return res.status(400).json({ error: 'Filtro de compra inválido.' })
  const values = [req.userId]
  const filter = status === 'todos' ? '' : ` WHERE historico.status=$${values.push(status)}`
  const { rows } = await query(`SELECT * FROM (
    SELECT 'legado-' || id::text AS id,data_compra,tipo,descricao,valor_pago,forma_pagamento,status,vencimento,arquivo_url
    FROM compras_usuario WHERE usuario_id=$1
    UNION ALL
    SELECT 'pedido-' || p.id::text,p.criado_em,
      CASE WHEN i.tipo='ARTICLE' THEN 'artigo' ELSE 'produto' END,
      i.descricao,p.valor_total,COALESCE(p.forma_pagamento,'Asaas Checkout'),
      CASE WHEN p.status='PAID' THEN 'comprado' ELSE 'cancelado' END,
      NULL::date,
      CASE WHEN i.tipo='ARTICLE' AND p.status='PAID' THEN '/artigos-interessantes?artigo=' || i.artigo_id::text ELSE NULL END
    FROM pedidos p JOIN pedido_itens i ON i.pedido_id=p.id
    WHERE p.usuario_id=$1 AND p.status IN ('PAID','CANCELED','EXPIRED','REFUNDED')
  ) historico${filter} ORDER BY data_compra DESC,id DESC`, values)
  res.json(rows.map(row => ({ ...row, valor_pago: Number(row.valor_pago) })))
})
