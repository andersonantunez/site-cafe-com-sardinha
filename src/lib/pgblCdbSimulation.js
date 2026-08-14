const DAY_MS = 86_400_000

function addMonths(date, months) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  return result
}

function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function monthlyRate(annualRate) {
  return (1 + annualRate) ** (1 / 12) - 1
}

function fixedIncomeTax(days) {
  if (days <= 180) return 0.225
  if (days <= 360) return 0.20
  if (days <= 720) return 0.175
  return 0.15
}

function pgblRegressiveTax(contributionDate, redemptionDate) {
  const months = (redemptionDate.getUTCFullYear() - contributionDate.getUTCFullYear()) * 12 + redemptionDate.getUTCMonth() - contributionDate.getUTCMonth()
  if (months <= 24) return 0.35
  if (months <= 48) return 0.30
  if (months <= 72) return 0.25
  if (months <= 96) return 0.20
  if (months <= 120) return 0.15
  return 0.10
}

function grow(lots, rate) {
  lots.forEach(lot => { lot.balance *= 1 + rate })
}

function redeemFixedIncome(lots, date, exempt) {
  return lots.reduce((total, lot) => {
    const days = Math.max(0, Math.floor((date - lot.date) / DAY_MS))
    const gain = Math.max(0, lot.balance - lot.principal)
    const tax = exempt ? 0 : gain * fixedIncomeTax(days)
    total.gross += lot.balance
    total.tax += tax
    total.net += lot.balance - tax
    return total
  }, { gross: 0, tax: 0, net: 0 })
}

function redeemPgbl(lots, date, config) {
  return lots.reduce((total, lot) => {
    const redeemable = lot.balance * (lot.origin === 'employer' ? config.vesting : 1)
    const rate = config.pgblTaxRegime === 'regressive'
      ? pgblRegressiveTax(lot.date, date)
      : config.pgblProgressiveTax
    const tax = redeemable * rate
    total.gross += redeemable
    total.tax += tax
    total.net += redeemable - tax
    return total
  }, { gross: 0, tax: 0, net: 0 })
}

export function validateSimulation(input) {
  const errors = {}
  const range = (key, min, max, label) => {
    const value = Number(input[key])
    if (!Number.isFinite(value) || value < min || value > max) errors[key] = `${label}: informe um valor entre ${min} e ${max}.`
  }
  range('months', 12, 600, 'Prazo')
  range('monthlyContribution', 1, 1_000_000, 'Aporte mensal')
  range('annualCdi', 0, 100, 'CDI anual')
  range('cdbCdiPercent', 0, 300, 'Percentual do CDI no CDB')
  range('pgblCdiPercent', 0, 300, 'Percentual do CDI no PGBL')
  range('employerMatch', 0, 500, 'Contrapartida')
  range('vesting', 0, 100, 'Vesting')
  range('annualTaxableIncome', 0, 100_000_000, 'Renda tributável')
  range('marginalTax', 0, 27.5, 'Alíquota marginal')
  range('deductionLimit', 0, 12, 'Limite de dedução')
  range('cdbAdminFee', 0, 20, 'Taxa administrativa do CDB')
  range('pgblAdminFee', 0, 20, 'Taxa administrativa do PGBL')
  range('cdbLoading', 0, 50, 'Carregamento do CDB')
  range('pgblLoading', 0, 50, 'Carregamento do PGBL')
  range('pgblProgressiveTax', 0, 27.5, 'IR progressivo estimado')
  range('taxCreditMonth', 1, 12, 'Mês do benefício fiscal')
  range('redemptionEveryMonths', 0, 600, 'Intervalo de resgate')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate || '')) errors.startDate = 'Informe uma data inicial válida.'
  if (!['taxable', 'exempt'].includes(input.cdbType)) errors.cdbType = 'Selecione um tipo de renda fixa válido.'
  if (!['regressive', 'progressive'].includes(input.pgblTaxRegime)) errors.pgblTaxRegime = 'Selecione um regime tributário válido.'
  if (!['evaluate', 'redeem'].includes(input.redemptionMode)) errors.redemptionMode = 'Selecione um modo de resgate válido.'
  return errors
}

