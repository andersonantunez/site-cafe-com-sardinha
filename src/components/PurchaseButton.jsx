import React, { useRef, useState } from 'react'
import { CreditCard, LockKeyhole } from 'lucide-react'
import { apiRequest, TOKEN_KEY } from '../lib/api.js'

export const PENDING_CHECKOUT_KEY = 'cafe_sardinha_pending_checkout'

export async function startCheckout(itemType, itemId, idempotencyKey = crypto.randomUUID()) {
  return apiRequest('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ itemType, itemId, idempotencyKey }),
  })
}

export default function PurchaseButton({ itemType, itemId, children = 'Comprar', disabled = false }) {
  const [state, setState] = useState({ loading: false, message: '' })
  const idempotencyKey = useRef(crypto.randomUUID())
  const purchase = async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ itemType, itemId, idempotencyKey: crypto.randomUUID() }))
      window.location.assign(`/minha-area-restrita?returnTo=${encodeURIComponent('/compra/continuar')}`)
      return
    }
    setState({ loading: true, message: 'Processando…' })
    try {
      const result = await startCheckout(itemType, itemId, idempotencyKey.current)
      setState({ loading: true, message: 'Redirecionando para o pagamento…' })
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      idempotencyKey.current = crypto.randomUUID()
      setState({ loading: false, message: error.message })
    }
  }
  return <div className="purchase-action"><button type="button" className="purchase-button" disabled={disabled || state.loading} onClick={purchase}>{itemType === 'ARTICLE' ? <LockKeyhole/> : <CreditCard/>}{state.loading ? state.message : children}</button>{state.message && !state.loading && <small role="alert">{state.message}</small>}</div>
}
