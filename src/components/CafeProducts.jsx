import React, { useState } from 'react'
import { ArrowLeft, Coffee, HeartHandshake, Mail, Shirt, Sparkles } from 'lucide-react'
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

const products = [
  {
    id: 'canecas', name: 'Canecas', icon: Coffee, count: '4 cores',
    description: 'Cerâmica com a identidade Café com Sardinha para acompanhar suas melhores conversas.',
    colors: [['Marrom', '#493326', mugBrown], ['Laranja', '#d77b20', mugOrange], ['Azul-claro', '#72a9c2', mugLightBlue], ['Azul-marinho', '#173d65', mugNavy]], sizes: ['Único'],
  },
  {
    id: 'bones', name: 'Bonés', icon: Sparkles, count: '2 cores',
    description: 'Modelo casual com logo frontal bordado e ajuste traseiro.',
    colors: [['Marrom', '#4a3325', capBrown], ['Azul-marinho', '#142f50', capNavy]], sizes: ['Ajustável'],
  },
  {
    id: 'moletons', name: 'Moletons', icon: Shirt, count: '2 cores',
    description: 'Moletom com capuz, bolso canguru e estampa frontal da marca.',
    colors: [['Marrom', '#3b2b21', hoodieBrown], ['Azul-marinho', '#152e4d', hoodieNavy]], sizes: ['P', 'M', 'G', 'GG', 'XGG'],
  },
  {
    id: 'camisetas', name: 'Camisetas', icon: Shirt, count: '3 cores',
    description: 'Camiseta de corte confortável com estampa frontal Café com Sardinha.',
    colors: [['Marrom', '#3c2d25', shirtBrown], ['Azul', '#315d83', shirtBlue], ['Laranja', '#d56e25', shirtOrange]], sizes: ['P', 'M', 'G', 'GG', 'XGG'],
  },
]

function ProductCard({ product }) {
  const [color, setColor] = useState(product.colors[0][0])
  const [size, setSize] = useState(product.sizes[0])
  const Icon = product.icon
  const selectedVariant = product.colors.find(([name]) => name === color) || product.colors[0]
  const subject = encodeURIComponent(`Interesse em ${product.name} Café com Sardinha`)
  const body = encodeURIComponent(`Olá! Tenho interesse em ${product.name}, cor ${color}, tamanho ${size}. Gostaria de receber novidades sobre disponibilidade.`)

  return <article className="coffee-product-card">
    <div className={`coffee-product-picture ${product.id}`}><img className="coffee-product-mockup" key={selectedVariant[0]} src={selectedVariant[2]} alt={`${product.name} Café com Sardinha na cor ${selectedVariant[0]}`}/><span>{product.count}</span></div>
    <div className="coffee-product-body">
      <div className="coffee-product-title"><Icon/><div><small>Coleção Café com Sardinha</small><h2>{product.name}</h2></div></div>
      <p>{product.description}</p>
      <fieldset><legend>Cor: <strong>{color}</strong></legend><div className="color-options">{product.colors.map(([name, value]) => <button key={name} className={color === name ? 'selected' : ''} type="button" title={name} aria-label={`Selecionar cor ${name}`} aria-pressed={color === name} onClick={() => setColor(name)} style={{ '--swatch': value }}/>)}</div></fieldset>
      <fieldset><legend>Tamanho: <strong>{size}</strong></legend><div className="size-options">{product.sizes.map(value => <button key={value} className={size === value ? 'selected' : ''} type="button" aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>)}</div></fieldset>
      <a className="coffee-product-interest" href={`mailto:cafecomsardinha@gmail.com?subject=${subject}&body=${body}`}><Mail/>Tenho interesse</a>
    </div>
  </article>
}

export default function CafeProducts() {
  return <div className="coffee-products-page">
    <header className="coffee-products-topbar"><a href="/"><ArrowLeft/> Voltar ao site</a><strong><span>CS</span>Café com Sardinha</strong></header>
    <section className="coffee-products-hero"><div><span className="eyebrow">Produtos do Café</span><h1>Vista a marca.<br/><em>Espalhe a ideia.</em></h1><p>Uma coleção criada para quem gosta de finanças sem economês, café quente e boas conversas.</p></div><img src={heroProductsImage} alt="Ilustração de camiseta, boné e caneca Café com Sardinha"/></section>
    <main className="coffee-products-main">
      <section className="coffee-products-intro"><div><span className="eyebrow">A coleção</span><h2>Escolha seu favorito</h2><p>Confira as cores apresentadas na coleção e selecione o tamanho desejado.</p></div><div className="coffee-products-charity"><HeartHandshake/><div><strong>Lucro 100% solidário</strong><span>Todo o lucro será destinado a instituições de caridade.</span></div></div></section>
      <section className="coffee-products-grid" aria-label="Produtos disponíveis">{products.map(product => <ProductCard product={product} key={product.id}/>)}</section>
      <section className="coffee-products-note"><Sparkles/><div><strong>Vitrine em preparação</strong><p>Preços, estoque e condições de envio serão divulgados no lançamento. Use “Tenho interesse” para falar conosco.</p></div></section>
    </main>
  </div>
}
