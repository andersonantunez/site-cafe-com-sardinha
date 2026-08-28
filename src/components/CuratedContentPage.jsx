import React, { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, Package } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'

const definitions = {
  achadinho: { eyebrow: 'Curadoria', title: 'Achadinhos do Café', description: 'Produtos que eu já comprei, testei e indico.', icon: Package },
  livro: { eyebrow: 'Na estante', title: 'Livros interessantes', description: 'Leituras que ajudam a pensar melhor sobre dinheiro, investimentos e vida real.', icon: BookOpen },
}

export default function CuratedContentPage({ type }) {
  const definition = definitions[type]
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/conteudos?tipo=${type}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Não foi possível carregar os conteúdos.') ; return response.json() })
      .then(items => setState({ loading: false, items, error: '' }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, items: [], error: error.message }) })
    return () => controller.abort()
  }, [type])
  const Icon = definition.icon
  return <div className="curated-page"><ChildTopbar/><section className="curated-hero"><Icon/><div><span className="eyebrow">{definition.eyebrow}</span><h1>{definition.title}</h1><p>{definition.description}</p></div></section><main className="curated-main">{state.loading ? <p className="admin-empty">Carregando conteúdos…</p> : state.error ? <p className="public-portfolio-state error">{state.error}</p> : !state.items.length ? <p className="public-portfolio-state">Nenhum conteúdo publicado no momento.</p> : <section className={`curated-grid ${type}`}>{state.items.map((item, index) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="curated-card"><div className="curated-card-image">{item.imagem_url ? <img src={item.imagem_url} alt=""/> : <Icon/>}</div><small>{type === 'livro' ? item.autor || 'Recomendação do Café' : item.categoria || 'Indicação do Café'}</small><h2>{item.titulo}</h2><p>{item.conteudo}</p>{item.preco != null && <strong>{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>}<span>{type === 'livro' ? 'Ver livro' : 'Ver indicação'} <ExternalLink size={15}/></span></a>)}</section>}</main></div>
}
