import React, { useEffect, useState } from 'react'
import { CalendarClock, Coffee, Link as LinkIcon, ShieldCheck } from 'lucide-react'
import PortfolioDetails from './PortfolioDetails.jsx'
import ChildTopbar from './ChildTopbar.jsx'

const updatedLabel = value => {
  if (!value) return null
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('pt-BR').format(date)
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  return `${day} às ${time}`
}

function usePublicPortfolio(endpoint) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    fetch(endpoint, { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a carteira pública.')
        setState({ loading: false, data, error: '' })
      }).catch(error => {
        if (error.name !== 'AbortError') setState({ loading: false, data: null, error: error.message })
      })
    return () => controller.abort()
  }, [endpoint])
  return state
}

function PublicPortfolioContent({ state, emptyMessage }) {
  if (state.loading) return <div className="public-portfolio-state">Carregando carteira…</div>
  if (state.error) return <div className="public-portfolio-state error">{state.error}</div>
  if (!state.data?.assets?.length) return <div className="public-portfolio-state">{emptyMessage}</div>
  return <>
    {state.data.updatedAt && <p className="portfolio-updated"><CalendarClock/> Dados atualizados em {updatedLabel(state.data.updatedAt)}</p>}
    <PortfolioDetails assets={state.data.assets} visibility={state.data.visibility} title={state.data.portfolioName || 'Carteira pública'} initiallyVisible showImage={false} description="Os dados abaixo foram filtrados pela API conforme as preferências de publicação do proprietário."/>
    <p className="public-readonly"><ShieldCheck/> Esta página é somente leitura e não revela dados de acesso do proprietário.</p>
  </>
}

export function AdminPortfolioBlock({ compact = false }) {
  const state = usePublicPortfolio('/api/carteira-publica/admin')
  if (state.loading || state.error || !state.data?.configured || !state.data.assets?.length) return null
  return <section className={compact ? 'admin-portfolio-block compact' : 'admin-portfolio-block'}><PublicPortfolioContent state={state} emptyMessage=""/></section>
}

export function CafePublicPortfolio() {
  const state = usePublicPortfolio('/api/carteira-publica/admin')
  return <div className="public-portfolio-page">
    <ChildTopbar/>
    <section className="public-portfolio-hero"><div><span className="eyebrow">Transparência</span><h1>Carteira pública do Café</h1><p>A posição atual autorizada pelo Café com Sardinha, consolidada diretamente da conta definida nas configurações do sistema.</p></div><Coffee/></section>
    <main className="public-portfolio-main"><PublicPortfolioContent state={state} emptyMessage="A carteira pública ainda não possui títulos disponíveis."/></main>
  </div>
}

export default function PublicPortfolio() {
  const token = decodeURIComponent(window.location.pathname.split('/').filter(Boolean).at(-1) || '')
  const state = usePublicPortfolio(`/api/carteira-publica/${encodeURIComponent(token)}`)
  return <div className="public-portfolio-page">
    <ChildTopbar/>
    <section className="public-portfolio-hero"><div><span className="eyebrow">Link público</span><h1>{state.data?.portfolioName || 'Carteira compartilhada'}</h1><p>Visualização somente leitura, com os campos autorizados pelo proprietário.</p></div><LinkIcon/></section>
    <main className="public-portfolio-main"><PublicPortfolioContent state={state} emptyMessage="Esta carteira não possui títulos para exibir."/></main>
  </div>
}
