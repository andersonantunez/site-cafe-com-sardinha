import crypto from 'node:crypto'
import { Router } from 'express'
import { config } from '../config/index.js'
import { query } from '../config/database.js'
import { contactRateLimit } from '../middleware/rateLimit.js'

export const contactRouter = Router()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (value, maximum) => String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum)

contactRouter.post('/', contactRateLimit, async (req, res) => {
  if (req.body.website) return res.status(202).json({ received: true })
  const nome = clean(req.body.nome, 160)
  const email = clean(req.body.email, 320).toLowerCase()
  const assunto = clean(req.body.assunto, 240)
  const mensagem = String(req.body.mensagem || '').replace(/\u0000/g, '').trim().slice(0, 5000)
  if (nome.length < 2 || !emailPattern.test(email) || assunto.length < 3 || mensagem.length < 10) {
    return res.status(400).json({ error: 'Preencha nome, e-mail, assunto e uma mensagem com pelo menos 10 caracteres.' })
  }
  const remote = req.ip || req.socket.remoteAddress || 'unknown'
  const ipHash = crypto.createHmac('sha256', config.authSecret).update(remote).digest('hex')
  await query(`INSERT INTO mensagens_contato (nome,email,assunto,mensagem,ip_hash,user_agent)
    VALUES ($1,$2,$3,$4,$5,$6)`, [nome, email, assunto, mensagem, ipHash, clean(req.get('user-agent'), 500)])
  res.status(201).json({ received: true })
})
