import { config } from '../config/index.js'

export async function verifyTurnstileToken(token, remoteIp, fetchImpl = fetch) {
  if (!config.turnstile.secretKey) {
    const error = new Error('Proteção do formulário ainda não configurada.')
    error.status = 503
    throw error
  }
  if (!token || String(token).length > 2048) return false
  const body = new URLSearchParams({ secret: config.turnstile.secretKey, response: String(token) })
  if (remoteIp) body.set('remoteip', remoteIp)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: controller.signal,
    })
    if (!response.ok) return false
    const result = await response.json()
    return result.success === true
  } catch {
    const error = new Error('Não foi possível validar a proteção anti-spam.')
    error.status = 502
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
