import { query } from '../config/database.js'

export async function userIsAdmin(userId) {
  const { rows } = await query(
    'SELECT is_admin FROM usuarios WHERE id=$1 AND ativo',
    [userId],
  )
  return rows[0]?.is_admin === true
}

export async function requireAdmin(req, res, next) {
  try {
    if (!await userIsAdmin(req.userId)) return res.status(403).json({ error: 'Acesso restrito a administradores.' })
    next()
  } catch (error) {
    next(error)
  }
}
