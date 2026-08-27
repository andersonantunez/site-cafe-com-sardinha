import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePublicPortfolio } from '../server/src/services/portfolioService.js'

const portfolio = {
  updatedAt: '2026-08-25T12:00:00Z',
  settings: { mostrarVencimento: false, mostrarTipoProduto: false, mostrarTaxa: false, mostrarEmissor: false, nomeCarteira: 'Carteira teste' },
  assets: [
    { id: 1, issuer: 'Banco A', product: 'CDB', rate: '115% CDI', rateType: 'Pós-fixado', maturityAt: '10/03/2029', issuedAt: '10/03/2025', calendarDays: 100, businessDays: 80, investedValue: 100, netValue: 110, netReturn: 10, averageDailyReturn: .01, allocation: 50 },
    { id: 2, issuer: 'Banco B', product: 'LCA', rate: 'IPCA + 7%', rateType: 'Inflação', maturityAt: '15/08/2030', issuedAt: '15/08/2025', calendarDays: 100, businessDays: 80, investedValue: 100, netValue: 108, netReturn: 8, averageDailyReturn: .01, allocation: 50 },
    { id: 3, issuer: 'Banco C', product: 'CDB', rate: '110% CDI', rateType: 'Pós-fixado', maturityAt: '10/03/2031', issuedAt: '10/03/2026', calendarDays: 100, businessDays: 80, investedValue: 100, netValue: 106, netReturn: 6, averageDailyReturn: .01, allocation: 0 },
  ],
}

test('API pública omite campos privados e usa aliases consistentes', () => {
  const result = sanitizePublicPortfolio(portfolio)
  assert.equal(result.assets.length, portfolio.assets.length)
  assert.equal(result.assets[0].product, 'Produto 1')
  assert.equal(result.assets[0].issuer, 'Emissor 1')
  assert.equal(result.portfolioName, 'Carteira teste')
  assert.equal(result.assets[1].product, 'Produto 2')
  assert.equal(result.assets[2].product, 'Produto 1')
  assert.deepEqual(result.visibility, { mostrarVencimento: false, mostrarTipoProduto: false, mostrarTaxa: false, mostrarEmissor: false })
  for (const asset of result.assets) {
    assert.equal('rate' in asset, false)
    assert.equal('maturityAt' in asset, false)
    assert.equal('issuedAt' in asset, false)
    assert.equal(asset.businessDays, 80)
    assert.equal(asset.calendarDays, 100)
    assert.equal('investedValue' in asset, false)
    assert.equal('netValue' in asset, false)
  }
})
