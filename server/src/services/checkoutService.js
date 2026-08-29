import crypto from 'node:crypto'
import { pool, query } from '../config/database.js'
import { createAsaasCheckout } from './asaasService.js'
import { securityLog } from './securityLog.js'

const positiveInteger = value => Number.isSafeInteger(Number(value)) && Number(value) > 0
const idempotencyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function httpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

export async function resolveCheckoutItem(client, itemType, itemId, userId) {
  if (!positiveInteger(itemId)) throw httpError('Item inválido.', 400)
  if (itemType === 'ARTICLE') {
    const access = await client.query('SELECT 1 FROM acessos_artigos WHERE usuario_id=$1 AND artigo_id=$2 AND revogado_em IS NULL', [userId, itemId])
    if (access.rows[0]) throw httpError('Este artigo já está disponível na sua conta.', 409)
    const { rows } = await client.query(`SELECT id,titulo,resumo,preco FROM artigos_interessantes
      WHERE id=$1 AND publicado AND conteudo_pago AND preco IS NOT NULL AND preco > 0`, [itemId])
    if (!rows[0]) throw httpError('Artigo indisponível para compra ou sem preço configurado.', 404)
    return {
      type: 'ARTICLE', referenceId: Number(rows[0].id), articleId: Number(rows[0].id),
      productId: null, variantId: null, name: rows[0].titulo,
      description: rows[0].resumo || `Acesso ao artigo ${rows[0].titulo}`,
      price: Number(rows[0].preco), details: {},
    }
  }
  if (itemType === 'PRODUCT') {
    const { rows } = await client.query(`SELECT v.id AS variante_id,p.id AS produto_id,p.nome,p.descricao,
      v.cor_nome,v.tamanho,COALESCE(v.preco,p.preco) AS preco
      FROM produtos_cafe_variantes v JOIN produtos_cafe p ON p.id=v.produto_id
      WHERE v.id=$1 AND v.ativo AND p.publicado AND COALESCE(v.preco,p.preco) IS NOT NULL
        AND COALESCE(v.preco,p.preco) > 0`, [itemId])
    if (!rows[0]) throw httpError('Produto indisponível para compra ou sem preço configurado.', 404)
    const variation = [rows[0].cor_nome, rows[0].tamanho].filter(Boolean).join(' — ')
    return {
      type: 'PRODUCT', referenceId: Number(rows[0].variante_id), articleId: null,
      productId: Number(rows[0].produto_id), variantId: Number(rows[0].variante_id),
      name: `${rows[0].nome}${variation ? ` — ${variation}` : ''}`,
      description: rows[0].descricao || rows[0].nome,
      price: Number(rows[0].preco),
      details: { cor: rows[0].cor_nome, tamanho: rows[0].tamanho },
    }
  }
  throw httpError('Tipo de item inválido.', 400)
}

