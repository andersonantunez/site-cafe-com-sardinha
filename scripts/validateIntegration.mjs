import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { pool } from '../server/src/config/database.js'
import { signSession } from '../server/src/services/authService.js'
import { replaceUserPortfolio } from '../server/src/services/portfolioImportService.js'
import { getUserPortfolio } from '../server/src/services/portfolioService.js'

const baseUrl = process.env.INTEGRATION_BASE_URL || 'http://127.0.0.1:5173'
const createdContent = []
const createdUsers = []
let originalSettings
let adminToken
let createdPerformanceId
let contactEmail

const api = async (path, { token, expected = 200, ...options } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = response.status === 204 ? null : await response.json().catch(() => ({}))
  assert.equal(response.status, expected, `${options.method || 'GET'} ${path}: ${JSON.stringify(data)}`)
  return data
}

const asset = (codigo, liquidado = false, linhaOrigem = 2) => ({
  codigo, produto: `Banco ${codigo}`, tipo: 'CDB', valorInvestido: 100,
  emissao: '2025-01-01', vencimento: '2028-01-01', diasCorridos: 1095,
  diasUteis: 756, taxa: '110% CDI', tipoIndexador: 'PÓS-FIXADO',
  precoUnitario: 100, quantidade: 1, valorLiquido: 110,
  rentabilidadeLiquida: 10, rentabilidadeMedia: 0.01, liquidado, linhaOrigem,
})

const importFor = async (userId, assets) => {
  const client = await pool.connect()
  try {
    await replaceUserPortfolio(client, {
      userId, fileName: 'Teste-integracao.txt', hash: crypto.randomBytes(32).toString('hex'), assets,
    })
  } finally {
    client.release()
  }
}

const contentPayloads = {
  sobre: { titulo: 'Sobre integração', conteudo: 'Texto de integração.' },
  frase: { titulo: 'Frase de integração' },
  postagem: { titulo: 'Postagem de integração', conteudo: 'Teste', url: 'https://example.com/post' },
  depoimento: { titulo: 'Pessoa teste', subtitulo: 'Leitor', conteudo: 'Depoimento de integração.' },
  artigo: { titulo: 'Artigo de integração', conteudo: 'Resumo', autor: 'Autor', fonte: 'Fonte', url: 'https://example.com/artigo', preco: 9.9 },
  livro: { titulo: 'Livro de integração', conteudo: 'Resumo editorial', autor: 'Autor', url: 'https://amazon.com.br/livro', preco: 19.9 },
  produto: { titulo: 'Produto de integração', conteudo: 'Descrição', loja: 'Loja', url: 'https://example.com/produto', preco: 29.9 },
  achadinho: { titulo: 'Achadinho de integração', conteudo: 'Descrição curta', categoria: 'Casa', url: 'https://amazon.com.br/oferta', preco: 39.9, precoAnterior: 49.9, destaque: true },
}

