import { Router } from 'express'
import { query } from '../config/database.js'

export const performanceRouter = Router()

performanceRouter.get('/', async (req, res) => {
  const { rows } = await query(`SELECT competencia,rentabilidade_carteira,rentabilidade_cdi,percentual_cdi
    FROM rentabilidade_mensal WHERE publicado ORDER BY competencia`)
  res.json(rows.map(row => ({
    competence: row.competencia,
    portfolio: Number(row.rentabilidade_carteira),
    cdi: Number(row.rentabilidade_cdi),
    cdiPercent: Number(row.percentual_cdi),
  })))
})
