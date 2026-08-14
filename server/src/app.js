import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { query } from './db.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { frasesRouter } from './routes/frases.js'
import { postagensRouter } from './routes/postagens.js'
import { rendaFixaRouter } from './routes/rendaFixa.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../../dist')

export const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (req, res) => {
  const { rows } = await query('SELECT NOW() AS database_time')
  res.json({ status: 'ok', database: 'connected', databaseTime: rows[0].database_time })
})

app.use('/api/frases', frasesRouter)
app.use('/api/postagens', postagensRouter)
app.use('/api/renda-fixa', rendaFixaRouter)

if (config.nodeEnv === 'production') {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)
