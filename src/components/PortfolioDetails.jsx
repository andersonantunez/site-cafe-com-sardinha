import React, { useMemo, useState } from 'react'
import { BarChart3, CalendarRange, ChevronDown, ChevronUp, PieChart } from 'lucide-react'
import { aggregateAssets, aggregateMaturities, portfolioAssets } from '../lib/portfolioAssets.js'
import gurusPiramImage from '../assets/images/gurus-piram.png'

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
const maturityMonthName = key => {
  const month = Number(key.slice(5, 7))
  return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1]
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

function IssuerAllocationChart({ data }) {
  const maximum = Math.max(...data.map(item => item.percentage))
  return <article className="issuer-allocation-card">
    <div className="allocation-title"><BarChart3/><div><span>Composição pelo valor líquido</span><h3>Participação por emissor</h3></div></div>
    <div className="issuer-bars" role="img" aria-label={`Participação por emissor: ${data.map(item => `${item.label} ${item.percentage.toFixed(1)}%`).join(', ')}`}>
      {data.map((item, index) => <div className="issuer-bar-row" key={item.label}>
        <span>{item.label}</span>
        <div><i style={{ width: `${maximum ? item.percentage / maximum * 100 : 0}%`, background: colors[index % colors.length] }}/></div>
        <strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
      </div>)}
    </div>
  </article>
}

function MaturityChart({ data }) {
  const years = [...new Set(data.map(item => item.key.slice(0, 4)))]
  const [selectedYear, setSelectedYear] = useState(years[0])
  const visibleMaturities = data.filter(item => item.key.startsWith(selectedYear))
  const maximum = Math.max(...visibleMaturities.map(item => item.percentage))
  return <article className="maturity-card">
    <div className="maturity-heading">
      <div className="allocation-title"><CalendarRange/><div><span>Do menor ao maior vencimento</span><h3>Calendário mensal de vencimentos</h3></div></div>
      <label>Ano<select value={selectedYear} onChange={event => setSelectedYear(event.target.value)}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    </div>
    <p>As barras mostram o percentual da carteira que vence em cada mês. O valor absoluto das posições permanece oculto.</p>
    <div className="maturity-chart-wrap">
      <div className="maturity-chart" role="img" aria-label={`Vencimentos mensais em ${selectedYear}: ${visibleMaturities.map(item => `${maturityMonthName(item.key)}, ${item.count} títulos, ${item.percentage.toFixed(1)}% da carteira`).join('; ')}`}>
        {visibleMaturities.map(item => <div className="maturity-column" key={item.key} title={`${maturityMonthName(item.key)} de ${selectedYear}: ${item.count} ${item.count === 1 ? 'título' : 'títulos'} · ${item.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da carteira`}>
          <strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
          <div><i style={{ height: `${maximum ? item.percentage / maximum * 100 : 0}%` }}/></div>
          <span>{maturityMonthName(item.key)}</span>
          <small>{item.count} {item.count === 1 ? 'título' : 'títulos'}</small>
        </div>)}
      </div>
    </div>
  </article>
}

export default function PortfolioDetails() {
  const [visible, setVisible] = useState(false)
  const [sort, setSort] = useState({ key: 'maturityAt', direction: 'asc' })
  const products = useMemo(() => aggregateAssets('product'), [])
  const rateTypes = useMemo(() => aggregateAssets('rateType'), [])
  const issuers = useMemo(() => aggregateAssets('issuer'), [])
  const maturities = useMemo(() => aggregateMaturities(), [])
  const sortedAssets = useMemo(() => [...portfolioAssets].sort((a, b) => {
    const left = compareValue(a, sort.key)
    const right = compareValue(b, sort.key)
    const result = typeof left === 'number' ? left - right : left.localeCompare(right, 'pt-BR', { numeric: true })
    return sort.direction === 'asc' ? result : -result
  }), [sort])
  const changeSort = key => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))

  return <section className="portfolio-disclosure">
    <button className="portfolio-toggle" type="button" aria-expanded={visible} onClick={() => setVisible(current => !current)}>
      <span><PieChart/>Detalhamento da carteira</span>
      {visible ? <ChevronUp/> : <ChevronDown/>}
    </button>
    {visible && <div className="portfolio-content">
      <div className="portfolio-heading"><div className="portfolio-heading-copy"><h2><span>Detalhe da carteira:</span> <strong>Gurus Piram</strong></h2><p>Os emissores foram anonimizados. Os gráficos consideram a participação de cada posição pelo valor líquido.</p></div><img src={gurusPiramImage} alt="Três gurus fictícios com expressão de espanto"/></div>
      <div className="allocation-grid"><AllocationChart title="Por tipo de produto" data={products}/><AllocationChart title="Por indexador" data={rateTypes}/><IssuerAllocationChart data={issuers}/></div>
      <div className="assets-table-wrap"><table className="assets-table">
        <thead><tr>{columns.map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}{sort.key === key ? sort.direction === 'asc' ? <ChevronUp/> : <ChevronDown/> : null}</button></th>)}</tr></thead>
        <tbody>{sortedAssets.map(asset => <tr key={asset.id}><td>{asset.issuer}</td><td><strong>{asset.product}</strong></td><td><span className={`rate-badge ${asset.rateType === 'Inflação' ? 'inflation' : asset.rateType === 'Pós-fixado' ? 'post' : 'pre'}`}>{asset.rateType}</span></td><td>{asset.issuedAt}</td><td>{asset.maturityAt}</td><td>{asset.rate}</td></tr>)}</tbody>
      </table></div>
      <MaturityChart data={maturities}/>
    </div>}
  </section>
}
