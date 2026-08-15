import source from '../../Ativos.txt?raw'

const parseMoney = value => Number(value.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')) || 0
const classifyRate = rate => {
  const normalized = rate.toLocaleUpperCase('pt-BR')
  if (/IPCA|IGP|INPC/.test(normalized)) return 'Inflação'
  if (/CDI|SELIC/.test(normalized)) return 'Pós-fixado'
  return 'Prefixado'
}

const lines = source.trim().split(/\r?\n/).map(line => line.split('\t'))
const issuers = new Map()

export const portfolioAssets = lines.slice(1).filter(columns => columns.length >= 12).map((columns, index) => {
  const [, issuer, product, , , issuedAt, maturityAt, rate, netValue] = columns
  if (!issuers.has(issuer)) issuers.set(issuer, `Emissor ${issuers.size + 1}`)
  return {
    id: index + 1,
    issuer: issuers.get(issuer),
    product,
    issuedAt,
    maturityAt,
    rate,
    rateType: classifyRate(rate),
    weight: parseMoney(netValue),
  }
})

export function aggregateAssets(field) {
  const totals = portfolioAssets.reduce((result, asset) => {
    result[asset[field]] = (result[asset[field]] || 0) + asset.weight
    return result
  }, {})
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
  return Object.entries(totals)
    .map(([label, value]) => ({ label, value, percentage: total ? value / total * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}
