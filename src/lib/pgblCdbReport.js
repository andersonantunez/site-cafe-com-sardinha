import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/images/logo3.png'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = value => `${number.format(Number(value))}%`
const BLUE = [6, 60, 105], ORANGE = [244, 123, 32], BROWN = [90, 45, 23], CREAM = [255, 248, 237]

const dateBr = value => {
  const [year, month, day] = String(value).split('-')
  return day && month && year ? `${day}-${month}-${year}` : value
}

async function loadRoundLogo() {
  const image = new Image()
  image.src = logoUrl
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
  const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 240
  const context = canvas.getContext('2d')
  context.beginPath(); context.arc(120, 120, 116, 0, Math.PI * 2); context.clip()
  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const sx = (image.naturalWidth - side) / 2, sy = (image.naturalHeight - side) / 2
  context.drawImage(image, sx, sy, side, side, 0, 0, 240, 240)
  return canvas.toDataURL('image/png')
}

function addHeader(doc, page, total, logo) {
  doc.setFillColor(...BLUE); doc.rect(0, 0, 210, 19, 'F')
  doc.setFillColor(...ORANGE); doc.rect(0, 19, 210, 2, 'F')
  doc.setFillColor(255,248,237); doc.circle(18, 15, 12.8, 'F')
  doc.setDrawColor(...ORANGE); doc.setLineWidth(1.1); doc.circle(18, 15, 12.8, 'S')
  doc.addImage(logo, 'PNG', 6.2, 3.2, 23.6, 23.6)
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('CAFÉ COM SARDINHA', 34, 12)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(`Memória de cálculo PGBL x CDB  |  Página ${page} de ${total}`, 196, 12, { align: 'right' })
}

function sectionTitle(doc, title, y) {
  doc.setFillColor(...CREAM); doc.roundedRect(14, y, 182, 9, 2, 2, 'F')
  doc.setTextColor(...BROWN); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(title, 18, y + 6)
  return y + 13
}

