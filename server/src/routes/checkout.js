import { Router } from 'express'
import { requireAuth } from '../services/authService.js'
import { createOrderCheckout, getOrderForUser } from '../services/checkoutService.js'

export const checkoutRouter = Router()

checkoutRouter.post('/', requireAuth, async (req, res) => {
  if ('price' in req.body || 'value' in req.body || 'valor' in req.body) {
    return res.status(400).json({ error: 'O valor da compra é definido exclusivamente pelo servidor.' })
  }
  const result = await createOrderCheckout({
    userId: req.userId,
    itemType: req.body.itemType,
    itemId: req.body.itemId,
    idempotencyKey: req.body.idempotencyKey,
  })
  res.status(result.reused ? 200 : 201).json(result)
})

checkoutRouter.get('/pedidos/:codigo', requireAuth, async (req, res) => {
  res.json(await getOrderForUser(req.params.codigo, req.userId))
})
