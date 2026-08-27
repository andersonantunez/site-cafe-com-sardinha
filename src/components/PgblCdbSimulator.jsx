import React, { useMemo, useState } from 'react'
import { BarChart3, Calculator, Download, Info, RotateCcw, ShieldCheck, Trophy } from 'lucide-react'
import { simulatePgblVsCdb } from '../lib/pgblCdbSimulation.js'
import WinnerConfetti from './WinnerConfetti.jsx'
import FieldHelp from './FieldHelp.jsx'
import {pgblHelp} from '../lib/simulatorFieldHelp.js'
import ChildTopbar from './ChildTopbar.jsx'

const initialValues = {
  startDate: '2025-01-01', months: 120, monthlyContribution: 500,
  annualCdi: 14.9, cdbCdiPercent: 110, cdbType: 'taxable', cdbAdminFee: 0, cdbLoading: 0,
  pgblCdiPercent: 100, employerMatch: 100, vesting: 100, pgblAdminFee: 0, pgblLoading: 0,
  annualTaxableIncome: 120000, marginalTax: 27.5, deductionLimit: 12, taxCreditMonth: 5,
  pgblTaxRegime: 'regressive', pgblProgressiveTax: 27.5,
  redemptionEveryMonths: 24, redemptionMode: 'evaluate',
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percent = value => `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

function Field({ label, name, values, errors, onChange, type = 'number', min, max, step = '0.01', hint, children }) {
  return <label className={`sim-field ${errors[name] ? 'invalid' : ''}`}><span>{label}</span><FieldHelp text={pgblHelp[name]}/>
    {children || <input type={type} name={name} value={values[name]} min={min} max={max} step={step} onChange={onChange} aria-invalid={Boolean(errors[name])}/>} 
    {errors[name] ? <small className="field-error">{errors[name]}</small> : hint && <small>{hint}</small>}
  </label>
}

function ResultChart({ timeline }) {
  const width = 900, height = 330, pad = 48
  const max = Math.max(...timeline.flatMap(point => [point.cdbNet, point.pgblNet]), 1)
  const final = timeline.at(-1)
  const finalX = width - pad
  const cdbFinalY = height - pad - final.cdbNet / max * (height - pad * 2)
  const pgblFinalY = height - pad - final.pgblNet / max * (height - pad * 2)
  const labelsClose = Math.abs(cdbFinalY - pgblFinalY) < 30
  const points = key => timeline.map((point, index) => {
    const x = pad + index / Math.max(1, timeline.length - 1) * (width - pad * 2)
    const y = height - pad - point[key] / max * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return <div className="result-chart" role="img" aria-label="Gráfico da evolução do patrimônio líquido dos dois cenários">
    <div className="chart-legend"><span className="legend-cdb">CDB direto</span><span className="legend-pgbl">PGBL + benefício fiscal</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {[0, .25, .5, .75, 1].map(level => <g key={level}><line x1={pad} x2={width-pad} y1={height-pad-level*(height-pad*2)} y2={height-pad-level*(height-pad*2)} /><text x="4" y={height-pad-level*(height-pad*2)+4}>{money.format(max*level).replace(',00','')}</text></g>)}
      <polyline className="chart-cdb" points={points('cdbNet')} />
      <polyline className="chart-pgbl" points={points('pgblNet')} />
      <circle className="chart-point-cdb" cx={finalX} cy={cdbFinalY} r="6" />
      <circle className="chart-point-pgbl" cx={finalX} cy={pgblFinalY} r="6" />
      <text className="chart-value chart-value-cdb" x={finalX - 12} y={cdbFinalY + (labelsClose && cdbFinalY < pgblFinalY ? -10 : 15)} textAnchor="end">{money.format(final.cdbNet)}</text>
      <text className="chart-value chart-value-pgbl" x={finalX - 12} y={pgblFinalY + (labelsClose && pgblFinalY < cdbFinalY ? -10 : -10)} textAnchor="end">{money.format(final.pgblNet)}</text>
    </svg>
    <div className="chart-axis"><span>Mês 1</span><span>Mês {timeline.length}</span></div>
  </div>
}

export default function PgblCdbSimulator() {
  const [values, setValues] = useState(initialValues)
  const [submitted, setSubmitted] = useState(initialValues)
  const result = useMemo(() => simulatePgblVsCdb(submitted), [submitted])
  const [errors, setErrors] = useState({})
  const change = event => setValues(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    const next = simulatePgblVsCdb(values)
    setErrors(next.errors)
    if (!Object.keys(next.errors).length) setSubmitted({ ...values })
  }
  const reset = () => { setValues(initialValues); setSubmitted(initialValues); setErrors({}) }
  const downloadReport = async () => {
    const { generatePgblCdbPdf } = await import('../lib/pgblCdbReport.js')
    generatePgblCdbPdf(result, submitted)
  }

  return <div className="simulator-page">
    <ChildTopbar className="simulator-topbar"/>
    <section className="simulator-hero"><div><span className="eyebrow">Simulador financeiro</span><h1>PGBL ou CDB?</h1><p>Compare os dois caminhos com suas próprias premissas, incluindo contrapartida do empregador, tributação, taxas e benefício fiscal.</p></div><Calculator size={76}/></section>

    <main className="simulator-main">
      <form className="simulator-form" onSubmit={submit} noValidate>
        <div className="form-intro"><div><span className="eyebrow">Suas premissas</span><h2>Configure a comparação</h2></div><button type="button" onClick={reset}><RotateCcw size={16}/> Restaurar padrões</button></div>

        <fieldset><legend>Planejamento</legend><div className="field-grid">
          <Field label="Data inicial" name="startDate" type="date" values={values} errors={errors} onChange={change}/>
          <Field label="Prazo (meses)" name="months" min="12" max="600" step="1" values={values} errors={errors} onChange={change} hint="Entre 1 e 50 anos."/>
          <Field label="Aporte próprio mensal (R$)" name="monthlyContribution" min="1" max="1000000" values={values} errors={errors} onChange={change}/>
          <Field label="CDI anual estimado (%)" name="annualCdi" min="0" max="100" values={values} errors={errors} onChange={change} hint="Premissa fixa; não é previsão."/>
        </div></fieldset>

        <fieldset className="scenario-cdb"><legend>Cenário 1 — CDB direto</legend><div className="field-grid">
          <Field label="Rentabilidade (% do CDI)" name="cdbCdiPercent" min="0" max="300" values={values} errors={errors} onChange={change}/>
          <Field label="Tipo de investimento" name="cdbType" values={values} errors={errors} onChange={change}><select name="cdbType" value={values.cdbType} onChange={change}><option value="taxable">Renda fixa tributável</option><option value="exempt">Renda fixa isenta</option></select></Field>
          <Field label="Taxa administrativa anual (%)" name="cdbAdminFee" min="0" max="20" values={values} errors={errors} onChange={change}/>
          <Field label="Carregamento sobre aportes (%)" name="cdbLoading" min="0" max="50" values={values} errors={errors} onChange={change}/>
        </div></fieldset>

        <fieldset className="scenario-installment"><legend>Cenário 2 — PGBL</legend><div className="field-grid">
          <Field label="Rentabilidade (% do CDI)" name="pgblCdiPercent" min="0" max="300" values={values} errors={errors} onChange={change}/>
          <Field label="Contrapartida do empregador (%)" name="employerMatch" min="0" max="500" values={values} errors={errors} onChange={change}/>
          <Field label="Vesting da contrapartida (%)" name="vesting" min="0" max="100" values={values} errors={errors} onChange={change}/>
          <Field label="Taxa administrativa anual (%)" name="pgblAdminFee" min="0" max="20" values={values} errors={errors} onChange={change}/>
          <Field label="Carregamento sobre aportes (%)" name="pgblLoading" min="0" max="50" values={values} errors={errors} onChange={change}/>
          <Field label="Regime de IR" name="pgblTaxRegime" values={values} errors={errors} onChange={change}><select name="pgblTaxRegime" value={values.pgblTaxRegime} onChange={change}><option value="regressive">Regressivo</option><option value="progressive">Progressivo (estimativa)</option></select></Field>
          {values.pgblTaxRegime === 'progressive' && <Field label="Alíquota progressiva estimada (%)" name="pgblProgressiveTax" min="0" max="27.5" values={values} errors={errors} onChange={change}/>} 
        </div></fieldset>

        <fieldset><legend>Benefício fiscal e resgate</legend><div className="field-grid">
          <Field label="Renda tributável anual (R$)" name="annualTaxableIncome" min="0" max="100000000" values={values} errors={errors} onChange={change}/>
          <Field label="Alíquota marginal de IR (%)" name="marginalTax" min="0" max="27.5" values={values} errors={errors} onChange={change}/>
          <Field label="Limite de dedução PGBL (%)" name="deductionLimit" min="0" max="12" values={values} errors={errors} onChange={change}/>
          <Field label="Mês de crédito do benefício" name="taxCreditMonth" min="1" max="12" step="1" values={values} errors={errors} onChange={change}/>
          <Field label="Checkpoint a cada X meses" name="redemptionEveryMonths" min="0" max="600" step="1" values={values} errors={errors} onChange={change} hint="Use zero para desativar."/>
          <Field label="Tratamento do resgate" name="redemptionMode" values={values} errors={errors} onChange={change}><select name="redemptionMode" value={values.redemptionMode} onChange={change}><option value="evaluate">Somente avaliar saldo líquido</option><option value="redeem">Efetivar e manter em caixa</option></select></Field>
        </div></fieldset>

        <div className="form-notice"><Info size={18}/><p>A simulação usa taxas constantes e não constitui recomendação. No PGBL, o IR incide sobre o valor total resgatável. Verifique elegibilidade ao benefício fiscal e regras do seu plano.</p></div>
        <button className="simulate-button" type="submit"><BarChart3 size={19}/> Calcular e atualizar gráfico</button>
      </form>

      {result.summary && <section className="simulator-results" aria-live="polite">
        <div className="result-heading"><div><span className="eyebrow">Resultado líquido estimado</span><h2>Comparação ao fim de {submitted.months} meses</h2></div></div>
        <div className="result-cards"><article className={result.summary.cdbNet > result.summary.pgblNet ? 'winner-card' : ''}>{result.summary.cdbNet > result.summary.pgblNet && <><WinnerConfetti/><span className="trophy-badge" aria-label="Cenário vencedor"><Trophy/></span></>}<small>CDB direto</small><strong>{money.format(result.summary.cdbNet)}</strong></article><article className={result.summary.pgblNet > result.summary.cdbNet ? 'winner-card' : ''}>{result.summary.pgblNet > result.summary.cdbNet && <><WinnerConfetti/><span className="trophy-badge" aria-label="Cenário vencedor"><Trophy/></span></>}<small>PGBL + benefício fiscal</small><strong>{money.format(result.summary.pgblNet)}</strong></article><article className={result.summary.difference >= 0 ? 'positive' : 'negative'}><small>Diferença PGBL − CDB</small><strong>{money.format(result.summary.difference)}</strong></article></div>
        <ResultChart timeline={result.timeline}/>
        <div className="result-details"><div><span>Aportes próprios</span><b>{money.format(result.summary.ownContributions)}</b></div><div><span>Contrapartida nominal</span><b>{money.format(result.summary.employerContributions)}</b></div><div><span>Benefício fiscal nominal reinvestido</span><b>{money.format(result.summary.nominalTaxBenefit)}</b></div><div><span>Premissa CDI</span><b>{percent(submitted.annualCdi)} a.a.</b></div></div>
        <div className="method-note"><ShieldCheck size={22}/><p><strong>Cálculo transparente:</strong> cada aporte mensal é tratado como um lote separado. O IR do CDB incide apenas sobre o rendimento; no PGBL, sobre o saldo resgatável total, conforme o regime escolhido.</p></div>
        <button type="button" className="download-report" onClick={downloadReport}><Download size={18}/> Baixar memória de cálculo em PDF</button>
      </section>}
    </main>
  </div>
}
