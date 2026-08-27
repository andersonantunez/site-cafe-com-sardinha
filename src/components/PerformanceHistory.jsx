import React, { useEffect, useState } from 'react'
import { BarChart3, ChevronDown, ChevronUp, ShieldCheck, TrendingUp } from 'lucide-react'
import { loadPerformanceHistory } from '../lib/performanceHistory.js'
import ChildTopbar from './ChildTopbar.jsx'

const percent = value => `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
const tone = value => value < 0 ? 'negative' : 'positive'

function usePerformanceData() {
  const [state, setState] = useState({ loading: true, history: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    loadPerformanceHistory(controller.signal).then(history => setState({ loading: false, history, error: '' }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, history: null, error: error.message }) })
    return () => controller.abort()
  }, [])
  return state
}

export function PerformanceIndicators({ history: providedHistory }) {
  const loaded = usePerformanceData()
  const history = providedHistory || loaded.history
  if (!history?.performancePeriod) return loaded.loading ? <div className="performance-loading">Carregando indicadores…</div> : null
  const { performancePeriod } = history
  const relative = performancePeriod.cdi ? performancePeriod.accumulated / performancePeriod.cdi * 100 : null
  const fullYears = Math.floor(performancePeriod.months / 12)
  const remainingMonths = performancePeriod.months % 12
  const duration = `${performancePeriod.months} meses · ${fullYears} ${fullYears === 1 ? 'ano' : 'anos'}${remainingMonths ? ` e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}` : ''}`
  return <section className="performance-summary performance-summary-complete" aria-label="Indicadores gerais de rentabilidade">
    <div className="indicator-group indicator-financial">
      <article><BarChart3/><span>Rentabilidade no período</span><strong className={tone(performancePeriod.accumulated)}>{percent(performancePeriod.accumulated)}</strong><small>{duration}</small></article>
      <article><ShieldCheck/><span>CDI no período</span><strong>{percent(performancePeriod.cdi)}</strong></article>
      <article><TrendingUp/><span>Desempenho</span><strong>{relative === null ? '—' : `${percent(relative)} do CDI`}</strong></article>
    </div>
    <div className="indicator-group indicator-cdi">
      <article><span>Acima do CDI</span><strong className="positive">{performancePeriod.monthsAboveCdi}</strong></article>
      <article><span>Abaixo do CDI</span><strong className={performancePeriod.monthsBelowCdi ? 'negative' : ''}>{performancePeriod.monthsBelowCdi}</strong></article>
      <article><span>Iguais ao CDI</span><strong>{performancePeriod.monthsEqualCdi}</strong></article>
    </div>
    <div className="indicator-group indicator-extremes">
      <article><span>Melhor mês</span><strong className="positive">{performancePeriod.bestMonth.label} · {percent(performancePeriod.bestMonth.portfolio)}</strong></article>
      <article><span>Pior mês</span><strong className="negative">{performancePeriod.worstMonth.label} · {percent(performancePeriod.worstMonth.portfolio)}</strong></article>
    </div>
  </section>
}

export function AnnualPerformanceTable({ annualPerformance = [], compact = false }) {
  const [openYear, setOpenYear] = useState(null)
  const years = compact ? annualPerformance.slice(0, 4) : annualPerformance
  return <div className={`performance-table-wrap ${compact ? 'compact indicators' : ''}`}>
    <table className="performance-table">
      <thead><tr><th>Ano</th><th>Rentabilidade</th><th>CDI período</th><th>Desempenho</th>{compact ? <><th>Meses</th><th>Acima do CDI</th><th>Abaixo do CDI</th></> : <><th>Acumulado</th><th><span className="sr-only">Ações</span></th></>}</tr></thead>
      <tbody>{years.map(year => <React.Fragment key={year.year}>
        <tr className={openYear === year.year ? 'expanded' : ''}>
          <td><strong>{year.year}</strong>{!year.complete && <small>Parcial · {year.months.length} meses</small>}</td>
          <td><span className={tone(year.portfolio)}>{percent(year.portfolio)}</span></td><td>{percent(year.cdi)}</td><td>{year.cdiPercent === null ? '—' : percent(year.cdiPercent)}</td>
          {compact ? <><td><strong>{year.months.length}</strong></td><td><span className="count-pill above">{year.monthsAboveCdi}</span></td><td><span className="count-pill below">{year.monthsBelowCdi}</span></td></> : <><td><strong className={tone(year.accumulated)}>{percent(year.accumulated)}</strong></td><td><button className="details-button" type="button" aria-expanded={openYear === year.year} onClick={() => setOpenYear(current => current === year.year ? null : year.year)}>{openYear === year.year ? 'Fechar' : 'Detalhes'}{openYear === year.year ? <ChevronUp/> : <ChevronDown/>}</button></td></>}
        </tr>
        {!compact && openYear === year.year && <tr className="monthly-details"><td colSpan="6"><div>
          <div className="year-indicators"><div className="year-indicator-group cdi-group"><article><span>Acima do CDI</span><strong className="positive">{year.monthsAboveCdi}</strong></article><article><span>Abaixo do CDI</span><strong className={year.monthsBelowCdi ? 'negative' : ''}>{year.monthsBelowCdi}</strong></article><article><span>Iguais ao CDI</span><strong>{year.monthsEqualCdi}</strong></article></div><div className="year-indicator-group extremes-group"><article><span>Melhor mês</span><strong className="positive">{year.bestMonth.month} · {percent(year.bestMonth.portfolio)}</strong></article><article><span>Pior mês</span><strong className="negative">{year.worstMonth.month} · {percent(year.worstMonth.portfolio)}</strong></article></div></div>
          <div className="monthly-heading"><span>Competência</span><span>Carteira</span><span>CDI</span><span>% do CDI</span></div>
          {year.months.map(month => <div className="monthly-row" key={month.label}><span><b>{month.month}</b><small>{month.label}</small></span><span className={tone(month.portfolio)}>{percent(month.portfolio)}</span><span>{percent(month.cdi)}</span><span>{percent(month.cdiPercent)}</span></div>)}
        </div></td></tr>}
      </React.Fragment>)}</tbody>
    </table>
  </div>
}

export default function PerformanceHistory() {
  const state = usePerformanceData()
  if (state.loading) return <div className="performance-page"><ChildTopbar className="performance-topbar"/><main className="performance-main"><div className="performance-loading">Carregando histórico…</div></main></div>
  if (state.error || !state.history?.performancePeriod) return <div className="performance-page"><ChildTopbar className="performance-topbar"/><main className="performance-main"><div className="public-portfolio-state error">{state.error || 'Nenhum histórico publicado.'}</div></main></div>
  const { performancePeriod, annualPerformance } = state.history
  const first = `${performancePeriod.first.month.toLowerCase()} de ${performancePeriod.first.year}`
  const last = `${performancePeriod.last.month.toLowerCase()} de ${performancePeriod.last.year}`
  return <div className="performance-page">
    <ChildTopbar className="performance-topbar"/>
    <section className="performance-hero"><div><span className="eyebrow">Transparência</span><h1>Histórico de Rentabilidade</h1><p>Acompanhe a evolução de {first} a {last}, com indicadores consolidados por ano e detalhamento mensal.</p></div><TrendingUp/></section>
    <main className="performance-main">
      <PerformanceIndicators history={state.history}/>
      <section className="history-panel"><div className="history-heading"><div><span className="eyebrow">Consolidado anual</span><h2>Rentabilidade ano a ano</h2></div><p>Os resultados anuais e acumulados são calculados por capitalização composta dos percentuais mensais retirados do banco de investimentos.</p></div><AnnualPerformanceTable annualPerformance={annualPerformance}/></section>
      <p className="performance-disclaimer">Rentabilidade passada não representa garantia de resultados futuros. Os dados foram extraídos do histórico disponibilizado pelo BTG e reorganizados para facilitar a leitura.</p>
    </main>
  </div>
}
