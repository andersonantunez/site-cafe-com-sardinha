import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { config } from '../config/index.js'
import { query } from '../config/database.js'

const scrypt = promisify(crypto.scrypt)
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${Buffer.from(derived).toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, hash] = String(stored || '').split(':')
  if (algorithm !== 'scrypt' || !salt || !hash) return false
  const derived = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected)
}

export function signSession(user) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ sub: String(user.id), email: user.email, iat: now, exp: now + 60 * 60 * 24 * 7 })
  const signature = crypto.createHmac('sha256', config.authSecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifySession(token) {
  const [header, payload, signature] = String(token || '').split('.')
  if (!header || !payload || !signature) throw new Error('Sessão inválida.')
  const expected = crypto.createHmac('sha256', config.authSecret).update(`${header}.${payload}`).digest()
  const received = Buffer.from(signature, 'base64url')
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Sessão inválida.')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw new Error('Sessão expirada.')
  return data
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const session = verifySession(token)
    req.userId = Number(session.sub)
    if (!Number.isSafeInteger(req.userId) || req.userId <= 0) throw new Error('Sessão inválida.')
    const { rows } = await query('SELECT 1 FROM usuarios WHERE id=$1 AND ativo', [req.userId])
    if (!rows[0]) throw new Error('Sessão inválida.')
    next()
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
}
