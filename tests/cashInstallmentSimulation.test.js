import test from 'node:test'
import assert from 'node:assert/strict'
import { simulateCashVsInstallment } from '../src/lib/cashInstallmentSimulation.js'

const base = {
  productPrice: 1000, cashDiscount: 0, installments: 10, downPayment: 0,
  installmentTotal: 1000, extraMonths: 0, annualCdi: 0,
  cashCdiPercent: 100, installmentCdiPercent: 100,
  cashAdminFee: 0, installmentAdminFee: 0, cashIncomeTax: 0,
  installmentIncomeTax: 0, cashLoading: 0, installmentLoading: 0,
  installmentPaymentSource: 'income', cashFlowTiming: 'beginning',
}

const simulate = overrides => simulateCashVsInstallment({ ...base, ...overrides }).summary

test('rendimento zero e desconto zero produzem empate', () => {
  const summary = simulate({})
  assert.equal(summary.winnerKey, 'tie')
  assert.equal(summary.difference, 0)
})

test('rendimento zero com desconto favorece pagamento à vista', () => {
  assert.equal(simulate({ cashDiscount: 10 }).winnerKey, 'cash')
})

test('desconto zero e parcelamento sem juros favorecem manter o capital investido', () => {
  assert.equal(simulate({ annualCdi: 12 }).winnerKey, 'installment')
})

test('grande desconto à vista supera o custo de oportunidade', () => {
  assert.equal(simulate({ cashDiscount: 35, annualCdi: 12 }).winnerKey, 'cash')
})

test('parcelamento pode vencer com rendimento positivo e desconto pequeno', () => {
  assert.equal(simulate({ cashDiscount: 1, annualCdi: 20, installments: 24 }).winnerKey, 'installment')
})

test('taxas distintas podem produzir caso favorável à vista', () => {
  assert.equal(simulate({ annualCdi: 15, cashCdiPercent: 150, installmentCdiPercent: 50, cashDiscount: 10 }).winnerKey, 'cash')
})

test('diferenças inferiores a meio centavo são tratadas como equivalência monetária', () => {
  const summary = simulate({ productPrice: 100, installmentTotal: 100, installments: 1, cashDiscount: 0.001 })
  assert.equal(summary.winnerKey, 'tie')
  assert.equal(summary.difference, 0)
})

test('arredondamento preserva a diferença em centavos', () => {
  const summary = simulate({ productPrice: 100, installmentTotal: 100, installments: 1, cashDiscount: 0.006 })
  assert.equal(summary.winnerKey, 'cash')
  assert.equal(summary.difference, 0.01)
})