export async function createOrderCheckout({ userId, itemType, itemId, idempotencyKey }, dependencies = {}) {
  if (!idempotencyPattern.test(String(idempotencyKey || ''))) throw httpError('Chave de idempotência inválida.', 400)
  const checkoutProvider = dependencies.createCheckout || createAsaasCheckout
  const dbPool = dependencies.pool || pool
  const client = await dbPool.connect()
  let order
  let item
  let user
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1,$2)', [72931, userId])
    const existing = await client.query(`SELECT codigo,status,asaas_checkout_url FROM pedidos
      WHERE usuario_id=$1 AND chave_idempotencia=$2`, [userId, idempotencyKey])
    if (existing.rows[0]) {
      await client.query('COMMIT')
      return { orderCode: existing.rows[0].codigo, status: existing.rows[0].status, checkoutUrl: existing.rows[0].asaas_checkout_url, reused: true }
    }
    const recentOrders = await client.query(`SELECT COUNT(*)::int AS total FROM pedidos
      WHERE usuario_id=$1 AND criado_em > NOW() - INTERVAL '10 minutes'`, [userId])
    if (recentOrders.rows[0].total >= 10) throw httpError('Muitas tentativas de checkout. Aguarde alguns minutos.', 429)
    item = await resolveCheckoutItem(client, String(itemType || '').toUpperCase(), itemId, userId)
    if (item.type === 'ARTICLE') {
      const pending = await client.query(`SELECT p.codigo,p.status,p.asaas_checkout_url FROM pedidos p
        JOIN pedido_itens i ON i.pedido_id=p.id
        WHERE p.usuario_id=$1 AND i.artigo_id=$2 AND p.status='PENDING' AND p.criado_em > NOW() - INTERVAL '2 hours'
        ORDER BY p.criado_em DESC LIMIT 1`, [userId, item.articleId])
      if (pending.rows[0]?.asaas_checkout_url) {
        await client.query('COMMIT')
        return { orderCode: pending.rows[0].codigo, status: pending.rows[0].status, checkoutUrl: pending.rows[0].asaas_checkout_url, reused: true }
      }
    }
    const userResult = await client.query('SELECT nome,email FROM usuarios WHERE id=$1 AND ativo', [userId])
    user = userResult.rows[0]
    if (!user) throw httpError('Usuário não encontrado.', 401)
    const orderCode = crypto.randomUUID()
    const inserted = await client.query(`INSERT INTO pedidos (codigo,chave_idempotencia,usuario_id,valor_total)
      VALUES ($1,$2,$3,$4) RETURNING id,codigo,status`, [orderCode, idempotencyKey, userId, item.price])
    order = inserted.rows[0]
    await client.query(`INSERT INTO pedido_itens
      (pedido_id,tipo,artigo_id,produto_id,produto_variante_id,descricao,quantidade,valor_unitario,detalhes)
      VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8)`, [order.id, item.type, item.articleId, item.productId, item.variantId, item.name, item.price, item.details])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }

  securityLog('order.created', { orderId: order.id, orderCode: order.codigo, userId, itemType: item.type })
  try {
    const checkout = await checkoutProvider({ orderCode: order.codigo, item, customer: { name: user.nome, email: user.email } })
    await query(`UPDATE pedidos SET asaas_checkout_id=$1,asaas_checkout_url=$2,asaas_checkout_status=$3,atualizado_em=NOW()
      WHERE id=$4`, [checkout.id, checkout.link, checkout.status, order.id])
    securityLog('checkout.created', { orderId: order.id, checkoutId: checkout.id })
    return { orderCode: order.codigo, status: 'PENDING', checkoutUrl: checkout.link, reused: false }
  } catch (error) {
    await query(`UPDATE pedidos SET status='CANCELED',cancelado_em=NOW(),atualizado_em=NOW() WHERE id=$1 AND status='PENDING'`, [order.id])
    securityLog('checkout.failed', { orderId: order.id, reason: error.message })
    throw error
  }
}

export async function getOrderForUser(orderCode, userId) {
  const { rows } = await query(`SELECT p.codigo,p.status,p.valor_total,p.moeda,p.pago_em,p.cancelado_em,p.expirado_em,
    i.tipo,i.artigo_id,i.descricao
    FROM pedidos p JOIN pedido_itens i ON i.pedido_id=p.id
    WHERE p.codigo=$1 AND p.usuario_id=$2`, [orderCode, userId])
  if (!rows[0]) throw httpError('Pedido não encontrado.', 404)
  return rows[0]
}

