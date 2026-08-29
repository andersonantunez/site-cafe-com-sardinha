import { Router } from 'express'
import { config } from '../config/index.js'
import { query } from '../config/database.js'
import { sendContactMessage } from '../services/emailService.js'
import { createContactFormToken, validateContactFormToken, validateContactFields, contactHashes, enforceContactRateLimit, recordContactAttempt } from '../services/contactSecurityService.js'
import { verifyTurnstileToken } from '../services/turnstileService.js'
import { securityLog } from '../services/securityLog.js'

export const contactRouter = Router()
const cleanSingleLine = value => String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()

contactRouter.get('/config', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ siteKey: config.turnstile.siteKey || null, formToken: createContactFormToken() })
})

contactRouter.post('/', async (req, res) => {
  const rawName = cleanSingleLine(req.body.name ?? req.body.nome)
  const rawEmail = cleanSingleLine(req.body.email).toLowerCase()
  const rawSubject = cleanSingleLine(req.body.subject ?? req.body.assunto)
  const rawMessage = String(req.body.message ?? req.body.mensagem ?? '').replace(/\u0000/g, '').trim()
  const remoteIp = req.ip || req.socket.remoteAddress || 'unknown'
  const { ipHash, emailHash } = contactHashes(remoteIp, rawEmail)

  if (req.body.website) {
    await recordContactAttempt(ipHash, emailHash, 'HONEYPOT')
    securityLog('contact.blocked', { reason: 'honeypot', ipHash })
    return res.status(202).json({ received: true })
  }
  const timing = validateContactFormToken(req.body.formToken)
  if (!timing.valid) {
    await recordContactAttempt(ipHash, emailHash, timing.reason === 'too_fast' ? 'TOO_FAST' : 'INVALID')
    securityLog('contact.blocked', { reason: timing.reason, ipHash })
    return res.status(400).json({ error: timing.reason === 'too_fast' ? 'Aguarde um instante antes de enviar a mensagem.' : 'Formulário expirado. Recarregue a página e tente novamente.' })
  }
  const valid = validateContactFields({ name: rawName, email: rawEmail, subject: rawSubject, message: rawMessage })
  if (!valid) {
    await recordContactAttempt(ipHash, emailHash, 'INVALID')
    return res.status(400).json({ error: 'Preencha nome, e-mail, assunto e mensagem dentro dos limites informados.' })
  }
  if (!await enforceContactRateLimit(ipHash, emailHash)) {
    await recordContactAttempt(ipHash, emailHash, 'RATE_LIMITED')
    securityLog('contact.blocked', { reason: 'rate_limit', ipHash })
    return res.status(429).json({ error: 'Limite de mensagens atingido. Tente novamente mais tarde.' })
  }
  const turnstileValid = await verifyTurnstileToken(req.body.turnstileToken, remoteIp)
  if (!turnstileValid) {
    await recordContactAttempt(ipHash, emailHash, 'TURNSTILE_FAILED')
    securityLog('contact.blocked', { reason: 'turnstile', ipHash })
    return res.status(400).json({ error: 'Não foi possível validar a verificação anti-spam. Tente novamente.' })
  }

  const inserted = await query(`INSERT INTO mensagens_contato (nome,email,assunto,mensagem,ip_hash,user_agent)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [rawName, rawEmail, rawSubject, rawMessage, ipHash, cleanSingleLine(req.get('user-agent')).slice(0, 500)])
  try {
    await sendContactMessage({ name: rawName, email: rawEmail, subject: rawSubject, message: rawMessage })
    await query('UPDATE mensagens_contato SET email_enviado_em=NOW(),erro_email=NULL WHERE id=$1', [inserted.rows[0].id])
    await recordContactAttempt(ipHash, emailHash, 'ACCEPTED')
    securityLog('contact.sent', { messageId: inserted.rows[0].id, ipHash })
    res.status(201).json({ received: true })
  } catch (error) {
    await query('UPDATE mensagens_contato SET erro_email=$2 WHERE id=$1', [inserted.rows[0].id, String(error.message).slice(0, 500)])
    throw error
  }
})
