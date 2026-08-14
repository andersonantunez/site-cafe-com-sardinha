import pg from 'pg'
import { config } from './config.js'

const poolOptions = config.databaseUrl
  ? { connectionString: config.databaseUrl, ssl: config.pg.ssl }
  : config.pg

export const pool = new pg.Pool(poolOptions)

pool.on('error', error => {
  console.error('Erro inesperado no pool do PostgreSQL:', error)
})

export function query(text, params) {
  return pool.query(text, params)
}
