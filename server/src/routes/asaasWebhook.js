import crypto from 'node:crypto'
import { Router } from 'express'
import { config } from '../config/index.js'
import { processAsaasEvent } from '../services/checkoutService.js'
import { deliverOrderNotifications } from '../services/emailService.js'
import { securityLog } from '../services/securityLog.js'

export const asaasWebhookRouter = Router()

export function secureWebhookToken(received, expected) {
  const left = Buffer.from(String(received || ''))
  const right = Buffer.from(String(expected || ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

asaasWebhookRouter.post('/', async (req, res) => {
  if (!config.asaas.webhookToken) return res.status(503).json({ error: 'Webhook Asaas não configurado.' })
  if (!secureWebhookToken(req.get('asaas-access-token'), config.asaas.webhookToken)) {
    securityLog('webhook.denied', { remoteIp: req.ip })
    return res.status(401).json({ error: 'Webhook não autorizado.' })
  }
  const result = await processAsaasEvent(req.body)
  res.status(200).json({ received: true, duplicate: result.duplicate })
  if (result.paid && result.orderId) {
    setImmediate(() => deliverOrderNotifications(result.orderId).catch(error => {
      securityLog('email.dispatch_failed', { orderId: result.orderId, reason: error.message })
    }))
  }
})
