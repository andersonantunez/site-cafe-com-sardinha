import test from 'node:test'
import assert from 'node:assert/strict'
import { config } from '../server/src/config/index.js'
import { buildCheckoutPayload, createAsaasCheckout } from '../server/src/services/asaasService.js'
import { resolveCheckoutItem, processAsaasEvent } from '../server/src/services/checkoutService.js'
import { createContactFormToken, validateContactFormToken, validateContactFields, enforceContactRateLimit } from '../server/src/services/contactSecurityService.js'
import { verifyTurnstileToken } from '../server/src/services/turnstileService.js'
import { secureWebhookToken } from '../server/src/routes/asaasWebhook.js'
import { protectedGoogleUrl } from '../server/src/routes/articles.js'

test('token assinado do contato rejeita envio rápido e expiração', () => {
  const issued = 1_800_000_000_000
  const token = createContactFormToken(issued)
  assert.equal(validateContactFormToken(token, issued + 1_000).reason, 'too_fast')
  assert.equal(validateContactFormToken(token, issued + 3_000).valid, true)
  assert.equal(validateContactFormToken(token, issued + 3_700_000).reason, 'expired')
  assert.equal(validateContactFormToken(`${token}x`, issued + 3_000).valid, false)
})

test('validação do contato aceita dados válidos e rejeita e-mail e mensagem excessiva', () => {
  const valid = { name: 'Ana Silva', email: 'ana@example.com', subject: 'Projeto', message: 'Gostaria de conversar sobre um projeto.' }
  assert.equal(validateContactFields(valid), true)
  assert.equal(validateContactFields({ ...valid, email: 'invalido' }), false)
  assert.equal(validateContactFields({ ...valid, message: 'x'.repeat(3001) }), false)
})

test('rate limit do contato aplica janelas por IP e por e-mail', async () => {
  const blockedIp = async sql => ({ rows: sql.includes('FILTER') ? [{ ip_10m: 3, ip_24h: 3 }] : [{ total: 0 }] })
  assert.equal(await enforceContactRateLimit('ip', 'email', blockedIp), false)
  const blockedEmail = async sql => ({ rows: sql.includes('FILTER') ? [{ ip_10m: 0, ip_24h: 0 }] : [{ total: 5 }] })
  assert.equal(await enforceContactRateLimit('ip', 'email', blockedEmail), false)
})

