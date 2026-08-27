import React, { useEffect, useState } from 'react'
import coffeeImage from '../assets/images/cafe-quente-caricatura.png'
import ChildTopbar from './ChildTopbar.jsx'

export default function AboutPage() {
  const [content, setContent] = useState(null)
  useEffect(() => { fetch('/api/conteudos?tipo=sobre').then(r => r.ok ? r.json() : []).then(items => setContent(items[0] || null)).catch(() => {}) }, [])
  const paragraphs = content?.conteudo ? content.conteudo.split(/\n\s*\n/).filter(Boolean) : []
  return <div className="about-page"><ChildTopbar/>
    <main className="section about-grid"><div className="about-title"><span className="eyebrow">Apresentação</span><h1>{content?.titulo || 'Prazer, meu codinome é Café.'}</h1><figure className="coffee-figure"><img src={coffeeImage} alt="Xícara de café quente com vapor"/></figure></div><div className="about-copy">{content?.subtitulo && <h2>{content.subtitulo}</h2>}{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></main>
  </div>
}
