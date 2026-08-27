import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPerformanceHistory } from '../src/lib/performanceHistory.js'

test('histórico mensal do banco é consolidado por capitalização composta', () => {
  const history = buildPerformanceHistory([
    { competence: '2026-01-01', portfolio: 1, cdi: 0.8, cdiPercent: 125 },
    { competence: '2026-02-01', portfolio: 2, cdi: 1, cdiPercent: 200 },
  ])
  assert.equal(history.monthlyPerformance.length, 2)
  assert.equal(Number(history.performancePeriod.accumulated.toFixed(4)), 3.02)
  assert.equal(history.performancePeriod.monthsAboveCdi, 2)
  assert.equal(history.annualPerformance[0].months.length, 2)
})

test('histórico vazio não inventa indicadores', () => {
  const history = buildPerformanceHistory([])
  assert.equal(history.performancePeriod, null)
  assert.deepEqual(history.annualPerformance, [])
})
