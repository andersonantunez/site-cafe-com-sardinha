import { config } from '../config/index.js'

export class AsaasError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'AsaasError'
    this.status = status
  }
}

export function buildCheckoutPayload({ orderCode, item }) {
  return {
    billingTypes: ['PIX', 'CREDIT_CARD'],
    chargeTypes: ['DETACHED'],
    minutesToExpire: 60,
    externalReference: orderCode,
    callback: {
      successUrl: `${config.appUrl}/compra/sucesso?pedido=${encodeURIComponent(orderCode)}`,
      cancelUrl: `${config.appUrl}/compra/cancelada?pedido=${encodeURIComponent(orderCode)}`,
      expiredUrl: `${config.appUrl}/compra/expirada?pedido=${encodeURIComponent(orderCode)}`,
    },
    items: [{
      externalReference: `${item.type}:${item.referenceId}`,
      name: item.name.slice(0, 100),
      description: item.description.slice(0, 255),
      quantity: 1,
      value: Number(item.price),
    }],
  }
}

export async function createAsaasCheckout(input, fetchImpl = fetch) {
  if (!config.asaas.apiKey) throw new AsaasError('Checkout temporariamente indisponível: Asaas não configurado.', 503)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetchImpl(`${config.asaas.apiUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        access_token: config.asaas.apiKey,
        'User-Agent': config.asaas.userAgent,
      },
      body: JSON.stringify(buildCheckoutPayload(input)),
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.id || !body.link) {
      const providerMessage = Array.isArray(body.errors) ? body.errors.map(error => error.description).filter(Boolean).join('; ') : ''
      throw new AsaasError(providerMessage || 'Não foi possível iniciar o pagamento no Asaas.')
    }
    return { id: String(body.id), link: String(body.link), status: String(body.status || 'ACTIVE') }
  } catch (error) {
    if (error instanceof AsaasError) throw error
    throw new AsaasError(error.name === 'AbortError' ? 'O Asaas demorou para responder. Tente novamente.' : 'Não foi possível conectar ao Asaas.')
  } finally {
    clearTimeout(timeout)
  }
}