export async function processAsaasEvent(payload, dbPool = pool) {
  const eventId = String(payload?.id || '').trim()
  const eventType = String(payload?.event || '').trim()
  const checkoutId = String(payload?.checkout?.id || '').trim()
  if (!eventId || !eventType || !checkoutId) throw httpError('Evento Asaas inválido.', 400)
  const supported = new Set(['CHECKOUT_CREATED', 'CHECKOUT_PAID', 'CHECKOUT_CANCELED', 'CHECKOUT_EXPIRED'])
  const client = await dbPool.connect()
  let orderId = null
  let duplicate = false
  try {
    await client.query('BEGIN')
    const inserted = await client.query(`INSERT INTO asaas_webhook_eventos
      (evento_id,tipo_evento,checkout_id,payload) VALUES ($1,$2,$3,$4)
      ON CONFLICT (evento_id) DO NOTHING RETURNING id`, [eventId, eventType, checkoutId, payload])
    if (!inserted.rows[0]) {
      duplicate = true
      const previous = await client.query('SELECT pedido_id,tipo_evento FROM asaas_webhook_eventos WHERE evento_id=$1', [eventId])
      await client.query('COMMIT')
      return { duplicate: true, orderId: previous.rows[0]?.pedido_id || null, paid: previous.rows[0]?.tipo_evento === 'CHECKOUT_PAID' }
    }
    const orderResult = await client.query('SELECT id,usuario_id,status FROM pedidos WHERE asaas_checkout_id=$1 FOR UPDATE', [checkoutId])
    const order = orderResult.rows[0]
    if (!order) {
      await client.query(`UPDATE asaas_webhook_eventos SET situacao='IGNORED',processado_em=NOW(),mensagem='Pedido não encontrado' WHERE evento_id=$1`, [eventId])
      await client.query('COMMIT')
      securityLog('webhook.order_not_found', { eventId, eventType, checkoutId })
      return { duplicate: false, ignored: true, orderId: null }
    }
    orderId = order.id
    if (!supported.has(eventType)) {
      await client.query(`UPDATE asaas_webhook_eventos SET pedido_id=$2,situacao='IGNORED',processado_em=NOW(),mensagem='Evento não utilizado' WHERE evento_id=$1`, [eventId, order.id])
    } else if (eventType === 'CHECKOUT_PAID') {
      if (order.status !== 'PAID') {
        await client.query(`UPDATE pedidos SET status='PAID',asaas_checkout_status='PAID',pago_em=COALESCE(pago_em,NOW()),
          forma_pagamento=COALESCE($2,forma_pagamento),atualizado_em=NOW() WHERE id=$1`, [order.id, payload.checkout?.billingType || null])
        await client.query(`INSERT INTO acessos_artigos (usuario_id,artigo_id,pedido_id)
          SELECT $1,i.artigo_id,$2 FROM pedido_itens i WHERE i.pedido_id=$2 AND i.tipo='ARTICLE'
          ON CONFLICT (usuario_id,artigo_id) DO UPDATE SET pedido_id=EXCLUDED.pedido_id,concedido_em=NOW(),revogado_em=NULL`, [order.usuario_id, order.id])
        await client.query(`INSERT INTO pedido_notificacoes (pedido_id,tipo) VALUES
          ($1,'CUSTOMER_CONFIRMATION'),($1,'ADMIN_NEW_SALE') ON CONFLICT (pedido_id,tipo) DO NOTHING`, [order.id])
      }
      await client.query(`UPDATE asaas_webhook_eventos SET pedido_id=$2,situacao='PROCESSED',processado_em=NOW() WHERE evento_id=$1`, [eventId, order.id])
    } else if (eventType === 'CHECKOUT_CANCELED') {
      await client.query(`UPDATE pedidos SET status='CANCELED',asaas_checkout_status='CANCELED',cancelado_em=NOW(),atualizado_em=NOW()
        WHERE id=$1 AND status='PENDING'`, [order.id])
      await client.query(`UPDATE asaas_webhook_eventos SET pedido_id=$2,situacao='PROCESSED',processado_em=NOW() WHERE evento_id=$1`, [eventId, order.id])
    } else if (eventType === 'CHECKOUT_EXPIRED') {
      await client.query(`UPDATE pedidos SET status='EXPIRED',asaas_checkout_status='EXPIRED',expirado_em=NOW(),atualizado_em=NOW()
        WHERE id=$1 AND status='PENDING'`, [order.id])
      await client.query(`UPDATE asaas_webhook_eventos SET pedido_id=$2,situacao='PROCESSED',processado_em=NOW() WHERE evento_id=$1`, [eventId, order.id])
    } else {
      await client.query(`UPDATE pedidos SET asaas_checkout_status=COALESCE($2,asaas_checkout_status),atualizado_em=NOW() WHERE id=$1`, [order.id, payload.checkout?.status || 'ACTIVE'])
      await client.query(`UPDATE asaas_webhook_eventos SET pedido_id=$2,situacao='PROCESSED',processado_em=NOW() WHERE evento_id=$1`, [eventId, order.id])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
  securityLog('webhook.processed', { eventId, eventType, checkoutId, orderId, duplicate })
  return { duplicate, orderId, paid: eventType === 'CHECKOUT_PAID' }
}
