function monthlyRate(annualRate) { return (1 + annualRate) ** (1 / 12) - 1 }

export function validateCashInstallment(input) {
  const errors = {}
  const range = (key, min, max, label) => {
    const value = Number(input[key])
    if (!Number.isFinite(value) || value < min || value > max) errors[key] = `${label}: informe um valor entre ${min} e ${max}.`
  }
  range('productPrice', 1, 100_000_000, 'Valor do produto')
  range('cashDiscount', 0, 90, 'Desconto à vista')
  range('installments', 1, 120, 'Número de parcelas')
  range('downPayment', 0, 100_000_000, 'Entrada')
  range('installmentTotal', 1, 200_000_000, 'Total parcelado')
  range('extraMonths', 0, 600, 'Prazo adicional')
  range('annualCdi', 0, 100, 'CDI anual')
  ;['cashCdiPercent','installmentCdiPercent'].forEach(key => range(key, 0, 300, 'Percentual do CDI'))
  ;['cashAdminFee','installmentAdminFee'].forEach(key => range(key, 0, 20, 'Taxa administrativa'))
  ;['cashIncomeTax','installmentIncomeTax'].forEach(key => range(key, 0, 100, 'Imposto de renda'))
  ;['cashLoading','installmentLoading'].forEach(key => range(key, 0, 50, 'Carregamento'))
  if (Number(input.downPayment) > Number(input.installmentTotal)) errors.downPayment = 'A entrada não pode superar o total parcelado.'
  if (!['income','investment'].includes(input.installmentPaymentSource)) errors.installmentPaymentSource = 'Selecione a origem das parcelas.'
  if (!['beginning','end'].includes(input.cashFlowTiming)) errors.cashFlowTiming = 'Selecione o momento do fluxo mensal.'
  return errors
}

export function simulateCashVsInstallment(input) {
  const errors = validateCashInstallment(input)
  if (Object.keys(errors).length) return { errors }
  const cfg = Object.fromEntries(Object.entries(input).map(([key,value]) => [key, typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value]))
  const cashPrice = cfg.productPrice * (1 - cfg.cashDiscount / 100)
  const discountValue = cfg.productPrice - cashPrice
  const financedAmount = cfg.installmentTotal - cfg.downPayment
  const installment = financedAmount / cfg.installments
  const months = cfg.installments + cfg.extraMonths
  const cashRate = monthlyRate(cfg.annualCdi/100 * cfg.cashCdiPercent/100 - cfg.cashAdminFee/100)
  const installmentRate = monthlyRate(cfg.annualCdi/100 * cfg.installmentCdiPercent/100 - cfg.installmentAdminFee/100)
  let cashBalance = discountValue * (1-cfg.cashLoading/100)
  let installmentBalance = Math.max(0, cfg.productPrice-cfg.downPayment) * (1-cfg.installmentLoading/100)
  let cashPrincipal = cashBalance, installmentPrincipal = installmentBalance
  const timeline=[]

  for(let month=1; month<=months; month+=1){
    const activeInstallment=month<=cfg.installments
    const cashContribution=activeInstallment && cfg.installmentPaymentSource==='income' ? installment*(1-cfg.cashLoading/100) : 0
    const installmentWithdrawal=activeInstallment && cfg.installmentPaymentSource==='investment' ? installment : 0
    if(cfg.cashFlowTiming==='beginning'){
      cashBalance+=cashContribution; cashPrincipal+=cashContribution
      installmentBalance-=installmentWithdrawal; installmentPrincipal=Math.max(0,installmentPrincipal-installmentWithdrawal)
    }
    if(installmentBalance<0) return { errors:{ installmentPaymentSource:`O investimento acaba no mês ${month}. Aumente o capital inicial, reduza o parcelamento ou pague as parcelas pela renda mensal.` } }
    const cashInterest=cashBalance*cashRate, installmentInterest=installmentBalance*installmentRate
    cashBalance+=cashInterest; installmentBalance+=installmentInterest
    if(cfg.cashFlowTiming==='end'){
      cashBalance+=cashContribution; cashPrincipal+=cashContribution
      installmentBalance-=installmentWithdrawal; installmentPrincipal=Math.max(0,installmentPrincipal-installmentWithdrawal)
    }
    if(installmentBalance<0) return { errors:{ installmentPaymentSource:`O investimento acaba no mês ${month}. Aumente o capital inicial, reduza o parcelamento ou pague as parcelas pela renda mensal.` } }
    const cashGain=Math.max(0,cashBalance-cashPrincipal), installmentGain=Math.max(0,installmentBalance-installmentPrincipal)
    const cashTax=cashGain*cfg.cashIncomeTax/100, installmentTax=installmentGain*cfg.installmentIncomeTax/100
    timeline.push({month,cashContribution,installmentPayment:activeInstallment?installment:0,cashInterest,installmentInterest,cashGross:cashBalance,installmentGross:installmentBalance,cashTax,installmentTax,cashNet:cashBalance-cashTax,installmentNet:installmentBalance-installmentTax})
  }
  const final=timeline.at(-1), difference=final.cashNet-final.installmentNet
  return {errors:{},timeline,config:cfg,summary:{cashPrice,discountValue,installment,financedAmount,cashNet:final.cashNet,installmentNet:final.installmentNet,difference,winner:difference>0?'Comprar à vista':difference<0?'Comprar parcelado':'Empate',cashTax:final.cashTax,installmentTax:final.installmentTax}}
}