try {
  const adminResult = await pool.query('SELECT * FROM usuarios WHERE ativo AND is_admin ORDER BY id LIMIT 1')
  assert.ok(adminResult.rows[0], 'É necessário existir um administrador ativo.')
  const admin = adminResult.rows[0]
  adminToken = signSession(admin)

  await api('/api/admin/me', { expected: 401 })

  for (const suffix of ['a', 'b']) {
    const marker = crypto.randomUUID()
    const result = await pool.query(`INSERT INTO usuarios (nome,email,google_sub)
      VALUES ($1,$2,$3) RETURNING *`, [`Usuário teste ${suffix.toUpperCase()}`, `integracao-${marker}@example.test`, `integration-${marker}`])
    createdUsers.push(result.rows[0])
  }
  const [userA, userB] = createdUsers
  const commonToken = signSession(userA)
  await pool.query(`INSERT INTO compras_usuario (usuario_id,tipo,descricao,valor_pago,forma_pagamento,status)
    VALUES ($1,'ebook','E-book do usuário A',19.9,'PIX','comprado'),($2,'caneca','Caneca do usuário B',39.9,'Cartão','comprado')`, [userA.id, userB.id])
  const purchasesA = await api('/api/compras', { token: commonToken })
  assert.deepEqual(purchasesA.map(item => item.descricao), ['E-book do usuário A'])
  await api('/api/admin/me', { token: commonToken, expected: 403 })
  await api('/api/admin/rentabilidade', { token: commonToken, expected: 403 })

  const performance = await api('/api/admin/rentabilidade', {
    token: adminToken, method: 'POST', expected: 201,
    body: JSON.stringify({ competencia: '2099-12-01', rentabilidadeCarteira: 1.2, rentabilidadeCdi: 1, percentualCdi: 120, publicado: true }),
  })
  createdPerformanceId = performance.id
  await api(`/api/admin/rentabilidade/${createdPerformanceId}`, {
    token: adminToken, method: 'PUT',
    body: JSON.stringify({ competencia: '2099-12-01', rentabilidadeCarteira: 1.3, rentabilidadeCdi: 1, percentualCdi: 130, publicado: false }),
  })
  const performanceRows = await api('/api/admin/rentabilidade', { token: adminToken })
  assert.equal(performanceRows.find(item => Number(item.id) === Number(createdPerformanceId)).rentabilidadeCarteira, 1.3)
  await api('/api/admin/me', { token: adminToken })

  const configuration = await api('/api/admin/configuracoes', { token: adminToken })
  assert.equal(Number(configuration.administrador_usuario_id), Number(admin.id))

  const granted = await api(`/api/admin/usuarios/${userA.id}/permissao`, {
    token: adminToken, method: 'PUT', body: JSON.stringify({ isAdmin: true }),
  })
  assert.equal(granted.is_admin, true)
  await api('/api/admin/me', { token: commonToken })
  const revoked = await api(`/api/admin/usuarios/${userA.id}/permissao`, {
    token: adminToken, method: 'PUT', body: JSON.stringify({ isAdmin: false }),
  })
  assert.equal(revoked.is_admin, false)
  await api('/api/admin/me', { token: commonToken, expected: 403 })

  await api('/api/carteira/compartilhamento', { token: commonToken, method: 'POST', expected: 409 })

  await importFor(userA.id, [asset('A1'), asset('A2', true, 3)])
  const shared = await api('/api/carteira/compartilhamento', { token: commonToken, method: 'POST', expected: 201 })
  assert.match(shared.path, /^\/carteira\/publica\/[A-Za-z0-9_-]{40,100}$/)
  await importFor(userB.id, [asset('B1')])
  let portfolioA = await getUserPortfolio(userA.id)
  let portfolioB = await getUserPortfolio(userB.id)
  assert.deepEqual([portfolioA.assets.length, portfolioA.liquidatedAssets.length], [1, 1])
  assert.deepEqual([portfolioB.assets.length, portfolioB.liquidatedAssets.length], [1, 0])

  await importFor(userA.id, [asset('A3')])
  portfolioA = await getUserPortfolio(userA.id)
  portfolioB = await getUserPortfolio(userB.id)
  assert.deepEqual(portfolioA.assets.map(item => item.code), ['A3'])
  assert.deepEqual(portfolioB.assets.map(item => item.code), ['B1'])

  await assert.rejects(importFor(userA.id, [{ ...asset('INVÁLIDO'), codigo: null }]))
  portfolioA = await getUserPortfolio(userA.id)
  assert.deepEqual(portfolioA.assets.map(item => item.code), ['A3'])

  const privatePortfolio = await api('/api/carteira', { token: adminToken })
  originalSettings = privatePortfolio.settings
  const expectedCurrentCount = privatePortfolio.assets.length
  await api('/api/carteira/configuracoes', {
    token: adminToken,
    method: 'PUT',
    body: JSON.stringify({ ...originalSettings, mostrarVencimento: false, mostrarEmissor: false, nomeCarteira: 'Carteira de integração' }),
  })
  const publicPortfolio = await api('/api/carteira-publica/admin')
  assert.equal(publicPortfolio.assets.length, expectedCurrentCount)
  assert.ok(publicPortfolio.assets.every(item => !('maturityAt' in item)))
  assert.ok(publicPortfolio.assets.every(item => /^Emissor \d+$/.test(item.issuer)))
  assert.equal(publicPortfolio.portfolioName, 'Carteira de integração')
  assert.deepEqual(Object.keys(publicPortfolio.visibility).sort(), ['mostrarEmissor', 'mostrarTaxa', 'mostrarTipoProduto', 'mostrarVencimento'].sort())

  await api('/api/contato', { method: 'POST', expected: 400, body: JSON.stringify({ nome: '<script>', email: 'inválido', assunto: 'x', mensagem: 'curta' }) })
  contactEmail = `integracao-contato-${crypto.randomUUID()}@example.test`
  await api('/api/contato', { method: 'POST', expected: 201, body: JSON.stringify({ nome: 'Contato integração', email: contactEmail, assunto: 'Teste seguro', mensagem: 'Mensagem válida para testar o formulário público.' }) })
  const storedContact = await pool.query('SELECT nome,assunto FROM mensagens_contato WHERE email=$1', [contactEmail])
  assert.deepEqual(storedContact.rows[0], { nome: 'Contato integração', assunto: 'Teste seguro' })

  for (const [tipo, values] of Object.entries(contentPayloads)) {
    const payload = { tipo, ...values, ativo: true, ordem: 9999 }
    const created = await api('/api/admin/conteudos', {
      token: adminToken, expected: 201, method: 'POST', body: JSON.stringify(payload),
    })
    createdContent.push({ tipo, id: created.id })
    const listed = await api(`/api/admin/conteudos?tipo=${tipo}`, { token: adminToken })
    assert.ok(listed.some(item => Number(item.id) === Number(created.id)))
    if (!['sobre', 'frase', 'postagem'].includes(tipo)) {
      const published = await api(`/api/conteudos?tipo=${tipo}`)
      assert.ok(published.some(item => Number(item.id) === Number(created.id)))
    }
    const updatedTitle = `${payload.titulo} editado`
    await api(`/api/admin/conteudos/${created.id}`, {
      token: adminToken,
      method: 'PUT',
      body: JSON.stringify({ ...payload, titulo: updatedTitle, ativo: false, ordem: 9998 }),
    })
    const afterUpdate = await api(`/api/admin/conteudos?tipo=${tipo}`, { token: adminToken })
    const updated = afterUpdate.find(item => Number(item.id) === Number(created.id))
    assert.equal(updated.titulo, updatedTitle)
    assert.equal(updated.ativo, false)
    assert.equal(updated.ordem, 9998)
    if (!['sobre', 'frase', 'postagem'].includes(tipo)) {
      const unpublished = await api(`/api/conteudos?tipo=${tipo}`)
      assert.ok(!unpublished.some(item => Number(item.id) === Number(created.id)))
    }
  }

  console.log('Integração validada: 401/403/200, permissões, principal, privacidade, compras, contato, reimportação, rollback e 9 CRUDs.')
} finally {
  if (createdPerformanceId && adminToken) await api(`/api/admin/rentabilidade/${createdPerformanceId}`, {
    token: adminToken, method: 'DELETE', expected: 204,
  }).catch(() => {})
  if (contactEmail) await pool.query('DELETE FROM mensagens_contato WHERE email=$1', [contactEmail]).catch(() => {})
  if (originalSettings && adminToken) {
    await api('/api/carteira/configuracoes', {
      token: adminToken,
      method: 'PUT',
      body: JSON.stringify(originalSettings),
    }).catch(() => {})
  }
  for (const item of createdContent.reverse()) {
    await api(`/api/admin/conteudos/${item.id}?tipo=${item.tipo}`, {
      token: adminToken, method: 'DELETE', expected: 204,
    }).catch(() => {})
  }
  for (const user of createdUsers) await pool.query('DELETE FROM usuarios WHERE id=$1', [user.id])
  await pool.end()
}
