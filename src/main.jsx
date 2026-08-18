import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, BarChart3, BookOpen, Bookmark, Calculator, Dices,
  ChevronLeft, ChevronRight, ExternalLink, Mail, MessageCircle, Package,
  HeartHandshake, PenLine, Quote, Search, ShoppingBag, Sparkles, TrendingUp,
} from 'lucide-react'
import './styles.css'
import logoImage from './assets/images/logo3.png'
import coffeeImage from './assets/images/cafe-quente-caricatura.png'
import cafeProductsImage from './assets/images/produtos-cafe.png'
import quotesData from './data/frases.json'
import postsData from './data/postagens.json'
import PgblCdbSimulator from './components/PgblCdbSimulator.jsx'
import CashInstallmentSimulator from './components/CashInstallmentSimulator.jsx'
import FixedIncomeSimulator from './components/FixedIncomeSimulator.jsx'
import PerformanceHistory, { PerformanceIndicators } from './components/PerformanceHistory.jsx'
import CafeProducts from './components/CafeProducts.jsx'

const simulators = [
  { icon: BarChart3, title: 'Compare títulos de renda fixa', text: 'Coloque CDB, LCI, LCA e Tesouro lado a lado.' },
  { icon: ShoppingBag, title: 'À vista ou a prazo?', text: 'Compare o desconto à vista com o rendimento de um CDB.' },
  { icon: TrendingUp, title: 'Previdência ou CDB?', text: 'Entenda custos, impostos e resultado líquido no longo prazo.' },
  { icon: Dices, title: 'Sorteio computacional', text: 'Faça um sorteio livre de manipulação, transparente e com relatório completo do resultado.' },
]

const products = ['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4', 'Produto 5']
const articles = [
  ['Lotofácil', 'Probabilidade & estratégia'],
  ['Educação Financeira Básica', 'Fundamentos'],
  ['Problema da mochila na Renda Fixa', 'Pesquisa operacional'],
  ['Análise de dividendos', 'Mercado financeiro'],
  ['Modelo de Sorteio Computacional', 'Aleatoriedade'],
]
const books = ['Livro 1', 'Livro 2', 'Livro 3', 'Livro 4']
const fallbackPosts = postsData.postagens.filter(post => post.publico)
const cardSuits = ['♠', '♥', '♦', '♣']
const fallbackQuotes = quotesData.frases.map(({ id, texto }) => ({ id, text: texto }))
const testimonials = [
  ['Depoimento 1', '@seguidor01'], ['Depoimento 2', '@seguidor02'],
  ['Depoimento 3', '@seguidor03'], ['Depoimento 4', '@seguidor04'],
  ['Depoimento 5', '@seguidor05'],
]

function SectionTitle({ eyebrow, title, description, action }) {
  return <div className="section-heading">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {action && <a href="#" onClick={e => e.preventDefault()} className="text-link">{action}<ArrowRight size={16}/></a>}
  </div>
}

function PlaceholderLink({ children, className = '' }) {
  return <a href="#" className={className} onClick={e => e.preventDefault()}>{children}</a>
}

