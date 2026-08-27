import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourcePath = resolve('data', 'samples', 'Ativos.txt')
const outputPath = resolve('src/data/portfolioAssetsSanitized.js')
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const parseNumber = value => Number(value.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')) || 0
const round = (value, digits = 2) => Number(value.toFixed(digits))
const monthKey = value => { const [, month, year] = value.split('/'); return `${year}-${month}` }
const normalizeIndexer = value => {
  const normalized = normalize(value)
  if (normalized.includes('inflacao')) return 'Inflação'
  if (normalized.includes('pos-fixado')) return 'Pós-fixado'
  return 'Prefixado'
}

const raw = await readFile(sourcePath, 'utf8')
const [headerLine, ...lines] = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
const headers = headerLine.split('\t').map(normalize)
const index = Object.fromEntries(headers.map((header, position) => [header, position]))
const field = (row, name) => row[index[normalize(name)]]?.trim() || ''
const required = ['Produto', 'Tipo', 'Valor Investido', 'Emissão', 'Vencimento', 'Dias Corridos', 'Dias Úteis', 'Taxa', 'Tipo Indexador', 'Rentabilidade Líquida', 'Rentabilidade Média']
for (const name of required) if (index[normalize(name)] === undefined) throw new Error(`Coluna obrigatória ausente: ${name}`)

const issuerAliases = new Map()
const sourceAssets = lines.map((line, position) => {
  const row = line.split('\t')
  const issuerName = field(row, 'Produto')
  if (!issuerAliases.has(issuerName)) issuerAliases.set(issuerName, `Emissor ${issuerAliases.size + 1}`)
  return {
    id: position + 1,
    issuer: issuerAliases.get(issuerName),
    product: field(row, 'Tipo'),
    investedValue: parseNumber(field(row, 'Valor Investido')),
    issuedAt: field(row, 'Emissão'), maturityAt: field(row, 'Vencimento'),
    calendarDays: Number(field(row, 'Dias Corridos')) || 0,
    businessDays: Number(field(row, 'Dias Úteis')) || 0,
    rate: field(row, 'Taxa'), rateType: normalizeIndexer(field(row, 'Tipo Indexador')),
    netReturn: parseNumber(field(row, 'Rentabilidade Líquida')),
    averageDailyReturn: parseNumber(field(row, 'Rentabilidade Média')),
  }
})

const totalInvested = sourceAssets.reduce((total, asset) => total + asset.investedValue, 0)
const assets = sourceAssets.map(({ investedValue, ...asset }) => ({ ...asset, allocation: round(investedValue / totalInvested * 100, 3) }))
const allocation = key => {
  const totals = new Map()
  for (const asset of sourceAssets) totals.set(asset[key], (totals.get(asset[key]) || 0) + asset.investedValue)
  return [...totals].map(([label, value]) => ({ label, percentage: round(value / totalInvested * 100, 1) })).sort((a, b) => b.percentage - a.percentage)
}
const maturityTotals = new Map()
for (const asset of sourceAssets) {
  const key = monthKey(asset.maturityAt)
  const current = maturityTotals.get(key) || { value: 0, count: 0 }
  current.value += asset.investedValue; current.count += 1; maturityTotals.set(key, current)
}
const maturities = [...maturityTotals].sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => ({ key, count: item.count, percentage: round(item.value / totalInvested * 100, 1) }))
const output = { assets, allocations: { product: allocation('product'), rateType: allocation('rateType'), issuer: allocation('issuer') }, maturities }

await writeFile(outputPath, `export default ${JSON.stringify(output)}\n`, 'utf8')
console.log(`Carteira sanitizada: ${assets.length} títulos, ${issuerAliases.size} emissores.`)