test('Turnstile é validado no endpoint oficial e falhas não são aceitas', async () => {
  const previous = config.turnstile.secretKey
  config.turnstile.secretKey = 'test-secret'
  try {
    let requestedUrl = ''
    const ok = await verifyTurnstileToken('test-token', '127.0.0.1', async (url, options) => {
      requestedUrl = url
      assert.match(String(options.body), /secret=test-secret/)
      return { ok: true, json: async () => ({ success: true }) }
    })
    assert.equal(ok, true)
    assert.equal(requestedUrl, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
    assert.equal(await verifyTurnstileToken('bad', '', async () => ({ ok: true, json: async () => ({ success: false }) })), false)
  } finally { config.turnstile.secretKey = previous }
})

test('payload do Asaas usa preço do item resolvido e callbacks sem confirmação implícita', () => {
  const payload = buildCheckoutPayload({ orderCode: 'order-1', item: { type: 'ARTICLE', referenceId: 8, name: 'Artigo', description: 'Resumo', price: 29.9 } })
  assert.deepEqual(payload.billingTypes, ['PIX', 'CREDIT_CARD'])
  assert.deepEqual(payload.chargeTypes, ['DETACHED'])
  assert.equal(payload.items[0].value, 29.9)
  assert.match(payload.callback.successUrl, /compra\/sucesso/)
  assert.equal('customerData' in payload, false)
})

test('erro do Asaas é tratado sem expor credenciais', async () => {
  const previous = config.asaas.apiKey
  config.asaas.apiKey = 'sandbox-key'
  try {
    await assert.rejects(createAsaasCheckout({ orderCode: 'x', item: { type: 'ARTICLE', referenceId: 1, name: 'A', description: 'B', price: 10 } }, async () => ({ ok: false, json: async () => ({ errors: [{ description: 'checkout recusado' }] }) })), /checkout recusado/)
  } finally { config.asaas.apiKey = previous }
})

test('produto e artigo são resolvidos no banco e artigo já comprado é bloqueado', async () => {
  const productClient = { query: async () => ({ rows: [{ variante_id: 7, produto_id: 3, nome: 'Moletom', descricao: 'Produto', cor_nome: 'Azul', tamanho: 'M', preco: '149.90' }] }) }
  const product = await resolveCheckoutItem(productClient, 'PRODUCT', 7, 44)
  assert.equal(product.price, 149.9)
  assert.equal(product.variantId, 7)
  let calls = 0
  const articleClient = { query: async () => ({ rows: ++calls === 1 ? [{}] : [] }) }
  await assert.rejects(resolveCheckoutItem(articleClient, 'ARTICLE', 8, 44), /já está disponível/)
})

function webhookPool({ orderExists = true } = {}) {
  const state = { eventInserted: false, accessWrites: 0, notificationWrites: 0, queries: [] }
  const client = { query: async sql => {
    const text = String(sql)
    state.queries.push(text)
    if (text.includes('INSERT INTO asaas_webhook_eventos')) {
      if (state.eventInserted) return { rows: [] }
      state.eventInserted = true
      return { rows: [{ id: 1 }] }
    }
    if (text.includes('SELECT pedido_id,tipo_evento FROM asaas_webhook_eventos')) return { rows: [{ pedido_id: 91, tipo_evento: 'CHECKOUT_PAID' }] }
    if (text.includes('SELECT id,usuario_id,status FROM pedidos')) return { rows: orderExists ? [{ id: 91, usuario_id: 44, status: 'PENDING' }] : [] }
    if (text.includes('INSERT INTO acessos_artigos')) state.accessWrites += 1
    if (text.includes('INSERT INTO pedido_notificacoes')) state.notificationWrites += 1
    return { rows: [] }
  }, release() {} }
  return { state, connect: async () => client }
}

test('webhook pago concede acesso uma vez e evento duplicado é idempotente', async () => {
  const fakePool = webhookPool()
  const event = { id: 'evt-1', event: 'CHECKOUT_PAID', checkout: { id: 'chk-1', status: 'PAID' } }
  const first = await processAsaasEvent(event, fakePool)
  const duplicate = await processAsaasEvent(event, fakePool)
  assert.equal(first.paid, true)
  assert.equal(duplicate.duplicate, true)
  assert.equal(fakePool.state.accessWrites, 1)
  assert.equal(fakePool.state.notificationWrites, 1)
})

test('webhook de pedido inexistente é registrado e ignorado com segurança', async () => {
  const result = await processAsaasEvent({ id: 'evt-x', event: 'CHECKOUT_PAID', checkout: { id: 'missing' } }, webhookPool({ orderExists: false }))
  assert.equal(result.ignored, true)
})

test('webhooks de cancelamento e expiração mudam somente pedidos pendentes', async () => {
  const canceled = webhookPool()
  await processAsaasEvent({ id: 'evt-c', event: 'CHECKOUT_CANCELED', checkout: { id: 'chk-c' } }, canceled)
  assert.equal(canceled.state.queries.some(sql => sql.includes("status='CANCELED'") && sql.includes("status='PENDING'")), true)
  const expired = webhookPool()
  await processAsaasEvent({ id: 'evt-e', event: 'CHECKOUT_EXPIRED', checkout: { id: 'chk-e' } }, expired)
  assert.equal(expired.state.queries.some(sql => sql.includes("status='EXPIRED'") && sql.includes("status='PENDING'")), true)
})

test('token do webhook usa comparação exata', () => {
  assert.equal(secureWebhookToken('a'.repeat(32), 'a'.repeat(32)), true)
  assert.equal(secureWebhookToken('a'.repeat(31), 'a'.repeat(32)), false)
  assert.equal(secureWebhookToken('b'.repeat(32), 'a'.repeat(32)), false)
})

test('artigo protegido usa proxy de exportação sem expor o link original ao frontend', () => {
  assert.equal(protectedGoogleUrl('https://docs.google.com/document/d/documento123/edit?usp=drive_link'), 'https://docs.google.com/document/d/documento123/export?format=pdf')
  assert.equal(protectedGoogleUrl('https://example.com/documento'), null)
})
