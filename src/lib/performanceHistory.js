import source from '../../Tabela.txt?raw'

const monthNames = {
  Jan: 'Janeiro', Fev: 'Fevereiro', Mar: 'Março', Abr: 'Abril',
  Mai: 'Maio', Jun: 'Junho', Jul: 'Julho', Ago: 'Agosto',
  Set: 'Setembro', Out: 'Outubro', Nov: 'Novembro', Dez: 'Dezembro',
}

const clean = value => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const parsePercent = value => Number(value.replace('%', '').replace(/\./g, '').replace(',', '.'))
const compound = values => (values.reduce((total, value) => total * (1 + value / 100), 1) - 1) * 100

function parseSource() {
  const headers = [...source.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(match => clean(match[1])).slice(1)
  const rows = [...source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(match => [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => clean(cell[1])))
    .filter(row => row.length)
  const byName = Object.fromEntries(rows.map(row => [row[0], row.slice(1)]))

  return headers.map((label, index) => {
    const [monthCode, shortYear] = label.split('/')
    return {
      label,
      month: monthNames[monthCode],
      monthCode,
      year: 2000 + Number(shortYear),
      portfolio: parsePercent(byName.Carteira[index]),
      cdi: parsePercent(byName.CDI[index]),
      cdiPercent: parsePercent(byName['% do CDI'][index]),
    }
  })
}

export const monthlyPerformance = parseSource()

let accumulatedFactor = 1
export const annualPerformance = Object.values(monthlyPerformance.reduce((years, month) => {
  if (!years[month.year]) years[month.year] = { year: month.year, months: [] }
  years[month.year].months.push(month)
  return years
}, {})).map(year => {
  const portfolio = compound(year.months.map(month => month.portfolio))
  const cdi = compound(year.months.map(month => month.cdi))
  accumulatedFactor *= 1 + portfolio / 100
  return {
    ...year,
    portfolio,
    cdi,
    cdiPercent: cdi ? portfolio / cdi * 100 : null,
    accumulated: (accumulatedFactor - 1) * 100,
    complete: year.months.length === 12,
    monthsAboveCdi: year.months.filter(month => month.portfolio > month.cdi).length,
    monthsBelowCdi: year.months.filter(month => month.portfolio < month.cdi).length,
    monthsEqualCdi: year.months.filter(month => month.portfolio === month.cdi).length,
    bestMonth: year.months.reduce((best, month) => month.portfolio > best.portfolio ? month : best),
    worstMonth: year.months.reduce((worst, month) => month.portfolio < worst.portfolio ? month : worst),
  }
}).sort((a, b) => b.year - a.year)

export const performancePeriod = {
  first: monthlyPerformance[0],
  last: monthlyPerformance.at(-1),
  accumulated: compound(monthlyPerformance.map(month => month.portfolio)),
  cdi: compound(monthlyPerformance.map(month => month.cdi)),
  months: monthlyPerformance.length,
  monthsAboveCdi: monthlyPerformance.filter(month => month.portfolio > month.cdi).length,
  monthsBelowCdi: monthlyPerformance.filter(month => month.portfolio < month.cdi).length,
  monthsEqualCdi: monthlyPerformance.filter(month => month.portfolio === month.cdi).length,
  bestMonth: monthlyPerformance.reduce((best, month) => month.portfolio > best.portfolio ? month : best),
  worstMonth: monthlyPerformance.reduce((worst, month) => month.portfolio < worst.portfolio ? month : worst),
}
