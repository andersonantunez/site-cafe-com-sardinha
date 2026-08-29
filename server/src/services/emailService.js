import nodemailer from 'nodemailer'
import { config } from '../config/index.js'
import { query } from '../config/database.js'
import { securityLog } from './securityLog.js'

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = value => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))

let transporter
function mailer() {
  if (!config.smtp.user || !config.smtp.password) {
    const error = new Error('Envio de e-mail não configurado.')
    error.status = 503
    throw error
  }
  transporter ||= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.password },
  })
  return transporter
}

export async function sendContactMessage({ name, email, subject, message }) {
  return mailer().sendMail({
    from: `Café com Sardinha <${config.smtp.user}>`,
    to: config.smtp.user,
    replyTo: email,
    subject: 'Nova mensagem pelo Café com Sardinha',
    text: `Nome: ${name}\nE-mail: ${email}\nAssunto: ${subject}\n\n${message}`,
    html: `<h2>Nova mensagem pelo Café com Sardinha</h2><p><strong>Nome:</strong> ${escapeHtml(name)}</p><p><strong>E-mail:</strong> ${escapeHtml(email)}</p><p><strong>Assunto:</strong> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
  })
}

export async function sendPurchaseConfirmation(order) {
  const articleLink = order.tipo === 'ARTICLE' ? `${config.appUrl}/artigos-interessantes?artigo=${order.artigo_id}` : ''
  return mailer().sendMail({
    from: `Café com Sardinha <${config.smtp.user}>`, to: order.email,
    subject: 'Compra confirmada — Café com Sardinha',
    text: `Olá, ${order.nome}.\n\nPedido: ${order.codigo}\nItem: ${order.descricao}\nValor: ${money(order.valor_total)}\nData: ${dateTime(order.pago_em)}\nSituação: pagamento confirmado.${articleLink ? `\n\nO artigo está disponível na sua conta: ${articleLink}` : ''}`,
    html: `<h2>Compra confirmada</h2><p>Olá, ${escapeHtml(order.nome)}.</p><p><strong>Pedido:</strong> ${escapeHtml(order.codigo)}<br><strong>Item:</strong> ${escapeHtml(order.descricao)}<br><strong>Valor:</strong> ${money(order.valor_total)}<br><strong>Data:</strong> ${dateTime(order.pago_em)}<br><strong>Situação:</strong> pagamento confirmado.</p>${articleLink ? `<p>O conteúdo já está disponível na sua conta.</p><p><a href="${articleLink}">Acessar artigo</a></p>` : ''}`,
  })
}

export async function sendNewSaleNotification(order) {
  return mailer().sendMail({
    from: `Café com Sardinha <${config.smtp.user}>`, to: config.smtp.user,
    subject: 'Nova venda — Café com Sardinha',
    text: `Cliente: ${order.nome}\nE-mail: ${order.email}\nPedido: ${order.codigo}\nItem: ${order.descricao}\nTipo: ${order.tipo}\nValor: ${money(order.valor_total)}\nForma de pagamento: ${order.forma_pagamento || 'Asaas Checkout'}\nData: ${dateTime(order.pago_em)}`,
  })
}

export async function deliverOrderNotifications(orderId) {
  const { rows } = await query(`SELECT p.id,p.codigo,p.valor_total,p.forma_pagamento,p.pago_em,u.nome,u.email,
    i.tipo,i.artigo_id,i.descricao FROM pedidos p JOIN usuarios u ON u.id=p.usuario_id
    JOIN pedido_itens i ON i.pedido_id=p.id WHERE p.id=$1 AND p.status='PAID'`, [orderId])
  const order = rows[0]
  if (!order) return
  const deliveries = [
    ['CUSTOMER_CONFIRMATION', sendPurchaseConfirmation],
    ['ADMIN_NEW_SALE', sendNewSaleNotification],
  ]
  for (const [type, sender] of deliveries) {
    const claimed = await query(`UPDATE pedido_notificacoes SET status='PROCESSING',tentativas=tentativas+1,atualizado_em=NOW()
      WHERE pedido_id=$1 AND tipo=$2 AND status IN ('PENDING','FAILED') AND tentativas < 5 RETURNING id`, [orderId, type])
    if (!claimed.rows[0]) continue
    try {
      await sender(order)
      await query(`UPDATE pedido_notificacoes SET status='SENT',enviado_em=NOW(),ultimo_erro=NULL,atualizado_em=NOW() WHERE id=$1`, [claimed.rows[0].id])
      securityLog('email.sent', { orderId, type })
    } catch (error) {
      await query(`UPDATE pedido_notificacoes SET status='FAILED',ultimo_erro=$2,atualizado_em=NOW() WHERE id=$1`, [claimed.rows[0].id, String(error.message).slice(0, 500)])
      securityLog('email.failed', { orderId, type, reason: error.message })
    }
  }
}
