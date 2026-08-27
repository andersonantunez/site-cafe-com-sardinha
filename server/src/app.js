import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from './config/index.js'
import { query } from './config/database.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { frasesRouter } from './routes/frases.js'
import { postagensRouter } from './routes/postagens.js'
import { rendaFixaRouter } from './routes/rendaFixa.js'
import { authRouter } from './routes/auth.js'
import { carteiraRouter } from './routes/carteira.js'
import { publicPortfolioRouter } from './routes/publicPortfolio.js'
import { adminRouter } from './routes/admin.js'
import { contentRouter } from './routes/content.js'
import { performanceRouter } from './routes/performance.js'
import { purchasesRouter } from './routes/purchases.js'
import { contactRouter } from './routes/contact.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../../dist')

export const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: config.corsOrigins }))
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', async (req, res) => {
  const { rows } = await query('SELECT NOW() AS database_time')
  res.json({ status: 'ok', database: 'connected', databaseTime: rows[0].database_time })
})

app.use('/api/frases', frasesRouter)
app.use('/api/postagens', postagensRouter)
app.use('/api/renda-fixa', rendaFixaRouter)
app.use('/api/auth', authRouter)
app.use('/api/carteira', carteiraRouter)
app.use('/api/carteira-publica', publicPortfolioRouter)
app.use('/api/admin', adminRouter)
app.use('/api/conteudos', contentRouter)
app.use('/api/rentabilidade', performanceRouter)
app.use('/api/compras', purchasesRouter)
app.use('/api/contato', contactRouter)

if (config.nodeEnv === 'production') {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)
