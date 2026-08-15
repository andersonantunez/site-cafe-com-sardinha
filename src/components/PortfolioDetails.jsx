import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, PieChart } from 'lucide-react'
import { aggregateAssets, portfolioAssets } from '../lib/portfolioAssets.js'

const colors = ['#0879a8', '#e89a3d', '#74472f', '#3d9970', '#7656a8']
const columns = [
  ['issuer', 'Emissor'],
  ['product', 'Produto'],
  ['rateType', 'Indexador'],
  ['issuedAt', 'Emissão'],
  ['maturityAt', 'Vencimento'],
  ['rate', 'Taxa'],
]
const dateValue = value => {
  const [day, month, year] = value.split('/').map(Number)
  return new Date(year, month - 1, day).getTime()
}
const compareValue = (asset, key) => key === 'issuedAt' || key === 'maturityAt' ? dateValue(asset[key]) : asset[key]

function AllocationChart({ title, data }) {
  let accumulated = 0
  const stops = data.map((item, index) => {
    const start = accumulated
    accumulated += item.percentage
    return `${colors[index % colors.length]} ${start}% ${accumulated}%`
  }).join(', ')

  return <article className="allocation-card">
    <div className="allocation-title"><PieChart/><div><span>Composição pelo valor líquido</span><h3>{title}</h3></div></div>
    <div className="allocation-content">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={`${title}: ${data.map(item => `${item.label} ${item.percentage.toFixed(1)}%`).join(', ')}`}><span>{data.length}<small>grupos</small></span></div>
      <div className="allocation-legend">{data.map((item, index) => <div key={item.label}><i style={{ background: colors[index % colors.length] }}/><span>{item.label}</span><strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong></div>)}</div>
    </div>
  </article>
}

export default function PortfolioDetails() {
  const [visible, setVisible] = useState(false)
  const [sort, setSort] = useState({ key: 'maturityAt', direction: 'asc' })
  const products = useMemo(() => aggregateAssets('product'), [])
  const rateTypes = useMemo(() => aggregateAssets('rateType'), [])
  const sortedAssets = useMemo(() => [...portfolioAssets].sort((a, b) => {
    const left = compareValue(a, sort.key)
    const right = compareValue(b, sort.key)
    const result = typeof left === 'number' ? left - right : left.localeCompare(right, 'pt-BR', { numeric: true })
    return sort.direction === 'asc' ? result : -result
  }), [sort])
  const changeSort = key => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))

  return <section className="portfolio-disclosure">
    <button className="portfolio-toggle" type="button" aria-expanded={visible} onClick={() => setVisible(current => !current)}>
      <span><PieChart/>Detalhamento da carteira</span>{visible ? <ChevronUp/> : <ChevronDown/>}
    </button>
    {visible && <div className="portfolio-content">
      <div className="portfolio-heading"><div><span className="eyebrow">Composição atual</span><h2>Detalhamento da carteira</h2></div><p>Os emissores foram anonimizados. Os gráficos consideram a participação de cada posição pelo valor líquido.</p></div>
      <div className="allocation-grid"><AllocationChart title="Por tipo de produto" data={products}/><AllocationChart title="Por indexador" data={rateTypes}/></div>
      <div className="assets-table-wrap"><table className="assets-table">
        <thead><tr>{columns.map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}{sort.key === key ? sort.direction === 'asc' ? <ChevronUp/> : <ChevronDown/> : null}</button></th>)}</tr></thead>
        <tbody>{sortedAssets.map(asset => <tr key={asset.id}><td>{asset.issuer}</td><td><strong>{asset.product}</strong></td><td><span className={`rate-badge ${asset.rateType === 'Inflação' ? 'inflation' : asset.rateType === 'Pós-fixado' ? 'post' : 'pre'}`}>{asset.rateType}</span></td><td>{asset.issuedAt}</td><td>{asset.maturityAt}</td><td>{asset.rate}</td></tr>)}</tbody>
      </table></div>
    </div>}
  </section>
}
