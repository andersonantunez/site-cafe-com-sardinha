import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePortfolioFile, parsePortfolioJson } from '../server/src/services/portfolioParser.js'

const header = 'Código\tProduto\tTipo\tValor Investido\tEmissão\tVencimento\tDias Corridos\tDias Úteis\tTaxa\tTipo Indexador\tPreço Unitário\tQuantidade\tValor Líquido\tRentabilidade Líquida\tRentabilidade Média\tLiquidado?'
const row = 'ABC1\tBanco Exemplo\tCDB\tR$ 1.000,00\t01/01/2026\t01/01/2028\t730\t504\t115% CDI\tPós-fixado\tR$ 1.000,00\t1\tR$ 1.100,00\t10,00\t0,01\tFALSE'

test('importador preserva as dezesseis colunas e converte formatos brasileiros', () => {
  const result = parsePortfolioFile(`${header}\n${row}`)
  assert.equal(result.assets.length, 1)
  assert.equal(result.assets[0].codigo, 'ABC1')
  assert.equal(result.assets[0].valorInvestido, 1000)
  assert.equal(result.assets[0].vencimento, '2028-01-01')
  assert.equal(result.assets[0].liquidado, false)
  assert.match(result.hash, /^[a-f0-9]{64}$/)
})

test('importador identifica títulos liquidados na coluna original', () => {
  const result = parsePortfolioFile(`${header}\n${row.replace(/FALSE$/, 'TRUE')}`)
  assert.equal(result.assets[0].liquidado, true)
})

test('importador exige a coluna de liquidação', () => {
  assert.throws(() => parsePortfolioFile(`${header.replace('\tLiquidado?', '')}\n${row.replace('\tFALSE', '')}`), /Liquidado/)
})

test('importador rejeita datas impossíveis', () => {
  assert.throws(() => parsePortfolioFile(`${header}\n${row.replace('01/01/2028', '31/02/2028')}`), /Data inválida/)
})

test('importador preserva lotes distintos que usam o mesmo código de título', () => {
  const secondLot = row.replace('01/01/2026', '02/01/2026')
  const result = parsePortfolioFile(`${header}\n${row}\n${secondLot}`)
  assert.equal(result.assets.length, 2)
  assert.equal(result.assets[0].codigo, result.assets[1].codigo)
  assert.notEqual(result.assets[0].emissao, result.assets[1].emissao)
})

test('importador rejeita valores financeiros negativos', () => {
  assert.throws(() => parsePortfolioFile(`${header}\n${row.replace('R$ 1.000,00', 'R$ -1,00')}`), /Valor inválido/)
})

test('importador JSON aceita o mesmo contrato financeiro do TSV', () => {
  const result = parsePortfolioJson(JSON.stringify({ titulos: [{
    codigo: 'JSON1', produto: 'Banco JSON', tipo: 'CDB', valorInvestido: 1000,
    emissao: '01/01/2026', vencimento: '01/01/2028', diasCorridos: 730,
    diasUteis: 504, taxa: '115% CDI', tipoIndexador: 'PÓS-FIXADO', precoUnitario: 1000,
    quantidade: 1, valorLiquido: 1100, rentabilidadeLiquida: 10,
    rentabilidadeMedia: 0.01, liquidado: false,
  }] }))
  assert.equal(result.assets[0].codigo, 'JSON1')
  assert.equal(result.assets[0].valorLiquido, 1100)
  assert.equal(result.assets[0].liquidado, false)
})

test('importador JSON rejeita documentos incompletos', () => {
  assert.throws(() => parsePortfolioJson('{"titulos":[{"codigo":"X"}]}'), /Campo obrigatório ausente/)
})
