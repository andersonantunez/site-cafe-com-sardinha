import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, BarChart3, BookOpen, Bookmark, Calculator, Dices,
  ChevronLeft, ChevronRight, ExternalLink, Mail, MessageCircle, PackageSearch,
  HeartHandshake, LogIn, Quote, Search, ShoppingBag, Sparkles, TrendingUp,
} from 'lucide-react'
import './styles.css'
import logoImage from './assets/images/logo3.png'
import cafeProductsImage from './assets/images/produtos-cafe.png'
import publicPortfolioImage from './assets/images/carteira-publica-cafe.png'
import PgblCdbSimulator from './components/PgblCdbSimulator.jsx'
import CashInstallmentSimulator from './components/CashInstallmentSimulator.jsx'
import FixedIncomeSimulator from './components/FixedIncomeSimulator.jsx'
import PerformanceHistory, { PerformanceIndicators } from './components/PerformanceHistory.jsx'
import CafeProducts from './components/CafeProducts.jsx'
import MyPortfolio from './components/MyPortfolio.jsx'
import PublicPortfolio, { CafePublicPortfolio } from './components/PublicPortfolio.jsx'
import AboutPage from './components/AboutPage.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import ServicesPage from './components/ServicesPage.jsx'
import ContactPage from './components/ContactPage.jsx'
import CuratedContentPage from './components/CuratedContentPage.jsx'
import { services } from './data/services.js'
import { CheckoutReturnPage, ContinuePurchasePage } from './components/CheckoutPages.jsx'

const simulators = [
  { icon: BarChart3, title: 'Compare títulos de renda fixa', text: 'Coloque CDB, LCI, LCA e Tesouro lado a lado.' },
  { icon: ShoppingBag, title: 'À vista ou a prazo?', text: 'Compare o desconto à vista com o rendimento de um CDB.' },
  { icon: TrendingUp, title: 'Previdência ou CDB?', text: 'Entenda custos, impostos e resultado líquido no longo prazo.' },
  { icon: Dices, title: 'Sorteio computacional', text: 'Faça um sorteio livre de manipulação, transparente e com relatório completo do resultado.' },
]

const cardSuits = ['♠', '♥', '♦', '♣']
function SectionTitle({ eyebrow, title, description, action }) {
  return <div className="section-heading">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {action && <a href={typeof action === 'string' ? '#' : action.href} onClick={typeof action === 'string' ? e => e.preventDefault() : undefined} className="text-link">{typeof action === 'string' ? action : action.label}<ArrowRight size={16}/></a>}
  </div>
}

function PlaceholderLink({ children, className = '' }) {
  return <a href="#" className={className} onClick={e => e.preventDefault()}>{children}</a>
}

