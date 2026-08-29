import { app } from './app.js'
import { config } from './config/index.js'
import { pool } from './config/database.js'

const googleClientIdPattern = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/

async function start() {
  try {
    if (config.authSecret.length < 32 || googleClientIdPattern.test(config.authSecret)) {
      throw new Error('AUTH_SECRET é obrigatório e deve ser uma chave aleatória de pelo menos 32 caracteres; não use o Client ID do Google.')
    }
    if (!['sandbox', 'production'].includes(config.asaas.environment)) {
      throw new Error('ASAAS_ENV deve ser sandbox ou production.')
    }
    if (config.asaas.webhookToken && (config.asaas.webhookToken.length < 32 || config.asaas.webhookToken.length > 255)) {
      throw new Error('ASAAS_WEBHOOK_TOKEN deve possuir entre 32 e 255 caracteres.')
    }
    if (!config.databaseUrl && typeof config.pg.password !== 'string') {
      throw new Error('PGPASSWORD não foi informado em server/.env.')
    }
    await pool.query('SELECT 1')
    app.listen(config.port, config.host, () => {
      console.log(`API disponível em http://${config.host}:${config.port}`)
    })
  } catch (error) {
    console.error('Não foi possível conectar ao PostgreSQL. Confira server/.env.')
    console.error(error.message)
    process.exit(1)
  }
}

start()