function App() {
  const [quotes, setQuotes] = useState(fallbackQuotes)
  const [posts, setPosts] = useState(fallbackPosts)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [visiblePostRows, setVisiblePostRows] = useState(2)
  const [postColumns, setPostColumns] = useState(() => window.innerWidth <= 600 ? 2 : window.innerWidth <= 900 ? 3 : 5)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuoteIndex(current => (current + 1) % quotes.length)
    }, 8000)
    return () => window.clearInterval(interval)
  }, [quotes.length])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch('/api/frases', { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Falha ao carregar frases')
        return response.json()
      }),
      fetch('/api/postagens', { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Falha ao carregar postagens')
        return response.json()
      }),
    ]).then(([apiQuotes, apiPosts]) => {
      if (apiQuotes.length) setQuotes(apiQuotes.map(({ id, texto }) => ({ id, text: texto })))
      setPosts(apiPosts)
      setQuoteIndex(0)
    }).catch(error => {
      if (error.name !== 'AbortError') console.info('API indisponível; usando os dados locais do site.')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const updateColumns = () => setPostColumns(window.innerWidth <= 600 ? 2 : window.innerWidth <= 900 ? 3 : 5)
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  const visiblePosts = posts.slice(0, visiblePostRows * postColumns)
  const hasMorePosts = visiblePosts.length < posts.length

  return <div className="app-shell">
    <nav className="topbar">
      <a href="#inicio" className="wordmark"><span>CS</span>Café com Sardinha</a>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <a href="#sobre">Sobre</a><a href="#simuladores">Simuladores</a><a href="/historico-rentabilidade">Histórico de Rentabilidade</a><a href="#achadinhos">Achadinhos do Café</a><a href="#conteudos">Conteúdos</a>
      </div>
      <a className="x-button" href="https://x.com/CafeComSardinha" target="_blank" rel="noreferrer">Perfil no X <ExternalLink size={15}/></a>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">{menuOpen ? '×' : '☰'}</button>
    </nav>

    <main id="inicio">
      <header className="profile-header">
        <div className="cover" />
        <div className="profile-inner">
          <img src={logoImage} alt="Logo Café com Sardinha" className="avatar" />
          <div className="profile-offset" aria-hidden="true" />
          <div className="profile-copy">
            <div>
              <h1 className="profile-name">
                <span>Café com Sardinha</span>
                <span className="profile-emojis" aria-label="Café, dois peixes e um tubarão">☕ 🐟 🐟 🦈</span>
                <svg className="verified-badge" viewBox="0 0 22 22" role="img" aria-label="Conta verificada">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              </h1>
              <p className="handle">@CafeComSardinha</p>
            </div>
            <div className="meta"><span><Sparkles size={15}/> Investidor desde 2010</span><span><PenLine size={15}/> Ideias complexas, linguagem simples</span>
              <a className="profile-contact" href="mailto:cafecomsardinha@gmail.com">
                <Mail size={17}/>
                <span className="contact-email">cafecomsardinha@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <section id="sobre" className="section about-grid">
        <div className="about-title">
          <span className="eyebrow">Apresentação</span>
          <h2>Prazer, meu codinome é Café.</h2>
          <figure className="coffee-figure"><img src={coffeeImage} alt="Xícara de café quente com vapor" /></figure>
        </div>
        <div className="about-copy">
          <p>Sou técnico em Contabilidade e Programação, formado em Web Design e Programação, com MBA em Banco de Dados Oracle e mestrado em Administração. Desenvolvo software desde os 13 anos e invisto no mercado financeiro desde 2010.</p>
          <p>Meus principais temas de interesse e atuação são Mercado Financeiro, Educação Financeira, Aleatoriedade Computacional, Estatística, Planejamento e Processos Organizacionais e Pesquisa Operacional.</p>
          <p>Tenho perfil criativo, humor ácido e boa leitura de contextos. Gosto de transformar assuntos complexos em textos claros, provocativos e acessíveis, combinando capacidade analítica com uma linguagem capaz de prender a atenção.</p>
          <div className="topic-list"><span>Mercado financeiro</span><span>Mercado imobiliário</span><span>Educação financeira</span><span>Administração</span><span>Estatística</span><span>Pesquisa operacional</span><span>Programação</span><span>Marketing</span><span>Aleatoriedade computacional</span></div>
        </div>
      </section>

      <section id="simuladores" className="section tinted">
        <SectionTitle eyebrow="Ferramentas" title="Simuladores" description="Decisões melhores começam com comparações honestas." />
        <div className="three-grid">{simulators.map(({ icon: Icon, title, text }, i) =>
          <article className="sim-card" key={title}><div className="icon-box"><Icon/></div><span className="soon">Disponível</span><h3>{title}</h3><p>{text}</p>{i === 0 ? <a className="simulator-link" href="/simulador-renda-fixa">Começar simulação <ArrowRight size={16}/></a> : i === 1 ? <a className="simulator-link" href="/simulador-avista-aprazo">Começar simulação <ArrowRight size={16}/></a> : i === 2 ? <a className="simulator-link" href="/simulador-pgbl-cdb">Começar simulação <ArrowRight size={16}/></a> : <a className="simulator-link" href="https://melhorsorteio.com.br/" target="_blank" rel="noreferrer">Acessar Melhor Sorteio <ExternalLink size={16}/></a>}</article>
        )}</div>
      </section>

      <section id="rentabilidade" className="section returns-section">
        <div className="returns-intro"><span className="eyebrow">Transparência</span><h2>Histórico de Rentabilidade</h2><p>Resultados anuais consolidados, desempenho em relação ao CDI e evolução acumulada da carteira.</p><a className="simulator-link history-link" href="/historico-rentabilidade">Ver histórico completo <ArrowRight size={16}/></a></div>
        <PerformanceIndicators/>
      </section>

      <section id="achadinhos" className="section tinted">
        <div className="curation-block">
          <SectionTitle eyebrow="Curadoria" title="Achadinhos do Café" description="Produtos que eu já comprei, testei e indico." action="Ver todos" />
          <div className="product-grid">{products.map((name, i) => <PlaceholderLink key={name} className="product-card"><div className="product-visual"><Package size={34}/><span>0{i+1}</span></div><small>Indicação do Café</small><h3>{name}</h3><span className="amazon-link">Ver na Amazon <ExternalLink size={14}/></span></PlaceholderLink>)}</div>
        </div>
        <div className="brand-products">
          <div className="brand-products-heading"><div><span className="eyebrow">Nossa marca</span><h2><a href="/produtos-do-cafe">Produtos do Café</a></h2><p>Canecas, bonés, camisetas e moletons com a identidade Café com Sardinha.</p></div><div className="charity-seal"><HeartHandshake size={28}/><span><strong>Lucro 100% solidário</strong>Todo o lucro será revertido para instituições de caridade.</span></div></div>
          <a className="brand-products-showcase" href="/produtos-do-cafe"><img src={cafeProductsImage} alt="Coleção de canecas, bonés, camisetas e moletons Café com Sardinha" /></a>
          <div className="brand-products-footer"><p>Vista a marca. Espalhe a ideia. Ajude quem precisa.</p><a className="soon product-launch" href="/produtos-do-cafe">Conhecer coleção</a></div>
        </div>
      </section>

      <section id="conteudos" className="section content-split">
        <div>
          <SectionTitle eyebrow="Leitura aprofundada" title="Artigos interessantes" />
          <div className="article-list">{articles.map(([title, type], i) => <PlaceholderLink className="article-row" key={title}><span className="number">0{i+1}</span><div><small>{type}</small><h3>{title}</h3></div><span className="paid">Pago</span><ArrowRight size={18}/></PlaceholderLink>)}</div>
        </div>
        <aside className="books-panel">
          <SectionTitle eyebrow="Na estante" title="Livros interessantes" />
          <div className="book-list">{books.map((book, i) => <PlaceholderLink key={book} className="book-row"><div className={`book-cover color-${i}`}><BookOpen size={20}/></div><div><small>Recomendação #{i+1}</small><h3>{book}</h3></div><ExternalLink size={16}/></PlaceholderLink>)}</div>
        </aside>
      </section>

      <section className="quote-band">
        <div className="quote-art"><Quote/></div>
        <div className="quote-content"><span className="eyebrow">Frases interessantes</span><blockquote>“{quotes[quoteIndex].text}”</blockquote><p>— Café com Sardinha</p></div>
        <div className="quote-controls"><button onClick={() => setQuoteIndex((quoteIndex - 1 + quotes.length) % quotes.length)} aria-label="Frase anterior"><ChevronLeft/></button><span>{quoteIndex + 1} / {quotes.length}</span><button onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)} aria-label="Próxima frase"><ChevronRight/></button></div>
      </section>

      <section className="section posts-section">
        <SectionTitle eyebrow="Do feed" title="Postagens interessantes" description="Uma seleção de ideias que vale salvar para ler de novo." action="Acompanhar no X" />
        <div className="post-grid">{visiblePosts.map((post, index) => {
          const suit = cardSuits[index % cardSuits.length]
          const redSuit = suit === '♥' || suit === '♦'
          return <a className={`post-card playing-card ${redSuit ? 'red-suit' : 'blue-suit'}`} href={post.url} target="_blank" rel="noreferrer" key={post.id} aria-label={`Abrir postagem ${post.id} no X`}>
            <span className="card-corner card-corner-top"><b>{String(post.id).padStart(2, '0')}</b><i>{suit}</i></span>
            <div className="card-center"><span className="card-suit">{suit}</span><strong className="post-title">{post.titulo}</strong><small>Café com Sardinha</small></div>
            <div className="post-footer"><span><MessageCircle size={15}/> Ver no X</span><ExternalLink size={15}/></div>
            <span className="card-corner card-corner-bottom"><b>{String(post.id).padStart(2, '0')}</b><i>{suit}</i></span>
          </a>
        })}</div>
        {hasMorePosts && <div className="posts-more"><button type="button" onClick={() => setVisiblePostRows(rows => rows + 2)}>Mostrar mais postagens <ChevronRight size={18}/></button><small>{visiblePosts.length} de {posts.length} postagens</small></div>}
      </section>

      <section className="section tinted">
        <SectionTitle eyebrow="O que dizem" title="Depoimentos sobre o perfil" />
        <div className="testimonial-grid">{testimonials.map(([text, user], i) => <article className="testimonial" key={user}><Quote size={24}/><p>“{text}”</p><div><span className="person">{user.slice(1, 3).toUpperCase()}</span><div><b>Leitor do Café</b><small>{user}</small></div></div></article>)}</div>
      </section>

    </main>

    <footer>
      <div className="footer-cta"><div><span className="eyebrow">Vamos conversar?</span><h2>Publicidade e Projetos.</h2><p>Entre em contato para parcerias, publicidade e dúvidas.</p></div><a href="mailto:cafecomsardinha@gmail.com" className="button primary"><Mail size={18}/> cafecomsardinha@gmail.com</a></div>
      <div className="footer-bottom"><a href="#inicio" className="wordmark"><span>CS</span>Café com Sardinha</a><p>Conteúdo educacional. Não é recomendação de investimento.</p><span>© 2026 Café com Sardinha</span></div>
    </footer>
  </div>
}

const pages = {'/simulador-pgbl-cdb':<PgblCdbSimulator/>, '/simulador-avista-aprazo':<CashInstallmentSimulator/>, '/simulador-renda-fixa':<FixedIncomeSimulator/>, '/historico-rentabilidade':<PerformanceHistory/>, '/produtos-do-cafe':<CafeProducts/>}
const page = pages[window.location.pathname] || <App/>
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
