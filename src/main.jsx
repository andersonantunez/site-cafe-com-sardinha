import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, BarChart3, BookOpen, Bookmark, Calculator, Dices,
  ChevronLeft, ChevronRight, ExternalLink, Mail, MessageCircle, Package,
  Code2, HeartHandshake, LogIn, Megaphone, Quote, Search, ShoppingBag, Sparkles, TrendingUp, GraduationCap,
} from 'lucide-react'
import './styles.css'
import logoImage from './assets/images/logo3.png'
import cafeProductsImage from './assets/images/produtos-cafe.png'
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

const simulators = [
  { icon: BarChart3, title: 'Compare títulos de renda fixa', text: 'Coloque CDB, LCI, LCA e Tesouro lado a lado.' },
  { icon: ShoppingBag, title: 'À vista ou a prazo?', text: 'Compare o desconto à vista com o rendimento de um CDB.' },
  { icon: TrendingUp, title: 'Previdência ou CDB?', text: 'Entenda custos, impostos e resultado líquido no longo prazo.' },
  { icon: Dices, title: 'Sorteio computacional', text: 'Faça um sorteio livre de manipulação, transparente e com relatório completo do resultado.' },
]

const cardSuits = ['♠', '♥', '♦', '♣']
const services = [
  { icon: Megaphone, title: 'Publicidade no perfil', text: 'Podemos fechar uma parceria de publicidade desde que seja um produto ou serviço de qualidade e que faça sentido para o público do Café com Sardinha.' },
  { icon: Code2, title: 'Desenvolvimento de software', text: 'Desenvolvemos páginas web, aplicativos, softwares sob medida e integrações entre sistemas.' },
  { icon: GraduationCap, title: 'Consultoria Financeira ou Educacional', text: 'Apoio para construção de carteira, identificação de oportunidades, organização financeira e educação financeira.' },
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
  const [quotes, setQuotes] = useState([])
  const [posts, setPosts] = useState([])
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [visiblePostRows, setVisiblePostRows] = useState(2)
  const [siteContent, setSiteContent] = useState([])
  const [postColumns, setPostColumns] = useState(() => window.innerWidth <= 600 ? 2 : window.innerWidth <= 900 ? 3 : 5)

  useEffect(() => {
    if (!quotes.length) return undefined
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
  const managed = type => siteContent.filter(item => item.tipo === type)
  const displayedAchadinhos = managed('achadinho')
  const displayedArticles = managed('artigo')
  const displayedBooks = managed('livro')
  const displayedTestimonials = managed('depoimento')

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

      <section id="servicos" className="section services-section"><SectionTitle eyebrow="Como podemos ajudar" title="Serviços" description="Parcerias e soluções construídas com clareza, qualidade e propósito."/><div className="services-grid">{services.map(({ icon: Icon, title, text }) => <article key={title}><div className="icon-box"><Icon/></div><h3>{title}</h3><p>{text}</p><a className="simulator-link" href={`/contato?assunto=${encodeURIComponent(title)}`}>Solicitar informações <ArrowRight size={16}/></a></article>)}</div><a className="services-detail-link" href="/servicos">Conhecer todos os serviços <ArrowRight/></a></section>

      <section id="simuladores" className="section tinted">
        <SectionTitle eyebrow="Ferramentas" title="Simuladores" description="Decisões melhores começam com comparações honestas." />
        <div className="three-grid">{simulators.map(({ icon: Icon, title, text }, i) =>
          <article className="sim-card" key={title}><div className="icon-box"><Icon/></div><span className="soon">Disponível</span><h3>{title}</h3><p>{text}</p>{i === 0 ? <a className="simulator-link" href="/simulador-renda-fixa">Começar simulação <ArrowRight size={16}/></a> : i === 1 ? <a className="simulator-link" href="/simulador-avista-aprazo">Começar simulação <ArrowRight size={16}/></a> : i === 2 ? <a className="simulator-link" href="/simulador-pgbl-cdb">Começar simulação <ArrowRight size={16}/></a> : <a className="simulator-link" href="https://melhorsorteio.com.br/" target="_blank" rel="noreferrer">Acessar Melhor Sorteio <ExternalLink size={16}/></a>}</article>
        )}</div>
      </section>

      <section id="carteira-publica" className="section returns-section public-wallet-section">
        <div className="returns-intro"><span className="eyebrow">Transparência</span><h2>Carteira pública do Café</h2><p>Conheça a posição atual real que o Café com Sardinha escolheu publicar, com privacidade e dados consolidados.</p><a className="simulator-link history-link" href="/carteira-publica-cafe">Acessar carteira <ArrowRight size={16}/></a></div>
        <aside className="public-wallet-invite"><span>Grátis</span><strong>Controle e divulgue sua carteira com privacidade.</strong><p>Teste a ferramenta: você escolhe quais informações compartilhar e mantém os dados sensíveis protegidos.</p><a href="/minha-area-restrita/detalhamento">Começar agora <ArrowRight size={16}/></a></aside>
      </section>

      <section id="rentabilidade" className="section tinted returns-section history-home-section">
        <div className="returns-intro"><span className="eyebrow">Evolução no tempo</span><h2>Histórico de Rentabilidade</h2><p>Consulte os indicadores consolidados e o detalhamento anual e mensal registrado no histórico.</p><a className="simulator-link history-link" href="/historico-rentabilidade">Ver histórico completo <ArrowRight size={16}/></a></div>
        <PerformanceIndicators/>
      </section>

      <section id="achadinhos" className={`section home-products-section ${displayedAchadinhos.length ? 'tinted' : 'brand-only'}`}>
        {displayedAchadinhos.length > 0 && <div className="curation-block">
          <SectionTitle eyebrow="Curadoria" title="Achadinhos do Café" description="Produtos que eu já comprei, testei e indico." action="Ver todos" />
          <div className="product-grid">{displayedAchadinhos.map((item, i) => <a href={item.url} target="_blank" rel="noreferrer" key={item.id} className="product-card"><div className="product-visual">{item.imagem_url ? <img src={item.imagem_url} alt=""/> : <Package size={34}/>}<span>{String(i + 1).padStart(2, '0')}</span></div><small>{item.categoria || 'Indicação do Café'}</small><h3>{item.titulo}</h3>{item.preco != null && <b>{Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>}<span className="amazon-link">Ver indicação <ExternalLink size={14}/></span></a>)}</div>
        </div>}
        <div className={`brand-products ${displayedAchadinhos.length ? '' : 'standalone'}`}>
          <div className="brand-products-heading"><div><span className="eyebrow">Nossa marca</span><h2><a href="/produtos-do-cafe">Produtos do Café</a></h2><p>Canecas, bonés, camisetas e moletons com a identidade Café com Sardinha.</p></div><div className="charity-seal"><HeartHandshake size={28}/><span><strong>Lucro 100% solidário</strong>Todo o lucro será revertido para instituições de caridade.</span></div></div>
          <a className="brand-products-showcase" href="/produtos-do-cafe"><img src={cafeProductsImage} alt="Coleção de canecas, bonés, camisetas e moletons Café com Sardinha" /></a>
          <div className="brand-products-footer"><p>Vista a marca. Espalhe a ideia. Ajude quem precisa.</p><a className="soon product-launch" href="/produtos-do-cafe">Conhecer coleção</a></div>
        </div>
      </section>

      {(displayedArticles.length > 0 || displayedBooks.length > 0) && <section id="conteudos" className="section content-split">
        {displayedArticles.length > 0 && <div>
          <SectionTitle eyebrow="Leitura aprofundada" title="Artigos interessantes" />
          <div className="article-list">{displayedArticles.map((item, i) => <a href={item.url || '#'} onClick={item.url ? undefined : e => e.preventDefault()} className="article-row" key={item.id}><span className="number">0{i+1}</span><div><small>{item.subtitulo || 'Conteúdo'}</small><h3>{item.titulo}</h3></div><span className="paid">Ler</span><ArrowRight size={18}/></a>)}</div>
        </div>}
        {displayedBooks.length > 0 && <aside className="books-panel">
          <SectionTitle eyebrow="Na estante" title="Livros interessantes" />
          <div className="book-list">{displayedBooks.map((item, i) => <a href={item.url || '#'} onClick={item.url ? undefined : e => e.preventDefault()} key={item.id} className="book-row"><div className={`book-cover color-${i}`}><BookOpen size={20}/></div><div><small>{item.subtitulo || `Recomendação #${i+1}`}</small><h3>{item.titulo}</h3></div><ExternalLink size={16}/></a>)}</div>
        </aside>}
      </section>}

      {quotes.length > 0 && <section className={`quote-band ${displayedArticles.length || displayedBooks.length ? '' : 'after-products'}`}>
        <div className="quote-art"><Quote/></div>
        <div className="quote-content"><span className="eyebrow">Frases interessantes</span><blockquote>“{quotes[quoteIndex].text}”</blockquote><p>— Café com Sardinha</p></div>
        <div className="quote-controls"><button onClick={() => setQuoteIndex((quoteIndex - 1 + quotes.length) % quotes.length)} aria-label="Frase anterior"><ChevronLeft/></button><span>{quoteIndex + 1} / {quotes.length}</span><button onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)} aria-label="Próxima frase"><ChevronRight/></button></div>
      </section>}

      {posts.length > 0 && <section className="section posts-section">
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
      </section>}

      {displayedTestimonials.length > 0 && <section className="section tinted">
        <SectionTitle eyebrow="O que dizem" title="Depoimentos sobre o perfil" />
        <div className="testimonial-grid">{displayedTestimonials.map(item => <article className="testimonial" key={item.id}><Quote size={24}/><p>“{item.conteudo || item.titulo}”</p><div><span className="person">{(item.subtitulo || 'LC').replace('@','').slice(0, 2).toUpperCase()}</span><div><b>{item.titulo || 'Leitor do Café'}</b><small>{item.subtitulo}</small></div></div></article>)}</div>
      </section>}

    </main>

    <footer>
      <div className="footer-cta"><div><span className="eyebrow">Vamos conversar?</span><h2>Publicidade e Projetos.</h2><p>Entre em contato para parcerias, publicidade e dúvidas.</p></div><a href="/contato" className="button primary"><Mail size={18}/> cafecomsardinha@gmail.com</a></div>
      <div className="footer-bottom"><a href="#inicio" className="wordmark"><span>CS</span>Café com Sardinha</a><p>Conteúdo educacional. Não é recomendação de investimento.</p><span>© 2026 Café com Sardinha</span></div>
    </footer>
  </div>
}

const pages = {'/simulador-pgbl-cdb':<PgblCdbSimulator/>, '/simulador-avista-aprazo':<CashInstallmentSimulator/>, '/simulador-renda-fixa':<FixedIncomeSimulator/>, '/historico-rentabilidade':<PerformanceHistory/>, '/carteira-publica-cafe':<CafePublicPortfolio/>, '/produtos-do-cafe':<CafeProducts/>, '/sobre':<AboutPage/>, '/servicos':<ServicesPage/>, '/contato':<ContactPage/>, '/admin':<AdminPanel/>}
const legacyPrivatePage = window.location.pathname === '/minha-carteira' || window.location.pathname === '/minha-carteira/detalhamento'
if (legacyPrivatePage) window.location.replace(window.location.pathname.replace('/minha-carteira', '/minha-area-restrita') + window.location.search)
const privatePage = window.location.pathname === '/minha-area-restrita' || window.location.pathname === '/minha-area-restrita/detalhamento' || window.location.pathname === '/minha-conta/compras'
const page = window.location.pathname.startsWith('/carteira/publica/') ? <PublicPortfolio/> : privatePage ? <MyPortfolio/> : pages[window.location.pathname] || <App/>
createRoot(document.getElementById('root')).render(<React.StrictMode>{page}</React.StrictMode>)