function App() {
  const [quotes, setQuotes] = useState([])
  const [posts, setPosts] = useState([])
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [visiblePostRows, setVisiblePostRows] = useState(2)
  const [siteContent, setSiteContent] = useState([])
  const [postColumns, setPostColumns] = useState(() => window.innerWidth <= 600 ? 2 : window.innerWidth <= 900 ? 3 : 5)
  const managed = type => siteContent.filter(item => item.tipo === type)
  const displayedAchadinhos = managed('achadinho')
  const displayedArticles = managed('artigo')
  const displayedBooks = managed('livro')
  const displayedTestimonials = managed('depoimento')

  useEffect(() => {
    if (!quotes.length) return undefined
    const interval = window.setInterval(() => {
      setQuoteIndex(current => (current + 1) % quotes.length)
    }, 8000)
    return () => window.clearInterval(interval)
  }, [quotes.length])

  useEffect(() => {
    if (displayedTestimonials.length <= 1) return undefined
    const interval = window.setInterval(() => {
      setTestimonialIndex(current => (current + 1) % displayedTestimonials.length)
    }, 8000)
    return () => window.clearInterval(interval)
  }, [displayedTestimonials.length])

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
      fetch('/api/conteudos', { signal: controller.signal }).then(response => response.ok ? response.json() : []),
    ]).then(([apiQuotes, apiPosts, managedContent]) => {
      setSiteContent(managedContent)
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
        <a href="/sobre">Sobre</a><a href="/servicos">Serviços</a><a href="#simuladores">Simuladores</a><a href="/carteira-publica-cafe">Carteira Pública</a><a href="/historico-rentabilidade">Rentabilidade</a><a href="#achadinhos">Achadinhos do Café</a>
      </div>
      <a className="x-button" href="/minha-area-restrita">Acessar Conta <LogIn size={15}/></a>
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
            <p className="profile-service-description">Perfil sobre educação financeira, investimentos e vida real. Desenvolvi minha própria metodologia de investimentos, longe das fórmulas da Faria Lima. Estudei análise técnica e fundamentalista, sou desenvolvedor e hoje uso a IA como uma ferramenta importante para ampliar análises, testar ideias e tomar decisões melhores.</p>
            <div className="meta"><span><Sparkles size={15}/> Investidor desde 2010</span>
              <a className="profile-contact" href="/contato">
                <Mail size={17}/>
                <span className="contact-email">cafecomsardinha@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      <section id="servicos" className="section services-section"><SectionTitle eyebrow="Como podemos ajudar" title="Serviços" description="Parcerias e soluções construídas com clareza, qualidade e propósito."/><div className="services-grid">{services.map(({ icon: Icon, title, summary, contactHref }) => <article key={title}><div className="icon-box"><Icon/></div><h3>{title}</h3><p>{summary}</p><a className="simulator-link" href={contactHref}>Solicitar informações <ArrowRight size={16}/></a></article>)}</div><a className="services-detail-link" href="/servicos">Conhecer todos os serviços <ArrowRight/></a></section>

      <section id="carteira-publica" className="section returns-section public-wallet-section">
        <div className="returns-intro"><span className="eyebrow">Transparência</span><h2>Carteira pública do Café</h2><p>Conheça a posição atual real que o Café com Sardinha escolheu publicar, com privacidade e dados consolidados.</p><a className="simulator-link history-link" href="/carteira-publica-cafe">Acessar carteira <ArrowRight size={16}/></a></div>
        <aside className="public-wallet-invite"><div className="public-wallet-invite-copy"><span>Grátis</span><strong>Controle e divulgue sua carteira com privacidade.</strong><p>Teste a ferramenta: você escolhe quais informações compartilhar e mantém os dados sensíveis protegidos.</p><a href="/minha-area-restrita/detalhamento">Começar agora <ArrowRight size={16}/></a></div><figure className="public-wallet-art"><img src={publicPortfolioImage} alt="Ilustração de um painel de investimentos com gráficos"/></figure></aside>
      </section>

      <section id="rentabilidade" className="section tinted returns-section history-home-section">
        <div className="returns-intro"><span className="eyebrow">Evolução no tempo</span><h2>Histórico de Rentabilidade</h2><p>Consulte os indicadores consolidados e o detalhamento anual e mensal registrado no histórico.</p><a className="simulator-link history-link" href="/historico-rentabilidade">Ver histórico completo <ArrowRight size={16}/></a></div>
        <PerformanceIndicators/>
      </section>

      <section id="simuladores" className="section simulators-home-section">
        <SectionTitle eyebrow="Ferramentas" title="Simuladores" description="Decisões melhores começam com comparações honestas." />
        <div className="three-grid">{simulators.map(({ icon: Icon, title, text }, i) =>
          <article className="sim-card" key={title}><div className="icon-box"><Icon/></div><span className="soon">Disponível</span><h3>{title}</h3><p>{text}</p>{i === 0 ? <a className="simulator-link" href="/simulador-renda-fixa">Começar simulação <ArrowRight size={16}/></a> : i === 1 ? <a className="simulator-link" href="/simulador-avista-aprazo">Começar simulação <ArrowRight size={16}/></a> : i === 2 ? <a className="simulator-link" href="/simulador-pgbl-cdb">Começar simulação <ArrowRight size={16}/></a> : <a className="simulator-link" href="https://melhorsorteio.com.br/" target="_blank" rel="noreferrer">Acessar Melhor Sorteio <ExternalLink size={16}/></a>}</article>
        )}</div>
      </section>

      {displayedAchadinhos.length > 0 && <section id="achadinhos" className="section home-achadinhos-section">
        <div className="curation-block">
          <SectionTitle eyebrow="Curadoria" title="Achadinhos do Café" description="Produtos que eu já comprei, testei e indico." action={{ label: 'Ver todos', href: '/achadinhos' }} />
          <div className="product-grid">{displayedAchadinhos.slice(0, 5).map((item, i) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id} className="product-card"><div className="product-visual">{item.imagem_url ? <img src={item.imagem_url} alt=""/> : <PackageSearch size={34}/>}<span>{String(i + 1).padStart(2, '0')}</span></div><small>{item.categoria || 'Indicação do Café'}</small><h3>{item.titulo}</h3>{item.preco != null && <b>{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>}<span className="amazon-link">Ver indicação <ExternalLink size={14}/></span></a>)}</div>
        </div>
      </section>}
      <section id="produtos-cafe" className="section home-products-section">
        <div className="brand-products standalone">
          <div className="brand-products-heading"><div><span className="eyebrow">Nossa marca</span><h2><a href="/produtos-do-cafe">Produtos do Café</a></h2><p>Canecas, bonés, camisetas e moletons com a identidade Café com Sardinha.</p></div><div className="charity-seal"><HeartHandshake size={28}/><span><strong>Lucro 100% solidário</strong>Todo o lucro será revertido para instituições de caridade.</span></div></div>
          <a className="brand-products-showcase" href="/produtos-do-cafe"><img src={cafeProductsImage} alt="Coleção de canecas, bonés, camisetas e moletons Café com Sardinha" /></a>
          <div className="brand-products-footer"><p>Vista a marca. Espalhe a ideia. Ajude quem precisa.</p><a className="soon product-launch" href="/produtos-do-cafe">Conhecer coleção</a></div>
        </div>
      </section>

      {displayedArticles.length > 0 && <section id="conteudos" className="section articles-home-section"><div>
          <SectionTitle eyebrow="Leitura aprofundada" title="Artigos interessantes" action={{ label: 'Ver todos', href: '/artigos-interessantes' }} />
          <div className="article-list">{displayedArticles.map((item, i) => <a href={`/artigos-interessantes?artigo=${item.id}`} className="article-row" key={item.id}><span className="number">0{i+1}</span><div><small>Conteúdo exclusivo</small><h3>{item.titulo}</h3></div><span className="paid">Conhecer</span><ArrowRight size={18}/></a>)}</div>
        </div></section>}
      {displayedBooks.length > 0 && <section className="section books-home-section"><aside className="books-panel">
          <SectionTitle eyebrow="Na estante" title="Livros interessantes" action={{ label: 'Ver todos', href: '/livros-interessantes' }} />
          <div className="book-list">{displayedBooks.slice(0, 4).map((item, i) => <article key={item.id} className="book-row"><div className={`book-cover color-${i}`}>{item.imagem_url ? <img src={item.imagem_url} alt=""/> : <BookOpen size={24}/>}</div><div><small>{item.autor || `Recomendação #${i+1}`}</small><h3>{item.titulo}</h3>{item.links?.length > 0 && <div className="book-store-links">{item.links.map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.id}>{link.loja}{link.preco != null ? ` · ${Number(link.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}<ExternalLink size={13}/></a>)}</div>}</div></article>)}</div>
        </aside></section>}

      {quotes.length > 0 && <section className="quote-section"><div className="quote-band">
        <div className="quote-art"><Quote/></div>
        <div className="quote-content"><span className="eyebrow">Frases interessantes</span><blockquote>“{quotes[quoteIndex].text}”</blockquote><p>— Café com Sardinha</p></div>
        <div className="quote-controls"><button onClick={() => setQuoteIndex((quoteIndex - 1 + quotes.length) % quotes.length)} aria-label="Frase anterior"><ChevronLeft/></button><span>{quoteIndex + 1} / {quotes.length}</span><button onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)} aria-label="Próxima frase"><ChevronRight/></button></div>
      </div></section>}

      {posts.length > 0 && <section className="section posts-section"><div className="posts-section-inner">
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
      </div></section>}

      {displayedTestimonials.length > 0 && <section className="section testimonial-section">
        <SectionTitle eyebrow="O que dizem" title="Depoimentos sobre o perfil" />
        <article className="testimonial-carousel"><Quote className="testimonial-quote-icon"/><p>“{displayedTestimonials[testimonialIndex]?.conteudo || displayedTestimonials[testimonialIndex]?.titulo}”</p><div className="testimonial-author"><span className="person">{(displayedTestimonials[testimonialIndex]?.titulo || 'LC').replace('@','').slice(0, 2).toUpperCase()}</span><div><b>{displayedTestimonials[testimonialIndex]?.titulo || 'Leitor do Café'}</b></div></div>{displayedTestimonials.length > 1 && <div className="testimonial-controls"><button type="button" onClick={() => setTestimonialIndex((testimonialIndex - 1 + displayedTestimonials.length) % displayedTestimonials.length)} aria-label="Depoimento anterior"><ChevronLeft/></button><span>{testimonialIndex + 1} / {displayedTestimonials.length}</span><button type="button" onClick={() => setTestimonialIndex((testimonialIndex + 1) % displayedTestimonials.length)} aria-label="Próximo depoimento"><ChevronRight/></button></div>}</article>
      </section>}

    </main>

    <footer>
      <div className="footer-cta"><div><span className="eyebrow">Vamos conversar?</span><h2>Publicidade e Projetos.</h2><p>Entre em contato para parcerias, publicidade e dúvidas.</p></div><a href="/contato" className="button primary"><Mail size={18}/> cafecomsardinha@gmail.com</a></div>
      <div className="footer-bottom"><a href="#inicio" className="wordmark"><span>CS</span>Café com Sardinha</a><p>Conteúdo educacional. Não é recomendação de investimento.</p><span>© 2026 Café com Sardinha</span></div>
    </footer>
  </div>
}

const pages = {'/simulador-pgbl-cdb':<PgblCdbSimulator/>, '/simulador-avista-aprazo':<CashInstallmentSimulator/>, '/simulador-renda-fixa':<FixedIncomeSimulator/>, '/historico-rentabilidade':<PerformanceHistory/>, '/carteira-publica-cafe':<CafePublicPortfolio/>, '/produtos-do-cafe':<CafeProducts/>, '/sobre':<AboutPage/>, '/servicos':<ServicesPage/>, '/contato':<ContactPage/>, '/achadinhos':<CuratedContentPage type="achadinho"/>, '/livros-interessantes':<CuratedContentPage type="livro"/>, '/artigos-interessantes':<CuratedContentPage type="artigo"/>, '/compra/continuar':<ContinuePurchasePage/>, '/compra/sucesso':<CheckoutReturnPage kind="success"/>, '/compra/cancelada':<CheckoutReturnPage kind="canceled"/>, '/compra/expirada':<CheckoutReturnPage kind="expired"/>, '/admin':<AdminPanel/>}
const legacyPrivatePage = window.location.pathname === '/minha-carteira' || window.location.pathname === '/minha-carteira/detalhamento'
if (legacyPrivatePage) window.location.replace(window.location.pathname.replace('/minha-carteira', '/minha-area-restrita') + window.location.search)
const privatePage = window.location.pathname === '/minha-area-restrita' || window.location.pathname === '/minha-area-restrita/detalhamento' || window.location.pathname === '/minha-conta/compras'
const page = window.location.pathname.startsWith('/carteira/publica/') ? <PublicPortfolio/> : privatePage ? <MyPortfolio/> : pages[window.location.pathname] || <App/>
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
