import test from 'node:test'
import assert from 'node:assert/strict'
import { mapPortfolioRows, partitionPortfolioRows } from '../server/src/services/portfolioService.js'

const row = (id, liquidado, valor) => ({
  id, codigo: `T${id}`, produto: `Banco ${id}`, tipo: 'CDB', valor_investido: valor,
  emissao: '2025-01-01', vencimento: '2028-01-01', dias_corridos: 100,
  dias_uteis: 70, taxa: '110% CDI', tipo_indexador: 'PÓS-FIXADO',
  preco_unitario: valor, quantidade: 1, valor_liquido: valor * 1.1,
  rentabilidade_liquida: 10, rentabilidade_media: 0.01, liquidado,
})

test('posição atual e liquidados são separados pelo status real', () => {
  const grouped = partitionPortfolioRows([row(1, false, 100), row(2, true, 900), row(3, false, 300)])
  assert.deepEqual(grouped.current.map(item => item.id), [1, 3])
  assert.deepEqual(grouped.liquidated.map(item => item.id), [2])
})

test('consolidação recalcula percentuais dentro de cada conjunto selecionado', () => {
  const assets = mapPortfolioRows([row(1, false, 100), row(3, false, 300)])
  assert.equal(assets[0].allocation, 25)
  assert.equal(assets[1].allocation, 75)
  assert.equal(assets.reduce((sum, asset) => sum + asset.allocation, 0), 100)
})
