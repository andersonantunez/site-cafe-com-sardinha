import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// This path is independent of the current working directory used by npm.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true'
}

function parseTrustProxy(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || normalized === 'false') return false
  if (normalized === 'true') return true
  const hops = Number(normalized)
  return Number.isInteger(hops) && hops >= 0 ? hops : false
}

const asaasEnvironment = process.env.ASAAS_ENV?.trim().toLowerCase() || 'sandbox'

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3001),
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  authSecret: process.env.AUTH_SECRET?.trim() || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  databaseUrl: process.env.DATABASE_URL,
  pg: {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'cafe_com_sardinha',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    ssl: parseBoolean(process.env.PGSSL) ? { rejectUnauthorized: false } : false,
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: parseBoolean(process.env.SMTP_SECURE ?? 'true'),
    user: process.env.SMTP_USER?.trim() || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY?.trim() || '',
    secretKey: process.env.TURNSTILE_SECRET_KEY?.trim() || '',
  },
  asaas: {
    environment: asaasEnvironment,
    apiUrl: (process.env.ASAAS_API_URL?.trim() || (asaasEnvironment === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3')).replace(/\/$/, ''),
    apiKey: process.env.ASAAS_API_KEY?.trim() || '',
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN?.trim() || '',
    userAgent: process.env.ASAAS_USER_AGENT?.trim() || 'CafeComSardinha/1.0',
  },
}
