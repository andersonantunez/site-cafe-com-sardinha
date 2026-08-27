import React, { useEffect, useMemo, useState } from 'react'
import { Coffee, HeartHandshake, Mail, Shirt, Sparkles } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'
import heroProductsImage from '../assets/images/produtos-cafe-hero.svg'
import mugBrown from '../assets/images/products/caneca-marrom.png'
import mugOrange from '../assets/images/products/caneca-laranja.png'
import mugLightBlue from '../assets/images/products/caneca-azul-claro.png'
import mugNavy from '../assets/images/products/caneca-azul-marinho.png'
import capBrown from '../assets/images/products/bone-marrom.png'
import capNavy from '../assets/images/products/bone-azul-marinho.png'
import hoodieBrown from '../assets/images/products/moletom-marrom.png'
import hoodieNavy from '../assets/images/products/moletom-azul-marinho.png'
import shirtBrown from '../assets/images/products/camiseta-marrom.png'
import shirtBlue from '../assets/images/products/camiseta-azul.png'
import shirtOrange from '../assets/images/products/camiseta-laranja.png'

const icons = { coffee: Coffee, sparkles: Sparkles, shirt: Shirt }
const bundledImages = { '/src/assets/images/products/caneca-marrom.png': mugBrown, '/src/assets/images/products/caneca-laranja.png': mugOrange, '/src/assets/images/products/caneca-azul-claro.png': mugLightBlue, '/src/assets/images/products/caneca-azul-marinho.png': mugNavy, '/src/assets/images/products/bone-marrom.png': capBrown, '/src/assets/images/products/bone-azul-marinho.png': capNavy, '/src/assets/images/products/moletom-marrom.png': hoodieBrown, '/src/assets/images/products/moletom-azul-marinho.png': hoodieNavy, '/src/assets/images/products/camiseta-marrom.png': shirtBrown, '/src/assets/images/products/camiseta-azul.png': shirtBlue, '/src/assets/images/products/camiseta-laranja.png': shirtOrange }

function ProductCard({ product }) {
  const colors = useMemo(() => [...new Map(product.variantes.map(item => [item.corNome, item])).values()], [product])
  const sizes = useMemo(() => [...new Set(product.variantes.map(item => item.tamanho).filter(Boolean))], [product])
  const [color, setColor] = useState(colors[0]?.corNome || '')
  const [size, setSize] = useState(sizes[0] || '')
  const matching = product.variantes.find(item => item.corNome === color && (!size || item.tamanho === size)) || product.variantes.find(item => item.corNome === color) || product.variantes[0]
  const Icon = icons[product.icone] || Shirt
  const displayedPrice = matching?.preco ?? product.preco
  return <article className="coffee-product-card">
    <div className={`coffee-product-picture ${product.slug}`}><img className="coffee-product-mockup" src={bundledImages[matching?.imagemUrl] || matching?.imagemUrl} alt={`${product.nome} Café com Sardinha na cor ${color}`}/><span>{colors.length} {colors.length === 1 ? 'cor' : 'cores'}</span></div>
    <div className="coffee-product-body"><div className="coffee-product-title"><Icon/><div><small>Coleção Café com Sardinha</small><h2>{product.nome}</h2></div></div><p>{product.descricao}</p>
      {displayedPrice != null && <strong className="coffee-product-price">{Number(displayedPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>}
      <fieldset><legend>Cor: <strong>{color}</strong></legend><div className="color-options">{colors.map(item => <button key={item.corNome} className={color === item.corNome ? 'selected' : ''} type="button" title={item.corNome} aria-label={`Selecionar cor ${item.corNome}`} aria-pressed={color === item.corNome} onClick={() => setColor(item.corNome)} style={{ '--swatch': item.corHex }}/>)}</div></fieldset>
      {sizes.length > 0 && <fieldset><legend>Tamanho: <strong>{size}</strong></legend><div className="size-options">{sizes.map(value => <button key={value} className={size === value ? 'selected' : ''} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>)}</div></fieldset>}
      <a className="coffee-product-interest" href={`/contato?assunto=${encodeURIComponent(`Interesse em ${product.nome} — ${color}${size ? ` — ${size}` : ''}`)}`}><Mail/>Tenho interesse</a>
    </div>
  </article>
}

export default function CafeProducts() {
  const [state, setState] = useState({ loading: true, products: [], error: '' })
  useEffect(() => { fetch('/api/conteudos/produtos-cafe').then(response => { if (!response.ok) throw new Error('Não foi possível carregar a loja.'); return response.json() }).then(products => setState({ loading: false, products, error: '' })).catch(error => setState({ loading: false, products: [], error: error.message })) }, [])
  return <div className="coffee-products-page"><ChildTopbar className="coffee-products-topbar"/><section className="coffee-products-hero"><div><span className="eyebrow">Produtos do Café</span><h1>Vista a marca. <em>Espalhe a ideia.</em></h1><p>Uma coleção criada para quem gosta de finanças sem economês, café quente e boas conversas.</p></div><img src={heroProductsImage} alt="Ilustração minimalista de chapéu, camiseta e caneca Café com Sardinha"/></section><main className="coffee-products-main"><section className="coffee-products-intro"><div><span className="eyebrow">A coleção</span><h2>Escolha seu favorito</h2><p>Confira cores, tamanhos e valores cadastrados na loja.</p></div><div className="coffee-products-charity"><HeartHandshake/><div><strong>Lucro 100% solidário</strong><span>Todo o lucro será destinado a instituições de caridade.</span></div></div></section>{state.loading ? <p className="admin-empty">Carregando produtos…</p> : state.error ? <p className="public-portfolio-state error">{state.error}</p> : <section className="coffee-products-grid" aria-label="Produtos disponíveis">{state.products.map(product => <ProductCard product={product} key={product.id}/>)}</section>}</main></div>
}