export async function generatePgblCdbPdf(result, submitted) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const logo = await loadRoundLogo()
  const generatedAt = new Date().toLocaleString('pt-BR')
  let y = 44

  doc.setTextColor(...BLUE); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.text('PGBL x CDB', 14, y)
  doc.setTextColor(...BROWN); doc.setFontSize(13); doc.text('Relatório e memória completa do cálculo', 14, y + 8)
  doc.setTextColor(90); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(`Gerado em ${generatedAt}. Valores estimados com taxas constantes.`, 14, y + 15)
  y += 24

  y = sectionTitle(doc, '1. Resultado consolidado', y)
  autoTable(doc, {
    startY: y, margin: { top: 32, left: 14, right: 14, bottom: 12 }, theme: 'grid', styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BLUE, textColor: 255 },
    head: [['Indicador', 'Resultado']],
    body: [
      ['Patrimônio líquido - CDB direto', money.format(result.summary.cdbNet)],
      ['Patrimônio líquido - PGBL + benefício fiscal', money.format(result.summary.pgblNet)],
      ['Diferença PGBL - CDB', money.format(result.summary.difference)],
      ['Melhor resultado', result.summary.winner],
      ['Aportes próprios nominais', money.format(result.summary.ownContributions)],
      ['Contrapartida nominal do empregador', money.format(result.summary.employerContributions)],
      ['Benefício fiscal nominal reinvestido', money.format(result.summary.nominalTaxBenefit)],
    ],
  })
  y = doc.lastAutoTable.finalY + 8

  y = sectionTitle(doc, '2. Premissas informadas', y)
  const premises = [
    ['Data inicial', dateBr(submitted.startDate)], ['Prazo', `${submitted.months} meses`],
    ['Aporte mensal', money.format(submitted.monthlyContribution)], ['CDI anual', pct(submitted.annualCdi)],
    ['CDB - percentual do CDI', pct(submitted.cdbCdiPercent)], ['CDB - tipo', submitted.cdbType === 'exempt' ? 'Isento' : 'Tributável'],
    ['CDB - taxa administrativa', `${pct(submitted.cdbAdminFee)} a.a.`], ['CDB - carregamento', pct(submitted.cdbLoading)],
    ['PGBL - percentual do CDI', pct(submitted.pgblCdiPercent)], ['Contrapartida do empregador', pct(submitted.employerMatch)],
    ['Vesting da contrapartida', pct(submitted.vesting)], ['PGBL - taxa administrativa', `${pct(submitted.pgblAdminFee)} a.a.`],
    ['PGBL - carregamento', pct(submitted.pgblLoading)], ['Regime de IR do PGBL', submitted.pgblTaxRegime === 'regressive' ? 'Regressivo' : 'Progressivo estimado'],
    ['Renda tributável anual', money.format(submitted.annualTaxableIncome)], ['Alíquota marginal', pct(submitted.marginalTax)],
    ['Limite de dedução', pct(submitted.deductionLimit)], ['Mês do benefício fiscal', String(submitted.taxCreditMonth)],
    ['Checkpoint', Number(submitted.redemptionEveryMonths) ? `A cada ${submitted.redemptionEveryMonths} meses` : 'Desativado'],
    ['Modo', submitted.redemptionMode === 'redeem' ? 'Resgate efetivo; valor mantido em caixa' : 'Avaliação líquida sem resgate'],
  ]
  autoTable(doc, { startY: y, margin: { top: 32, left: 14, right: 14, bottom: 12 }, theme: 'striped', styles: { fontSize: 7.5, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', textColor: BROWN } }, body: premises })

  doc.addPage(); y = 31
  y = sectionTitle(doc, '3. Metodologia e fórmulas', y)
  doc.setTextColor(45); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
  const methodology = [
    'Cada aporte mensal é registrado em lote próprio, com data, principal, saldo e origem. Isso permite calcular o prazo e a alíquota de cada lote individualmente.',
    'Taxa mensal equivalente = (1 + taxa anual líquida)^(1/12) - 1. Taxa anual líquida = CDI anual x percentual do CDI - taxa administrativa anual.',
    'CDB: o IR incide somente sobre o ganho positivo de cada lote. Alíquotas: 22,5% até 180 dias; 20% até 360; 17,5% até 720; 15% acima de 720 dias. Na opção isenta, a alíquota é zero.',
    'PGBL: o imposto incide sobre todo o saldo resgatável. No regime regressivo, cada lote usa 35% até 2 anos; 30% até 4; 25% até 6; 20% até 8; 15% até 10; 10% acima de 10 anos.',
    'Contrapartida: aporte próprio x percentual de contrapartida. No resgate, o saldo do empregador é multiplicado pelo percentual de vesting.',
    'Benefício fiscal anual estimado = menor valor entre contribuições próprias do ano anterior e renda tributável x limite de dedução; o resultado é multiplicado pela alíquota marginal e reinvestido no CDB.',
    'Carregamento reduz o valor efetivamente investido em cada aporte. Checkpoints podem apenas avaliar o saldo líquido ou efetivar o resgate; no segundo caso, o valor passa a caixa sem remuneração.',
  ]
  methodology.forEach((text, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${text}`, 178)
    doc.text(lines, 16, y); y += lines.length * 4.2 + 3
  })

  y = sectionTitle(doc, '4. Gráfico da evolução líquida', y + 3)
  const chartX = 25, chartY = y + 5, chartW = 154, chartH = 67
  const max = Math.max(...result.timeline.flatMap(row => [row.cdbNet, row.pgblNet]), 1)
  doc.setDrawColor(210); doc.setFillColor(255); doc.rect(chartX, chartY, chartW, chartH, 'FD')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
  ;[0,.25,.5,.75,1].forEach(level => {
    const lineY = chartY + chartH - level * chartH
    doc.setDrawColor(225); doc.setLineWidth(.15); doc.line(chartX, lineY, chartX + chartW, lineY)
    doc.setTextColor(95); doc.text(money.format(max * level).replace(',00',''), chartX - 2, lineY + 1.5, { align:'right' })
  })
  const drawLine = (key, color) => {
    doc.setDrawColor(...color); doc.setLineWidth(.7)
    result.timeline.forEach((row, index) => {
      if (!index) return
      const prior = result.timeline[index - 1]
      const x1 = chartX + (index - 1) / Math.max(1, result.timeline.length - 1) * chartW
      const x2 = chartX + index / Math.max(1, result.timeline.length - 1) * chartW
      doc.line(x1, chartY + chartH - prior[key] / max * chartH, x2, chartY + chartH - row[key] / max * chartH)
    })
  }
  drawLine('cdbNet', [8,127,196]); drawLine('pgblNet', ORANGE)
  const last = result.timeline.at(-1)
  const lastX = chartX + chartW
  const cdbY = chartY + chartH - last.cdbNet / max * chartH
  const pgblY = chartY + chartH - last.pgblNet / max * chartH
  doc.setFillColor(8,127,196); doc.circle(lastX, cdbY, 1.4, 'F')
  doc.setFillColor(...ORANGE); doc.circle(lastX, pgblY, 1.4, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5)
  doc.setTextColor(8,127,196); doc.text(`CDB: ${money.format(last.cdbNet)}`, lastX - 2, Math.min(chartY + chartH - 2, cdbY + 4), { align:'right' })
  doc.setTextColor(...ORANGE); doc.text(`PGBL: ${money.format(last.pgblNet)}`, lastX - 2, Math.max(chartY + 5, pgblY - 3), { align:'right' })
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5)
  doc.setTextColor(8,127,196); doc.text('CDB direto', chartX, chartY + chartH + 6)
  doc.setTextColor(...ORANGE); doc.text('PGBL + benefício fiscal', chartX + 24, chartY + chartH + 6)
  doc.setTextColor(90); doc.text('Mês 1', chartX, chartY + chartH + 10); doc.text(`Mês ${result.timeline.length}`, chartX + chartW, chartY + chartH + 10, { align:'right' })

  doc.addPage(); y = 31
  y = sectionTitle(doc, '5. Memória mensal completa', y)
  autoTable(doc, {
    startY: y, theme: 'grid', showHead: 'everyPage', margin: { top: 32, left: 6, right: 6, bottom: 12 },
    styles: { fontSize: 5.2, cellPadding: 1.1, overflow: 'linebreak' },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    head: [['Mês','Data','Aporte próprio','Contrapartida','CDB bruto','IR CDB','CDB líquido','PGBL bruto','IR PGBL','PGBL líquido','Benefício IR mês','CDB benefício líquido','Patrimônio C2','Diferença','Check']],
    body: result.timeline.map(row => [
      row.month, dateBr(row.date), number.format(row.ownContributionMonth), number.format(row.employerContributionMonth),
      number.format(row.cdbGross), number.format(row.cdbTax), number.format(row.cdbNet), number.format(row.pgblGross),
      number.format(row.pgblTax), number.format(row.pgblPlanNet), number.format(row.taxBenefit), number.format(row.benefitNet),
      number.format(row.pgblNet), number.format(row.pgblNet-row.cdbNet), row.checkpoint ? 'SIM' : '',
    ]),
  })

  doc.addPage(); y = 31
  y = sectionTitle(doc, '6. Conferência e ressalvas', y)
  doc.setTextColor(45); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
  const notes = [
    'A simulação utiliza premissas constantes e não prevê CDI, inflação, rentabilidade futura ou alterações legislativas.',
    'O benefício fiscal é uma estimativa simplificada. Sua utilização depende da declaração completa, de rendimentos tributáveis, das condições legais e das contribuições aos regimes previdenciários aplicáveis.',
    'A tributação progressiva foi tratada como alíquota econômica estimada. Retenção na fonte e ajuste anual podem produzir fluxo diferente.',
    'Consulte o regulamento do plano para vesting, taxas, carregamento, portabilidade, resgates e demais condições contratuais.',
    'Este relatório é educacional e não constitui recomendação de investimento, aconselhamento tributário ou garantia de resultado.',
  ]
  notes.forEach(text => { const lines = doc.splitTextToSize(`- ${text}`, 178); doc.text(lines, 16, y); y += lines.length*4.3+3 })
  doc.setFillColor(...BROWN); doc.roundedRect(14, y + 5, 182, 18, 3, 3, 'F')
  doc.setTextColor(255); doc.setFont('helvetica','bold'); doc.setFontSize(9)
  doc.text('Café com Sardinha - ideias complexas, linguagem simples.', 105, y + 16, { align:'center' })

  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) { doc.setPage(page); addHeader(doc, page, total, logo) }
  doc.save(`memoria-calculo-pgbl-x-cdb-${new Date().toISOString().slice(0,10)}.pdf`)
}
