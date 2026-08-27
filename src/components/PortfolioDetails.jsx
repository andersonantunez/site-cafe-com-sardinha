import React, { useMemo, useState } from 'react'
import { BarChart3, CalendarRange, ChevronDown, ChevronUp, Eye, EyeOff, PieChart } from 'lucide-react'
import gurusPiramImage from '../assets/images/gurus-piram.png'

const colors = ['#0879a8', '#e89a3d', '#74472f', '#3d9970', '#7656a8']
const colorForLabel = (label, index = 0) => { const value = String(label || '').toLocaleLowerCase('pt-BR'); if (value.includes('cdb')) return colors[0]; if (value.includes('lca')) return colors[1]; if (value.includes('lci')) return colors[2]; if (value.includes('pós') || value.includes('pos')) return colors[3]; if (value.includes('pré') || value.includes('pre')) return colors[0]; if (value.includes('infla')) return colors[4]; const productNumber = value.match(/^produto\s+(\d+)/); return productNumber ? colors[(Number(productNumber[1]) - 1) % colors.length] : colors[(index + 3) % colors.length] }
const productColorClass = (label, index = 0) => `product-color-${colors.indexOf(colorForLabel(label, index))}`
const indexerColorClass = label => { const value = String(label || '').toLocaleLowerCase('pt-BR'); return value.includes('infla') ? 'rate-inflation' : value.includes('pós') || value.includes('pos') ? 'rate-post' : value.includes('pré') || value.includes('pre') ? 'rate-pre' : 'rate-other' }
const allColumns = [
  ['issuer', 'Emissor'],
  ['product', 'Produto'],
  ['rateType', 'Indexador e taxa'],
  ['issuedAt', 'Emissão'],
  ['maturityAt', 'Vencimento'],
  ['businessDays', 'Prazo'],
  ['investedValue', 'Valor investido'],
  ['netValue', 'Valor corrigido'],
  ['netReturn', 'Rent. líquida'],
  ['averageDailyReturn', 'Média diária'],
]
const dateValue = value => {
  if (!value) return 0
  const [day, month, year] = value.split('/').map(Number)
  return new Date(year, month - 1, day).getTime()
}
const maturityMonthName = key => {
  const month = Number(key.slice(5, 7))
  return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month - 1]
}
const compareValue = (asset, key) => key === 'issuedAt' || key === 'maturityAt' ? dateValue(asset[key]) : asset[key]
const percentage = (value, digits = 2) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
const ChartFinancialValues = ({ assets, show }) => show ? <p className="chart-financial-values"><span>Valor investido: <strong>{assets.reduce((sum, asset) => sum + (Number(asset.investedValue) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span><span>Valor corrigido: <strong>{assets.reduce((sum, asset) => sum + (Number(asset.netValue) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span></p> : null
const aggregatePortfolio = (assets, field) => {
  const total = assets.reduce((sum, asset) => sum + (asset.investedValue ?? asset.allocation), 0)
  const groups = new Map()
  for (const asset of assets) {
    const group = groups.get(asset[field]) || { investedValue: 0, netValue: 0 }
    group.investedValue += Number(asset.investedValue ?? asset.allocation) || 0
    group.netValue += Number(asset.netValue) || 0
    groups.set(asset[field], group)
  }
  return [...groups].map(([label, group]) => ({ label, ...group, percentage: total ? group.investedValue / total * 100 : 0 })).sort((a, b) => b.percentage - a.percentage)
}
const aggregatePortfolioMaturities = assets => {
  const total = assets.reduce((sum, asset) => sum + (asset.investedValue ?? asset.allocation), 0)
  const groups = new Map()
  for (const asset of assets) {
    const [day, month, year] = asset.maturityAt.split('/')
    const key = `${year}-${month}`
    const group = groups.get(key) || { value: 0, count: 0 }
    group.value += asset.investedValue ?? asset.allocation; group.count += 1; groups.set(key, group)
  }
  return [...groups].sort(([left], [right]) => left.localeCompare(right)).map(([key, group]) => ({ key, count: group.count, percentage: total ? group.value / total * 100 : 0 }))
}

function AllocationChart({ title, data, showFinancialValues }) {
  let accumulated = 0
  const stops = data.map((item, index) => {
    const start = accumulated
    accumulated += item.percentage
    return `${colorForLabel(item.label, index)} ${start}% ${accumulated}%`
  }).join(', ')

  return <article className="allocation-card">
    <div className="allocation-title"><PieChart/><div><span>Composição pelo valor investido</span><h3>{title}</h3></div></div>
    <div className="allocation-content">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label={`${title}: ${data.map(item => `${item.label} ${item.percentage.toFixed(1)}%`).join(', ')}`}><span>{data.length}<small>grupos</small></span></div>
      <div className="allocation-legend">{data.map((item, index) => <div key={item.label}><i style={{ background: colorForLabel(item.label, index) }}/><span>{item.label}{showFinancialValues && <small>{item.investedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} investido · {item.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} corrigido</small>}</span><strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong></div>)}</div>
    </div>
  </article>
}

function IssuerAllocationChart({ data, showFinancialValues }) {
  const maximum = Math.max(...data.map(item => item.percentage))
  const [activeIssuer, setActiveIssuer] = useState(null)
  return <article className="issuer-allocation-card">
    <div className="allocation-title"><BarChart3/><div><span>Composição pelo valor investido</span><h3>Participação por emissor</h3></div></div>
    <div className="issuer-bars" role="img" aria-label={`Participação por emissor: ${data.map(item => `${item.label} ${item.percentage.toFixed(1)}%`).join(', ')}`}>
      {data.map((item, index) => <div className="issuer-bar-row" key={item.label}>
        <button type="button" title={item.label}><span className="issuer-label">{item.label}</span></button>
        <div className="issuer-bar-track" tabIndex="0" onMouseEnter={() => setActiveIssuer(item.label)} onMouseLeave={() => setActiveIssuer(null)} onFocus={() => setActiveIssuer(item.label)} onBlur={() => setActiveIssuer(null)}><i style={{ width: `${maximum ? item.percentage / maximum * 100 : 0}%`, background: colors[index % colors.length] }}/>{activeIssuer === item.label && <span className="asset-return-tooltip issuer-tooltip"><span>{item.label}</span></span>}</div>
        <strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
      </div>)}
    </div>
  </article>
}

function MaturityChart({ data, assets, visibility, showFinancialValues }) {
  const years = [...new Set(data.map(item => item.key.slice(0, 4)))]
  const [selectedYear, setSelectedYear] = useState(years[0])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const visibleMaturities = data.filter(item => item.key.startsWith(selectedYear))
  const maximum = Math.max(...visibleMaturities.map(item => item.percentage))
  const selectedTitles = selectedMonth ? assets.filter(asset => {
    const [, month, year] = asset.maturityAt.split('/')
    return `${year}-${month}` === selectedMonth
  }) : []
  return <article className="maturity-card">
    <div className="maturity-heading">
      <div className="allocation-title"><CalendarRange/><div><span>Do menor ao maior vencimento</span><h3>Calendário mensal de vencimentos</h3></div></div>
      <label>Ano<select value={selectedYear} onChange={event => { setSelectedYear(event.target.value); setSelectedMonth(null) }}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
    </div>
    <p>As barras mostram o percentual da carteira que vence em cada mês. O valor absoluto das posições permanece oculto.</p>
    <div className="maturity-chart-wrap">
      <div className="maturity-chart" role="img" aria-label={`Vencimentos mensais em ${selectedYear}: ${visibleMaturities.map(item => `${maturityMonthName(item.key)}, ${item.count} títulos, ${item.percentage.toFixed(1)}% da carteira`).join('; ')}`}>
        {visibleMaturities.map(item => <button type="button" className="maturity-column" aria-pressed={selectedMonth === item.key} key={item.key} title={`${maturityMonthName(item.key)} de ${selectedYear}: ${item.count} ${item.count === 1 ? 'título' : 'títulos'} · ${item.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da carteira`} onClick={() => setSelectedMonth(current => current === item.key ? null : item.key)}>
          <strong>{item.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
          <div><i style={{ height: `${maximum ? item.percentage / maximum * 100 : 0}%` }}/></div>
          <span>{maturityMonthName(item.key)}</span>
          <small>{item.count} {item.count === 1 ? 'título' : 'títulos'}</small>
        </button>)}
      </div>
    </div>
    {selectedMonth && <div className="maturity-titles"><h4>Títulos com vencimento em {maturityMonthName(selectedMonth)}</h4><div className="maturity-titles-table"><table><thead><tr>{visibility.mostrarEmissor && <th>Emissor</th>}<th>Produto</th><th>Indexador e taxa</th><th>Vencimento</th>{showFinancialValues && <th className="maturity-value">Valor corrigido</th>}<th className="maturity-value">Rent. líquida</th></tr></thead><tbody>{selectedTitles.map((asset, index) => <tr key={asset.id}>{visibility.mostrarEmissor && <td>{asset.issuer}</td>}<td><span className={`product-chip ${productColorClass(asset.product, index)}`}>{asset.product}</span></td><td><span className={`product-chip ${indexerColorClass(asset.rateType)}`}>{asset.rateType}</span>{visibility.mostrarTaxa && asset.rate ? ` · ${asset.rate}` : ''}</td><td>{asset.maturityAt}</td>{showFinancialValues && <td className="maturity-value">{asset.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>}<td className="maturity-value">{percentage(asset.netReturn)}</td></tr>)}</tbody></table></div></div>}
  </article>
}

function AssetReturnChart({ assets, visibility, showFinancialValues }) {
  const [activeAsset, setActiveAsset] = useState(null)
  const [year, setYear] = useState('all')
  const [rateType, setRateType] = useState('all')
  const years = visibility.mostrarVencimento ? [...new Set(assets.map(asset => asset.maturityAt?.slice(-4)).filter(Boolean))].sort() : []
  const rateTypes = [...new Set(assets.map(asset => asset.rateType))]
  const indexedAssets = assets.map((asset, index) => ({ ...asset, titleId: `T${index + 1}` }))
  const filteredAssets = indexedAssets.filter(asset => (year === 'all' || asset.maturityAt?.endsWith(year)) && (rateType === 'all' || asset.rateType === rateType))
  const maximum = Math.ceil(Math.max(...filteredAssets.map(asset => asset.netReturn), 0) / 10) * 10 || 10
  const ticks = Array.from({ length: maximum / 10 + 1 }, (_, index) => maximum - index * 10)
  const chartWidth = Math.max(720, filteredAssets.length * 54)
  const highestReturn = filteredAssets.length ? filteredAssets.reduce((best, asset) => asset.netReturn > best.netReturn ? asset : best) : null
  const largestPosition = filteredAssets.length ? filteredAssets.reduce((largest, asset) => asset.allocation > largest.allocation ? asset : largest) : null
  const totalAllocation = filteredAssets.reduce((sum, asset) => sum + asset.allocation, 0)
  const weightedReturn = totalAllocation ? filteredAssets.reduce((sum, asset) => sum + asset.netReturn * asset.allocation, 0) / totalAllocation : 0

  return <article className="asset-return-card">
    <div className="asset-return-heading">
      <div className="allocation-title"><BarChart3/><div><span>Rentabilidade individual dos ativos</span><h3>Rentabilidade acumulada por título</h3></div></div>
      <div className="asset-return-filters">
        {visibility.mostrarVencimento && <label>Ano de vencimento<select value={year} onChange={event => { setYear(event.target.value); setActiveAsset(null) }}><option value="all">Todos os anos</option>{years.map(option => <option value={option} key={option}>{option}</option>)}</select></label>}
        <label>Indexador<select value={rateType} onChange={event => { setRateType(event.target.value); setActiveAsset(null) }}><option value="all">Todos</option>{rateTypes.map(option => <option value={option} key={option}>{option}</option>)}</select></label>
      </div>
    </div>
    <p>Cada ponto representa um título da tabela. Passe o mouse ou use o teclado sobre T1, T2, T3… para consultar todos os detalhes.</p>
    <div className="asset-return-size-legend"><span>Menor posição</span><i/><i/><i/><span>Maior posição</span><strong>{filteredAssets.length} {filteredAssets.length === 1 ? 'título exibido' : 'títulos exibidos'}</strong></div>
    <div className="asset-return-scroll">
      <div className="asset-return-chart" style={{ width: `${chartWidth}px` }}>
        <div className="asset-return-y-title">Rentabilidade acumulada (%)</div>
        <div className="asset-return-plot">
          {ticks.map(tick => <div className="asset-return-gridline" key={tick} style={{ bottom: `${maximum ? tick / maximum * 100 : 0}%` }}><span>{tick}%</span></div>)}
          {filteredAssets.map((asset, index) => {
            const active = activeAsset?.id === asset.id
            const edge = index < 4 ? 'edge-left' : index >= filteredAssets.length - 4 ? 'edge-right' : ''
            const pointSize = 8 + Math.sqrt(asset.allocation) * 6
            return <div className={`asset-return-column ${active ? 'active' : ''} ${edge}`} key={asset.id} style={{ left: `${(index + .5) / filteredAssets.length * 100}%` }}>
              <button type="button" className="asset-return-point" style={{ bottom: `${asset.netReturn / maximum * 100}%`, width: `${pointSize}px`, height: `${pointSize}px` }} aria-label={`${asset.titleId}: ${asset.product} de ${asset.issuer}, rentabilidade acumulada ${percentage(asset.netReturn)}, posição ${percentage(asset.allocation, 1)}`} onMouseEnter={() => setActiveAsset(asset)} onMouseLeave={() => setActiveAsset(null)} onFocus={() => setActiveAsset(asset)} onBlur={() => setActiveAsset(null)} />
              <span className="asset-return-x-label">{asset.titleId}</span>
              {active && <div className="asset-return-tooltip" style={{ bottom: `${maximum ? asset.netReturn / maximum * 100 : 0}%` }}>
                <strong>{asset.titleId} · {asset.product}</strong>
                <span>{asset.issuer} · {asset.rateType}</span>{visibility.mostrarTaxa && asset.rate && <span>Taxa: {asset.rate}</span>}
                {visibility.mostrarVencimento && <><span>Emissão: {asset.issuedAt}</span><span>Vencimento: {asset.maturityAt}</span><span>Prazo: {asset.businessDays?.toLocaleString('pt-BR')} dias úteis</span></>}
                <b>Rentabilidade acumulada: {percentage(asset.netReturn)}</b>
                <span>Participação na carteira: {percentage(asset.allocation, 1)}</span>
                {showFinancialValues && <><span>Valor investido: {asset.investedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span>Valor corrigido: {asset.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></>}
                <span>Média diária: {percentage(asset.averageDailyReturn, 4)}</span>
              </div>}
            </div>
          })}
        </div>
        <div className="asset-return-x-title">Títulos</div>
      </div>
    </div>
    {highestReturn ? <p className="chart-insight"><strong>Leitura:</strong> Entre os {filteredAssets.length} títulos exibidos, {highestReturn.titleId} possui a maior rentabilidade acumulada, com {percentage(highestReturn.netReturn)}. A maior posição é {largestPosition.titleId}, que representa {percentage(largestPosition.allocation, 1)} da carteira e acumula {percentage(largestPosition.netReturn)}. Considerando o tamanho de cada posição, a rentabilidade média ponderada do recorte selecionado é de {percentage(weightedReturn)}.</p> : <p className="chart-insight"><strong>Leitura:</strong> Não existem títulos que atendam simultaneamente aos filtros selecionados.</p>}
  </article>
}

const remainingDays = maturityAt => Math.max(0, Math.ceil((dateValue(maturityAt) - Date.now()) / 86400000))
const formatDuration = totalDays => {
  let days = Math.max(0, Math.round(Number(totalDays) || 0))
  const years = Math.floor(days / 365); days %= 365
  const months = Math.floor(days / 30); days %= 30
  const parts = []
  if (years) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`)
  if (months) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`)
  if (days || !parts.length) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`)
  return parts.join(', ')
}

function RiskReturnChart({ assets, showFinancialValues }) {
  const [activeId, setActiveId] = useState(null)
  const points = assets.map((asset, index) => ({ ...asset, titleId: `T${index + 1}`, remaining: remainingDays(asset.maturityAt) }))
  const maximumDays = Math.ceil(Math.max(...points.map(asset => asset.remaining), 1) / 365) * 365
  const maximumReturn = Math.ceil(Math.max(...points.map(asset => asset.netReturn), 1) / 10) * 10
  const yearTicks = Array.from({ length: Math.ceil(maximumDays / 365) + 1 }, (_, index) => index)
  const quarterTicks = Array.from({ length: Math.floor(maximumDays / (365 / 4)) + 1 }, (_, index) => index)
  const returnTicks = Array.from({ length: maximumReturn / 10 + 1 }, (_, index) => index * 10)
  const highestReturn = points.reduce((best, asset) => asset.netReturn > best.netReturn ? asset : best)
  const largestPosition = points.reduce((largest, asset) => asset.allocation > largest.allocation ? asset : largest)

  return <article className="portfolio-analysis-card risk-return-card">
    <div className="allocation-title"><BarChart3/><div><span>Relação entre tempo e resultado</span><h3>Risco × retorno dos títulos</h3></div></div>
    <p>O prazo restante aparece no eixo horizontal e a rentabilidade acumulada no vertical. O tamanho do ponto representa a participação na carteira.</p>
    <div className="risk-return-wrap">
      <div className="risk-return-y-title">Rentabilidade acumulada (%)</div>
      <div className="risk-return-plot">
        {returnTicks.map(tick => <div className="risk-return-hline" key={tick} style={{ bottom: `${tick / maximumReturn * 100}%` }}><span>{tick}%</span></div>)}
        {quarterTicks.map(quarter => quarter % 4 !== 0 && <div className="risk-return-vline quarter" key={`q${quarter}`} style={{ left: `${quarter * (365 / 4) / maximumDays * 100}%` }}/>) }
        {yearTicks.map(year => <div className="risk-return-vline" key={year} style={{ left: `${year * 365 / maximumDays * 100}%` }}><span>{year}a</span></div>)}
        {points.map(asset => <button type="button" key={asset.id} className={`risk-return-point ${activeId === asset.id ? 'active' : ''}`} style={{ left: `${asset.remaining / maximumDays * 100}%`, bottom: `${asset.netReturn / maximumReturn * 100}%`, width: `${8 + Math.sqrt(asset.allocation) * 5}px`, height: `${8 + Math.sqrt(asset.allocation) * 5}px` }} onMouseEnter={() => setActiveId(asset.id)} onMouseLeave={() => setActiveId(null)} onFocus={() => setActiveId(asset.id)} onBlur={() => setActiveId(null)} aria-label={`${asset.titleId}, ${asset.product}, prazo restante ${Math.round(asset.remaining / 30)} meses, rentabilidade ${percentage(asset.netReturn)}`}>
          {activeId === asset.id && <span className="risk-return-tooltip"><strong>{asset.titleId} · {asset.product}</strong><i>{asset.issuer} · {asset.rate}</i><i>Prazo restante: {Math.round(asset.remaining / 30)} meses</i><i>Rentabilidade: {percentage(asset.netReturn)}</i><i>Participação: {percentage(asset.allocation, 1)}</i>{showFinancialValues && <><i>Investido: {asset.investedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</i><i>Corrigido: {asset.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</i></>}</span>}
        </button>)}
      </div>
      <div className="risk-return-x-title">Prazo restante (anos)</div>
    </div>
    <p className="chart-insight"><strong>Leitura:</strong> {highestReturn.titleId} apresenta a maior rentabilidade acumulada, com {percentage(highestReturn.netReturn)}, e ainda possui cerca de {Math.round(highestReturn.remaining / 30)} meses até o vencimento. A maior posição é {largestPosition.titleId}, com {percentage(largestPosition.allocation, 1)} da carteira e retorno acumulado de {percentage(largestPosition.netReturn)}, mostrando onde a relação entre exposição, prazo e resultado merece mais atenção.</p>
  </article>
}

function ConcentrationHeatmap({ assets, showFinancialValues }) {
  const issuers = [...new Set(assets.map(asset => asset.issuer))]
  const years = [...new Set(assets.map(asset => asset.maturityAt.slice(-4)))].sort()
  const values = issuers.flatMap(issuer => years.map(year => assets.filter(asset => asset.issuer === issuer && asset.maturityAt.endsWith(year)).reduce((sum, asset) => sum + asset.allocation, 0)))
  const maximum = Math.max(...values, 1)
  const strongestCellIndex = values.indexOf(Math.max(...values))
  const strongestIssuer = issuers[Math.floor(strongestCellIndex / years.length)]
  const strongestYear = years[strongestCellIndex % years.length]

  return <article className="portfolio-analysis-card heatmap-card">
    <div className="allocation-title"><PieChart/><div><span>Emissor combinado com vencimento</span><h3>Mapa de calor da concentração</h3></div></div>
    <p>Quanto mais intensa a cor, maior é a parcela da carteira concentrada naquele emissor e ano de vencimento.</p>
    <ChartFinancialValues assets={assets} show={showFinancialValues}/>
    <div className="heatmap-scroll"><div className="portfolio-heatmap" style={{ gridTemplateColumns: `100px repeat(${years.length}, minmax(58px, 1fr))` }}>
      <span className="heatmap-corner">Emissor</span>{years.map(year => <strong key={year}>{year}</strong>)}
      {issuers.map(issuer => <React.Fragment key={issuer}><b>{issuer}</b>{years.map(year => {
        const value = assets.filter(asset => asset.issuer === issuer && asset.maturityAt.endsWith(year)).reduce((sum, asset) => sum + asset.allocation, 0)
        return <span key={year} className={value ? 'filled' : ''} style={{ '--intensity': value ? .16 + value / maximum * .84 : 0 }} title={`${issuer} · ${year}: ${percentage(value, 1)} da carteira`}>{value ? percentage(value, 1) : '—'}</span>
      })}</React.Fragment>)}
    </div></div>
    <p className="chart-insight"><strong>Leitura:</strong> A maior concentração conjunta está em {strongestIssuer}, com vencimento em {strongestYear}, representando {percentage(values[strongestCellIndex], 1)} da carteira. Essa célula é o principal ponto de atenção porque reúne risco de emissor e necessidade de liquidez no mesmo período.</p>
  </article>
}

function ReturnDistributionChart({ assets, showFinancialValues }) {
  const step = 10
  const limit = Math.ceil(Math.max(...assets.map(asset => asset.netReturn)) / step) * step
  const bins = Array.from({ length: limit / step }, (_, index) => ({ minimum: index * step, maximum: (index + 1) * step }))
    .map((bin, index, all) => ({ ...bin, count: assets.filter(asset => asset.netReturn >= bin.minimum && (asset.netReturn < bin.maximum || index === all.length - 1 && asset.netReturn <= bin.maximum)).length }))
  const maximumCount = Math.max(...bins.map(bin => bin.count), 1)
  const mostCommonBin = bins.reduce((mostCommon, bin) => bin.count > mostCommon.count ? bin : mostCommon)

  return <article className="portfolio-analysis-card distribution-card">
    <div className="allocation-title"><BarChart3/><div><span>Frequência por faixa de resultado</span><h3>Distribuição da rentabilidade</h3></div></div>
    <p>Mostra quantos títulos estão em cada faixa de rentabilidade acumulada.</p>
    <ChartFinancialValues assets={assets} show={showFinancialValues}/>
    <div className="distribution-chart" role="img" aria-label={bins.map(bin => `${bin.minimum}% a ${bin.maximum}%: ${bin.count} títulos`).join('; ')}>{bins.map(bin => <div className="distribution-column" key={bin.minimum} title={`${bin.minimum}% a ${bin.maximum}%: ${bin.count} ${bin.count === 1 ? 'título' : 'títulos'}`}><strong>{bin.count}</strong><div><i style={{ height: `${bin.count / maximumCount * 100}%` }}/></div><span>{bin.minimum}–{bin.maximum}%</span></div>)}</div>
    <p className="chart-insight"><strong>Leitura:</strong> A faixa predominante vai de {mostCommonBin.minimum}% a {mostCommonBin.maximum}%, reunindo {mostCommonBin.count} títulos, ou {percentage(mostCommonBin.count / assets.length * 100, 1)} da carteira em quantidade. Isso indica onde está concentrado o desempenho mais comum e ajuda a distinguir o comportamento geral dos poucos títulos com retornos extremos.</p>
  </article>
}

function IndexerReturnChart({ assets, showFinancialValues }) {
  const data = [...new Set(assets.map(asset => asset.rateType))].map(rateType => {
    const group = assets.filter(asset => asset.rateType === rateType)
    const totalAllocation = group.reduce((sum, asset) => sum + asset.allocation, 0)
    return { label: rateType, simple: group.reduce((sum, asset) => sum + asset.netReturn, 0) / group.length, weighted: group.reduce((sum, asset) => sum + asset.netReturn * asset.allocation, 0) / totalAllocation }
  })
  const maximum = Math.ceil(Math.max(...data.flatMap(item => [item.simple, item.weighted])) / 10) * 10
  const bestWeighted = data.reduce((best, item) => item.weighted > best.weighted ? item : best)
  const greatestWeightEffect = data.reduce((greatest, item) => Math.abs(item.weighted - item.simple) > Math.abs(greatest.weighted - greatest.simple) ? item : greatest)

  return <article className="portfolio-analysis-card indexer-return-card">
    <div className="allocation-title"><BarChart3/><div><span>Comparação entre estratégias</span><h3>Rentabilidade por indexador</h3></div></div>
    <p>A média ponderada considera o peso investido em cada título; a média simples trata todos os títulos igualmente.</p>
    <ChartFinancialValues assets={assets} show={showFinancialValues}/>
    <div className="indexer-legend"><span>Média ponderada</span><span>Média simples</span></div>
    <div className="indexer-return-chart">{data.map(item => <div className="indexer-return-row" key={item.label}><strong>{item.label}</strong><div><i className="weighted" style={{ width: `${item.weighted / maximum * 100}%` }}/><span>{percentage(item.weighted)}</span></div><div><i className="simple" style={{ width: `${item.simple / maximum * 100}%` }}/><span>{percentage(item.simple)}</span></div></div>)}</div>
    <p className="chart-insight"><strong>Leitura:</strong> {bestWeighted.label} lidera pela média ponderada, com {percentage(bestWeighted.weighted)}. O maior efeito do tamanho das posições ocorre em {greatestWeightEffect.label}: a média ponderada é {percentage(greatestWeightEffect.weighted)}, contra {percentage(greatestWeightEffect.simple)} na média simples, revelando como a distribuição do capital altera a leitura do desempenho.</p>
  </article>
}

export default function PortfolioDetails({
  assets = [],
  title = 'Gurus Piram',
  initiallyVisible = false,
  showImage = true,
  description = 'Os emissores foram anonimizados. Gráficos e percentuais consideram o valor investido, sem revelar valores monetários.',
  visibility = { mostrarVencimento: true, mostrarTipoProduto: true, mostrarTaxa: true, mostrarEmissor: true },
  viewMode,
  onViewModeChange,
  emptyMessage = 'Nenhum título encontrado.',
}) {
  const [visible, setVisible] = useState(initiallyVisible)
  const [showFinancialValues, setShowFinancialValues] = useState(false)
  const [sort, setSort] = useState(() => ({ key: visibility.mostrarVencimento ? 'maturityAt' : 'product', direction: 'asc' }))
  const products = useMemo(() => aggregatePortfolio(assets, 'product'), [assets])
  const rateTypes = useMemo(() => aggregatePortfolio(assets, 'rateType'), [assets])
  const issuers = useMemo(() => aggregatePortfolio(assets, 'issuer'), [assets])
  const maturities = useMemo(() => visibility.mostrarVencimento ? aggregatePortfolioMaturities(assets) : [], [assets, visibility.mostrarVencimento])
  const hasPrivateValues = assets.some(asset => Number.isFinite(asset.investedValue) && Number.isFinite(asset.netValue))
  const columns = useMemo(() => allColumns.filter(([key]) => {
    if (!visibility.mostrarVencimento && ['issuedAt', 'maturityAt'].includes(key)) return false
    if (['investedValue', 'netValue'].includes(key) && (!hasPrivateValues || !showFinancialValues)) return false
    return true
  }), [visibility.mostrarVencimento, hasPrivateValues, showFinancialValues])
  const sortedAssets = useMemo(() => [...assets].sort((a, b) => {
    const left = compareValue(a, sort.key)
    const right = compareValue(b, sort.key)
    const result = typeof left === 'number' ? left - right : left.localeCompare(right, 'pt-BR', { numeric: true })
    return sort.direction === 'asc' ? result : -result
  }), [sort, assets])
  const changeSort = key => setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  const investedTotal = assets.reduce((sum, asset) => sum + (Number(asset.investedValue) || 0), 0)
  const netTotal = assets.reduce((sum, asset) => sum + (Number(asset.netValue) || 0), 0)
  const weightedReturn = investedTotal
    ? assets.reduce((sum, asset) => sum + (Number(asset.netReturn) || 0) * (Number(asset.investedValue) || 0), 0) / investedTotal
    : 0

  return <section className="portfolio-disclosure">
    <button className="portfolio-toggle" type="button" aria-expanded={visible} onClick={() => setVisible(current => !current)}>
      <span><PieChart/>Detalhamento da carteira</span>
      {visible ? <ChevronUp/> : <ChevronDown/>}
    </button>
    {visible && <div className="portfolio-content">
      <div className="portfolio-heading"><div className="portfolio-heading-copy"><h2><span>Detalhe da carteira:</span> <strong>{title}</strong></h2><p>{description}</p></div><div className="portfolio-heading-actions">{onViewModeChange && <label>Visualizar<select aria-label="Conjunto de títulos da carteira" value={viewMode} onChange={event => onViewModeChange(event.target.value)}><option value="current">Títulos em carteira</option><option value="liquidated">Títulos liquidados</option></select></label>}{showImage && <img src={gurusPiramImage} alt="Três gurus fictícios com expressão de espanto"/>}</div></div>
      {!assets.length ? <div className="portfolio-filter-empty"><BarChart3/><h3>{emptyMessage}</h3><p>Selecione outra visualização ou importe um arquivo atualizado.</p></div> : <>
      {hasPrivateValues && <div className="portfolio-summary-area">
        <div className="portfolio-summary-toolbar"><button type="button" aria-pressed={showFinancialValues} onClick={() => setShowFinancialValues(current => !current)}>{showFinancialValues ? <EyeOff/> : <Eye/>}{showFinancialValues ? 'Ocultar valores' : 'Mostrar valores'}</button></div>
        <div className={`portfolio-position-summary ${showFinancialValues ? '' : 'values-hidden'}`}><article><span>Quantidade</span><strong>{assets.length}</strong><small>títulos</small></article>{showFinancialValues && <><article><span>Valor investido</span><strong>{investedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article><article><span>Valor líquido</span><strong>{netTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></article></>}<article><span>Rentabilidade ponderada</span><strong>{percentage(weightedReturn)}</strong></article></div>
      </div>}
      <div className="allocation-grid"><AllocationChart title="Por tipo de produto" data={products} showFinancialValues={showFinancialValues}/><AllocationChart title="Por indexador" data={rateTypes} showFinancialValues={showFinancialValues}/><IssuerAllocationChart data={issuers} showFinancialValues={showFinancialValues}/></div>
      <div className="assets-table-wrap"><table className="assets-table">
        <thead><tr>{columns.map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}{sort.key === key ? sort.direction === 'asc' ? <ChevronUp/> : <ChevronDown/> : null}</button></th>)}</tr></thead>
        <tbody>{sortedAssets.map((asset, assetIndex) => <tr key={asset.id}>{columns.map(([key]) => <td key={key}>{key === 'issuer' ? asset.issuer : key === 'product' ? <span className={`product-chip ${productColorClass(asset.product, assetIndex)}`}>{asset.product}</span> : key === 'investedValue' ? asset.investedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : key === 'netValue' ? asset.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : key === 'rateType' ? <><span className={`rate-badge ${indexerColorClass(asset.rateType)}`}>{asset.rateType}</span>{visibility.mostrarTaxa && asset.rate && <small>{asset.rate}</small>}</> : key === 'issuedAt' ? asset.issuedAt : key === 'maturityAt' ? asset.maturityAt : key === 'businessDays' ? <>{asset.calendarDays?.toLocaleString('pt-BR')} corridos<br/><small>{asset.businessDays?.toLocaleString('pt-BR')} úteis</small></> : key === 'netReturn' ? <strong>{percentage(asset.netReturn)}</strong> : percentage(asset.averageDailyReturn, 4)}</td>)}</tr>)}</tbody>
      </table></div>
      {viewMode !== 'liquidated' && visibility.mostrarVencimento && maturities.length > 0 && <MaturityChart data={maturities} assets={assets} visibility={visibility} showFinancialValues={showFinancialValues}/>}
      <AssetReturnChart assets={assets} visibility={visibility} showFinancialValues={showFinancialValues}/>
      <div className="portfolio-analysis-grid">
        {viewMode !== 'liquidated' && visibility.mostrarVencimento && <RiskReturnChart assets={assets} showFinancialValues={showFinancialValues}/>}
        {viewMode !== 'liquidated' && visibility.mostrarVencimento && <ConcentrationHeatmap assets={assets} showFinancialValues={showFinancialValues}/>}
        <ReturnDistributionChart assets={assets} showFinancialValues={showFinancialValues}/>
        <IndexerReturnChart assets={assets} showFinancialValues={showFinancialValues}/>
      </div>
      </>}
    </div>}
  </section>
}
