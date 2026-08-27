import { Router } from 'express'
import { config } from '../config/index.js'
import { query } from '../config/database.js'
import { hashPassword, requireAuth, signSession, verifyPassword } from '../services/authService.js'
import { authRateLimit } from '../middleware/rateLimit.js'

export const authRouter = Router()
const publicUser = user => ({ id: user.id, nome: user.nome, email: user.email, fotoUrl: user.foto_url })
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
authRouter.use((req, res, next) => req.method === 'POST' ? authRateLimit(req, res, next) : next())

authRouter.post('/cadastro', async (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')
  if (nome.length < 2 || nome.length > 160 || email.length > 320 || !validEmail(email) || senha.length < 8 || senha.length > 200) return res.status(400).json({ error: 'Informe nome, e-mail válido e senha de 8 a 200 caracteres.' })
  const senhaHash = await hashPassword(senha)
  try {
    const { rows } = await query('INSERT INTO usuarios (nome,email,senha_hash,ultimo_login_em) VALUES ($1,$2,$3,NOW()) RETURNING *', [nome, email, senhaHash])
    res.status(201).json({ token: signSession(rows[0]), user: publicUser(rows[0]) })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' })
    throw error
  }
})

authRouter.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')
  if (email.length > 320 || senha.length > 200) return res.status(401).json({ error: 'E-mail ou senha inválidos.' })
  const { rows } = await query('SELECT * FROM usuarios WHERE email=$1 AND ativo', [email])
  if (!rows[0] || !await verifyPassword(senha, rows[0].senha_hash)) return res.status(401).json({ error: 'E-mail ou senha inválidos.' })
  await query('UPDATE usuarios SET ultimo_login_em=NOW() WHERE id=$1', [rows[0].id])
  res.json({ token: signSession(rows[0]), user: publicUser(rows[0]) })
})

authRouter.post('/google', async (req, res) => {
  if (!config.googleClientId) return res.status(503).json({ error: 'Login Google ainda não foi configurado pelo administrador.' })
  const credential = String(req.body.credential || '')
  if (!credential || credential.length > 20_000) return res.status(400).json({ error: 'Credencial Google inválida.' })
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
  if (!response.ok) return res.status(401).json({ error: 'Credencial Google inválida.' })
  const profile = await response.json()
  if (profile.aud !== config.googleClientId || profile.email_verified !== 'true') return res.status(401).json({ error: 'Conta Google não autorizada.' })
  const email = profile.email.toLowerCase()
  const { rows } = await query(`INSERT INTO usuarios (nome,email,google_sub,foto_url,ultimo_login_em)
    VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (email) DO UPDATE SET google_sub=COALESCE(usuarios.google_sub,EXCLUDED.google_sub),foto_url=EXCLUDED.foto_url,ultimo_login_em=NOW(),atualizado_em=NOW() RETURNING *`, [profile.name || email, email, profile.sub, profile.picture || null])
  res.json({ token: signSession(rows[0]), user: publicUser(rows[0]) })
})

authRouter.get('/config', (req, res) => res.json({ googleClientId: config.googleClientId || null }))
authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM usuarios WHERE id=$1 AND ativo', [req.userId])
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' })
  res.json({ user: publicUser(rows[0]) })
})
