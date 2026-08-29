import React, { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, FileText, LockKeyhole, PackageSearch, UnlockKeyhole } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'
import PurchaseButton from './PurchaseButton.jsx'
import { apiRequest, TOKEN_KEY } from '../lib/api.js'

const definitions = {
  achadinho: { eyebrow: 'Curadoria', title: 'Achadinhos do Café', description: 'Produtos que eu já comprei, testei e indico.', icon: PackageSearch },
  livro: { eyebrow: 'Na estante', title: 'Livros interessantes', description: 'Leituras que ajudam a pensar melhor sobre dinheiro, investimentos e vida real.', icon: BookOpen },
  artigo: { eyebrow: 'Leitura aprofundada', title: 'Artigos interessantes', description: 'Conteúdos exclusivos para aprofundar ideias importantes, com acesso protegido pela sua conta.', icon: FileText },
}
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ProtectedArticleButton({ article }) {
  const [error, setError] = useState('')
  const open = async () => {
    setError('')
    const response = await fetch(article.conteudo_url, { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}` } })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error || data.erro || 'Não foi possível abrir o artigo.')
      return
    }
    const objectUrl = URL.createObjectURL(await response.blob())
    window.open(objectUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }
  return <div className="protected-article-action"><button type="button" className="curated-article-link" onClick={open}><UnlockKeyhole/> Acessar artigo <ExternalLink size={14}/></button>{error && <small role="alert">{error}</small>}</div>
}

export default function CuratedContentPage({ type }) {
  const definition = definitions[type]
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const selectedId = Number(new URLSearchParams(window.location.search).get('artigo'))
  useEffect(() => {
    const controller = new AbortController()
    const load = type === 'artigo'
      ? apiRequest('/api/artigos', { signal: controller.signal })
      : fetch(`/api/conteudos?tipo=${type}`, { signal: controller.signal }).then(response => {
          if (!response.ok) throw new Error('Não foi possível carregar os conteúdos.')
          return response.json()
        })
    load.then(items => setState({ loading: false, items, error: '' }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, items: [], error: error.message }) })
    return () => controller.abort()
  }, [type])
  const Icon = definition.icon
  return <div className="curated-page">
    <ChildTopbar/>
    <section className={`curated-hero ${type}`}>
      {type !== 'achadinho' && <Icon/>}
      <div><span className="eyebrow">{definition.eyebrow}</span><h1>{definition.title}</h1><p>{definition.description}</p></div>
      {type === 'achadinho' && <Icon/>}
    </section>
    <main className="curated-main">
      {state.loading ? <p className="admin-empty">Carregando conteúdos…</p>
        : state.error ? <p className="public-portfolio-state error">{state.error}</p>
        : !state.items.length ? <p className="public-portfolio-state">Nenhum conteúdo publicado no momento.</p>
        : <section className={`curated-grid ${type}`}>{state.items.map(item => <article key={item.id} className={`curated-card ${selectedId === Number(item.id) ? 'selected' : ''}`}>
            <div className="curated-card-image">{item.imagem_url ? <img src={item.imagem_url} alt=""/> : <Icon/>}{type === 'artigo' && <span className="paid-content-badge"><LockKeyhole/> Conteúdo exclusivo</span>}</div>
            <small>{type === 'livro' ? item.autor || 'Recomendação do Café' : type === 'artigo' ? 'Artigo completo — conteúdo pago' : item.categoria || 'Indicação do Café'}</small>
            <h2>{item.titulo}</h2>
            <p>{type === 'artigo' ? item.resumo : item.conteudo}</p>
            {type === 'artigo' ? <div className="paid-article-actions">
              {item.preco != null && Number(item.preco) > 0 ? <strong>{money(item.preco)}</strong> : <strong className="price-pending">Preço em configuração</strong>}
              {item.tem_acesso && item.conteudo_url ? <ProtectedArticleButton article={item}/> : <PurchaseButton itemType="ARTICLE" itemId={Number(item.id)} disabled={item.preco == null || Number(item.preco) <= 0}>Comprar acesso</PurchaseButton>}
            </div> : <div className="curated-store-links">{(item.links || []).map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.id}><span>{link.loja}</span>{link.preco != null && <strong>{money(link.preco)}</strong>}<ExternalLink size={14}/></a>)}</div>}
          </article>)}</section>}
    </main>
  </div>
}
