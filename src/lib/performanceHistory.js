const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const monthCodes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const compound = values => (values.reduce((total, value) => total * (1 + value / 100), 1) - 1) * 100

export function buildPerformanceHistory(rows = []) {
  const monthlyPerformance = rows.map(row => {
    const date = new Date(`${String(row.competence).slice(0, 10)}T00:00:00Z`)
    const monthIndex = date.getUTCMonth()
    const year = date.getUTCFullYear()
    return {
      label: `${monthCodes[monthIndex]}/${String(year).slice(-2)}`,
      month: monthNames[monthIndex], monthCode: monthCodes[monthIndex], year,
      portfolio: Number(row.portfolio), cdi: Number(row.cdi), cdiPercent: Number(row.cdiPercent),
    }
  })
  if (!monthlyPerformance.length) return { monthlyPerformance: [], annualPerformance: [], performancePeriod: null }
  let accumulatedFactor = 1
  const annualPerformance = Object.values(monthlyPerformance.reduce((years, month) => {
    if (!years[month.year]) years[month.year] = { year: month.year, months: [] }
    years[month.year].months.push(month)
    return years
  }, {})).map(year => {
    const portfolio = compound(year.months.map(month => month.portfolio))
    const cdi = compound(year.months.map(month => month.cdi))
    accumulatedFactor *= 1 + portfolio / 100
    return {
      ...year, portfolio, cdi, cdiPercent: cdi ? portfolio / cdi * 100 : null,
      accumulated: (accumulatedFactor - 1) * 100, complete: year.months.length === 12,
      monthsAboveCdi: year.months.filter(month => month.portfolio > month.cdi).length,
      monthsBelowCdi: year.months.filter(month => month.portfolio < month.cdi).length,
      monthsEqualCdi: year.months.filter(month => month.portfolio === month.cdi).length,
      bestMonth: year.months.reduce((best, month) => month.portfolio > best.portfolio ? month : best),
      worstMonth: year.months.reduce((worst, month) => month.portfolio < worst.portfolio ? month : worst),
    }
  }).sort((a, b) => b.year - a.year)
  const performancePeriod = {
    first: monthlyPerformance[0], last: monthlyPerformance.at(-1),
    accumulated: compound(monthlyPerformance.map(month => month.portfolio)),
    cdi: compound(monthlyPerformance.map(month => month.cdi)), months: monthlyPerformance.length,
    monthsAboveCdi: monthlyPerformance.filter(month => month.portfolio > month.cdi).length,
    monthsBelowCdi: monthlyPerformance.filter(month => month.portfolio < month.cdi).length,
    monthsEqualCdi: monthlyPerformance.filter(month => month.portfolio === month.cdi).length,
    bestMonth: monthlyPerformance.reduce((best, month) => month.portfolio > best.portfolio ? month : best),
    worstMonth: monthlyPerformance.reduce((worst, month) => month.portfolio < worst.portfolio ? month : worst),
  }
  return { monthlyPerformance, annualPerformance, performancePeriod }
}

export async function loadPerformanceHistory(signal) {
  const response = await fetch('/api/rentabilidade', { signal })
  if (!response.ok) throw new Error('Não foi possível carregar o histórico de rentabilidade.')
  return buildPerformanceHistory(await response.json())
}
