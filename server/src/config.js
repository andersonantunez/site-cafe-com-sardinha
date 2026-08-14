import 'dotenv/config'

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true'
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3001),
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
}
