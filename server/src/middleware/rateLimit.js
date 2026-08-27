const attempts = new Map()

export function authRateLimit(req, res, next) {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < windowMs)
  recent.push(now)
  attempts.set(key, recent)
  if (attempts.size > 5_000) {
    for (const [entryKey, timestamps] of attempts) if (!timestamps.some(timestamp => now - timestamp < windowMs)) attempts.delete(entryKey)
  }
  if (recent.length > 30) return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' })
  next()
}

export function contactRateLimit(req, res, next) {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const key = `contact:${req.ip || req.socket.remoteAddress || 'unknown'}`
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < windowMs)
  if (recent.length >= 5) return res.status(429).json({ error: 'Limite de mensagens atingido. Tente novamente mais tarde.' })
  recent.push(now)
  attempts.set(key, recent)
  next()
}
