import { app } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'

async function start() {
  try {
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