export function simulatePgblVsCdb(input) {
  const errors = validateSimulation(input)
  if (Object.keys(errors).length) return { errors }

  const config = {
    ...input,
    months: Number(input.months), monthlyContribution: Number(input.monthlyContribution),
    annualCdi: Number(input.annualCdi) / 100, cdbCdiPercent: Number(input.cdbCdiPercent) / 100,
    pgblCdiPercent: Number(input.pgblCdiPercent) / 100, employerMatch: Number(input.employerMatch) / 100,
    vesting: Number(input.vesting) / 100, annualTaxableIncome: Number(input.annualTaxableIncome),
    marginalTax: Number(input.marginalTax) / 100, deductionLimit: Number(input.deductionLimit) / 100,
    cdbAdminFee: Number(input.cdbAdminFee) / 100, pgblAdminFee: Number(input.pgblAdminFee) / 100,
    cdbLoading: Number(input.cdbLoading) / 100, pgblLoading: Number(input.pgblLoading) / 100,
    pgblProgressiveTax: Number(input.pgblProgressiveTax) / 100,
    taxCreditMonth: Number(input.taxCreditMonth), redemptionEveryMonths: Number(input.redemptionEveryMonths),
  }

  const start = new Date(`${config.startDate}T00:00:00Z`)
  const cdbLots = [], pgblLots = [], benefitLots = []
  const contributionsByYear = new Map()
  const timeline = []
  let cdbCash = 0, pgblCash = 0, nominalTaxBenefit = 0
  const cdbRate = monthlyRate(config.annualCdi * config.cdbCdiPercent - config.cdbAdminFee)
  const pgblRate = monthlyRate(config.annualCdi * config.pgblCdiPercent - config.pgblAdminFee)

  for (let index = 0; index < config.months; index += 1) {
    const contributionDate = addMonths(start, index)
    const valuationDate = endOfMonth(contributionDate)
    const year = contributionDate.getUTCFullYear()
    const own = config.monthlyContribution
    const cdbPrincipal = own * (1 - config.cdbLoading)
    cdbLots.push({ date: contributionDate, principal: cdbPrincipal, balance: cdbPrincipal, origin: 'participant' })

    contributionsByYear.set(year, (contributionsByYear.get(year) || 0) + own)
    const ownPgbl = own * (1 - config.pgblLoading)
    const employerPgbl = own * config.employerMatch * (1 - config.pgblLoading)
    pgblLots.push({ date: contributionDate, principal: ownPgbl, balance: ownPgbl, origin: 'participant' })
    pgblLots.push({ date: contributionDate, principal: employerPgbl, balance: employerPgbl, origin: 'employer' })

    let taxBenefit = 0
    if (contributionDate.getUTCMonth() + 1 === config.taxCreditMonth) {
      const priorContributions = contributionsByYear.get(year - 1) || 0
      const deductible = Math.min(priorContributions, config.annualTaxableIncome * config.deductionLimit)
      taxBenefit = deductible * config.marginalTax
      if (taxBenefit > 0) {
        nominalTaxBenefit += taxBenefit
        benefitLots.push({ date: contributionDate, principal: taxBenefit, balance: taxBenefit, origin: 'tax-benefit' })
      }
    }

    grow(cdbLots, cdbRate); grow(pgblLots, pgblRate); grow(benefitLots, cdbRate)
    const cdb = redeemFixedIncome(cdbLots, valuationDate, config.cdbType === 'exempt')
    const pgbl = redeemPgbl(pgblLots, valuationDate, config)
    const benefit = redeemFixedIncome(benefitLots, valuationDate, config.cdbType === 'exempt')
    const month = index + 1
    const checkpoint = config.redemptionEveryMonths > 0 && month % config.redemptionEveryMonths === 0

    if (checkpoint && config.redemptionMode === 'redeem') {
      cdbCash += cdb.net; pgblCash += pgbl.net + benefit.net
      cdbLots.length = 0; pgblLots.length = 0; benefitLots.length = 0
    }

    timeline.push({
      month,
      date: valuationDate.toISOString().slice(0, 10),
      cdbNet: cdbCash + (checkpoint && config.redemptionMode === 'redeem' ? 0 : cdb.net),
      pgblNet: pgblCash + (checkpoint && config.redemptionMode === 'redeem' ? 0 : pgbl.net + benefit.net),
      cdbGross: cdb.gross, cdbTax: cdb.tax, pgblGross: pgbl.gross,
      pgblTax: pgbl.tax, pgblPlanNet: pgbl.net, benefitGross: benefit.gross,
      benefitTax: benefit.tax, benefitNet: benefit.net, taxBenefit, checkpoint,
      ownContributionMonth: own,
      employerContributionMonth: own * config.employerMatch,
    })
  }

  const final = timeline.at(-1)
  return {
    errors: {}, timeline, config,
    summary: {
      cdbNet: final.cdbNet, pgblNet: final.pgblNet, difference: final.pgblNet - final.cdbNet,
      winner: final.pgblNet > final.cdbNet ? 'PGBL + benefício fiscal' : final.pgblNet < final.cdbNet ? 'CDB direto' : 'Empate',
      ownContributions: config.monthlyContribution * config.months,
      employerContributions: config.monthlyContribution * config.employerMatch * config.months,
      nominalTaxBenefit, cdbTax: final.cdbTax, pgblTax: final.pgblTax,
    },
  }
}
