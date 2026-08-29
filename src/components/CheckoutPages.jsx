import React, { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'
import { apiRequest, TOKEN_KEY } from '../lib/api.js'
import { PENDING_CHECKOUT_KEY, startCheckout } from './PurchaseButton.jsx'

export function ContinuePurchasePage() {
  const [message, setMessage] = useState('Preparando seu pagamento…')
  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY)
    if (!raw) { setMessage('Nenhuma compra pendente foi encontrada.'); return }
    let pending
    try { pending = JSON.parse(raw) } catch { setMessage('Não foi possível recuperar a compra.'); return }
    startCheckout(pending.itemType, pending.itemId, pending.idempotencyKey).then(result => {
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY)
      setMessage('Redirecionando para o pagamento seguro…')
      window.location.assign(result.checkoutUrl)
    }).catch(error => setMessage(error.message))
  }, [])
  return <div className="checkout-page"><ChildTopbar/><main><CreditCard/><h1>Continuando sua compra</h1><p>{message}</p><a href="/">Voltar ao site</a></main></div>
}

const definitions = {
  success: { icon: Clock3, title: 'Pagamento recebido para processamento', message: 'Estamos aguardando a confirmação financeira do Asaas. O acesso será liberado automaticamente pelo webhook, sem depender desta página.' },
  canceled: { icon: XCircle, title: 'Compra cancelada', message: 'O checkout foi cancelado e nenhum acesso foi liberado.' },
  expired: { icon: Clock3, title: 'Checkout expirado', message: 'O prazo do checkout terminou. Você pode iniciar uma nova compra quando quiser.' },
}

export function CheckoutReturnPage({ kind }) {
  const definition = definitions[kind]
  const Icon = definition.icon
  const [order, setOrder] = useState(null)
  const code = new URLSearchParams(window.location.search).get('pedido')
  useEffect(() => {
    if (!code || !localStorage.getItem(TOKEN_KEY)) return
    let active = true
    const check = () => apiRequest(`/api/checkout/pedidos/${encodeURIComponent(code)}`).then(data => {
      if (active) setOrder(data)
    }).catch(() => {})
    check()
    const timer = kind === 'success' ? setInterval(check, 3000) : null
    return () => { active = false; if (timer) clearInterval(timer) }
  }, [code, kind])
  const paid = order?.status === 'PAID'
  return <div className={`checkout-page ${kind}`}><ChildTopbar/><main>{paid ? <CheckCircle2/> : <Icon/>}<h1>{paid ? 'Pagamento confirmado' : definition.title}</h1><p>{paid ? 'A confirmação chegou pelo webhook do Asaas e os benefícios da compra já foram liberados na sua conta.' : definition.message}</p>{order && <dl><div><dt>Pedido</dt><dd>{order.codigo}</dd></div><div><dt>Status</dt><dd>{order.status}</dd></div></dl>}{paid && order.tipo === 'ARTICLE' ? <a href={`/artigos-interessantes?artigo=${order.artigo_id}`}>Acessar artigo</a> : <a href="/minha-conta/compras">Ver minhas compras</a>}</main></div>
}
