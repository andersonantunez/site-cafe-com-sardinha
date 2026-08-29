import crypto from 'node:crypto'
import { config } from '../config/index.js'
import { query } from '../config/database.js'

const hmac = value => crypto.createHmac('sha256', config.authSecret).update(String(value)).digest('hex')

export function createContactFormToken(now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  const nonce = crypto.randomBytes(18).toString('base64url')
  const value = `${issuedAt}.${nonce}`
  return `${value}.${hmac(value)}`
}

export function validateContactFormToken(token, now = Date.now()) {
  const [issuedText, nonce, signature] = String(token || '').split('.')
  if (!/^\d{10}$/.test(issuedText) || !/^[A-Za-z0-9_-]{20,40}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return { valid: false, reason: 'invalid' }
  const value = `${issuedText}.${nonce}`
  const expected = Buffer.from(hmac(value), 'hex')
  const received = Buffer.from(signature, 'hex')
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return { valid: false, reason: 'invalid' }
  const ageMs = now - Number(issuedText) * 1000
  if (!Number.isFinite(ageMs) || ageMs < 2_000) return { valid: false, reason: 'too_fast' }
  if (ageMs > 60 * 60 * 1000) return { valid: false, reason: 'expired' }
  return { valid: true }
}

export function contactHashes(ip, email) {
  return { ipHash: hmac(`ip:${ip || 'unknown'}`), emailHash: email ? hmac(`email:${String(email).toLowerCase()}`) : null }
}

export function validateContactFields({ name, email, subject, message }) {
  return name.length >= 2 && name.length <= 120
    && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    && subject.length >= 3 && subject.length <= 240
    && message.length >= 10 && message.length <= 3000
}

export async function enforceContactRateLimit(ipHash, emailHash, dbQuery = query) {
  const { rows } = await dbQuery(`SELECT
    COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '10 minutes')::int AS ip_10m,
    COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '24 hours')::int AS ip_24h
    FROM contato_tentativas WHERE ip_hash=$1`, [ipHash])
  const ipCounts = rows[0]
  if (ipCounts.ip_10m >= 3 || ipCounts.ip_24h >= 10) return false
  if (emailHash) {
    const emailResult = await dbQuery(`SELECT COUNT(*)::int AS total FROM contato_tentativas
      WHERE email_hash=$1 AND criado_em > NOW() - INTERVAL '1 hour'`, [emailHash])
    if (emailResult.rows[0].total >= 5) return false
  }
  return true
}

export function recordContactAttempt(ipHash, emailHash, result, dbQuery = query) {
  return dbQuery('INSERT INTO contato_tentativas (ip_hash,email_hash,resultado) VALUES ($1,$2,$3)', [ipHash, emailHash, result])
}
