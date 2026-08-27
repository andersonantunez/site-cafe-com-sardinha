import test from 'node:test'
import assert from 'node:assert/strict'
import { appendUserPortfolio, replaceUserPortfolio } from '../server/src/services/portfolioImportService.js'

const asset = {
  codigo: 'A1', produto: 'Banco', tipo: 'CDB', valorInvestido: 100,
  emissao: '2025-01-01', vencimento: '2027-01-01', diasCorridos: 730,
  diasUteis: 504, taxa: '110% CDI', tipoIndexador: 'PÓS-FIXADO',
  precoUnitario: 100, quantidade: 1, valorLiquido: 110,
  rentabilidadeLiquida: 10, rentabilidadeMedia: 0.01, liquidado: false, linhaOrigem: 2,
}

const client = ({ failInsert = false } = {}) => {
  const calls = []
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql: String(sql), params })
      if (String(sql).includes('INSERT INTO carteira_importacoes')) return { rows: [{ id: 91 }] }
      if (failInsert && String(sql).includes('INSERT INTO carteira_titulos')) throw new Error('falha simulada')
      return { rows: [], rowCount: 1 }
    },
  }
}

test('reimportação exclui somente a carteira do usuário e confirma a transação', async () => {
  const db = client()
  await replaceUserPortfolio(db, { userId: 42, fileName: 'Ativos.txt', hash: 'a'.repeat(64), assets: [asset] })
  const deletion = db.calls.find(call => call.sql.includes('DELETE FROM carteira_titulos'))
  assert.deepEqual(deletion.params, [42])
  assert.match(deletion.sql, /WHERE usuario_id=\$1/)
  assert.equal(db.calls.at(-1).sql, 'COMMIT')
  const insertion = db.calls.find(call => call.sql.includes('INSERT INTO carteira_titulos'))
  assert.equal(insertion.params[0], 42)
  assert.equal(insertion.params[17], false)
})

test('falha na inserção executa rollback e não confirma a substituição', async () => {
  const db = client({ failInsert: true })
  await assert.rejects(
    replaceUserPortfolio(db, { userId: 7, fileName: 'Ativos.txt', hash: 'b'.repeat(64), assets: [asset] }),
    /falha simulada/,
  )
  assert.equal(db.calls.at(-1).sql, 'ROLLBACK')
  assert.equal(db.calls.some(call => call.sql === 'COMMIT'), false)
})

test('modo acrescentar preserva registros anteriores do usuário', async () => {
  const db = client()
  await appendUserPortfolio(db, { userId: 42, fileName: 'Ativos.json', hash: 'c'.repeat(64), assets: [asset] })
  assert.equal(db.calls.some(call => call.sql.includes('DELETE FROM carteira_titulos')), false)
  assert.equal(db.calls.at(-1).sql, 'COMMIT')
})
