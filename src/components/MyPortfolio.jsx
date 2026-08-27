import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, Download, FileJson2, FileUp, LayoutDashboard, Link, LogIn, LogOut, RefreshCw, Settings, ShieldCheck, UserPlus } from 'lucide-react'
import PortfolioDetails from './PortfolioDetails.jsx'
import PrivateDashboardHome from './PrivateDashboardHome.jsx'
import PurchaseHistory from './PurchaseHistory.jsx'
import { apiRequest as request, TOKEN_KEY } from '../lib/api.js'

const defaultSettings = { mostrarVencimento: true, mostrarTipoProduto: true, mostrarTaxa: true, mostrarEmissor: true, nomeCarteira: 'Minha carteira', compartilhamentoAtivo: false }

export default function MyPortfolio() {
  const [user, setUser] = useState(null)
  const [assets, setAssets] = useState([])
  const [liquidatedAssets, setLiquidatedAssets] = useState([])
  const [portfolioView, setPortfolioView] = useState('current')
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [status, setStatus] = useState('')
  const [googleStatus, setGoogleStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(defaultSettings)
  const [shareUrl, setShareUrl] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [importFormat, setImportFormat] = useState('tsv')
  const [importMode, setImportMode] = useState('substituir')
  const googleRef = useRef(null)
  const loadPortfolio = async () => {
    const portfolio = await request('/api/carteira')
    setAssets(portfolio.assets || [])
    setLiquidatedAssets(portfolio.liquidatedAssets || [])
    setSettings(portfolio.settings || defaultSettings)
  }
  const returnToAdmin = new URLSearchParams(window.location.search).get('returnTo') === '/admin'
  const establishSession = async data => {
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setStatus('')
    await loadPortfolio()
    setIsAdmin(await request('/api/admin/me').then(() => true).catch(() => false))
    if (returnToAdmin) window.location.assign('/admin')
  }

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return }
    request('/api/auth/me').then(async data => {
      setUser(data.user)
      await loadPortfolio()
      setIsAdmin(await request('/api/admin/me').then(() => true).catch(() => false))
      if (returnToAdmin) window.location.assign('/admin')
    }).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    if (user || loading) return
    request('/api/auth/config').then(({ googleClientId }) => {
      if (!googleClientId) {
        setGoogleStatus('Login com Google não está configurado. Peça ao administrador para definir GOOGLE_CLIENT_ID.')
        return
      }
      const draw = () => {
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: async ({ credential }) => {
          try { setStatus('Entrando com Google…'); await establishSession(await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })) } catch (error) { setStatus(error.message) }
        } })
        if (googleRef.current) window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' })
      }
      if (window.google?.accounts) return draw()
      const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = draw; document.head.appendChild(script)
    }).catch(() => setGoogleStatus('Não foi possível carregar a configuração do login com Google.'))
  }, [user, loading])

  const submit = async event => {
    event.preventDefault(); setStatus(mode === 'login' ? 'Entrando…' : 'Criando conta…')
    try { await establishSession(await request(mode === 'login' ? '/api/auth/login' : '/api/auth/cadastro', { method: 'POST', body: JSON.stringify(form) })) } catch (error) { setStatus(error.message) }
  }
  const importFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Validando e importando a carteira…')
    try { const result = await request('/api/carteira/importar', { method: 'POST', body: JSON.stringify({ nomeArquivo: file.name, conteudo: await file.text(), formato: importFormat, modo: importMode }) }); await loadPortfolio(); setStatus(`${result.imported} títulos importados com sucesso no modo ${result.mode}.`) } catch (error) { setStatus(error.message) }
    event.target.value = ''
  }
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); setAssets([]); setLiquidatedAssets([]); setStatus('') }
  const updateSettings = async next => {
    setSettings(next)
    try {
      setSettings(await request('/api/carteira/configuracoes', { method: 'PUT', body: JSON.stringify(next) }))
      setStatus('Configurações públicas salvas.')
    } catch (error) { await loadPortfolio().catch(() => {}); setStatus(error.message) }
  }
  const generateShare = async () => {
    try {
      const result = await request('/api/carteira/compartilhamento', { method: 'POST' })
      const url = new URL(result.path, window.location.origin).toString()
      setShareUrl(url); setSettings(current => ({ ...current, compartilhamentoAtivo: true }))
      setStatus('Novo link público gerado. O link anterior, se existia, foi invalidado.')
    } catch (error) { setStatus(error.message) }
  }
  const disableShare = async () => {
    try {
      await request('/api/carteira/compartilhamento', { method: 'DELETE' })
      setShareUrl(''); setSettings(current => ({ ...current, compartilhamentoAtivo: false }))
      setStatus('Compartilhamento desativado.')
    } catch (error) { setStatus(error.message) }
  }
  const copyShare = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setStatus('Link copiado.') } catch { setStatus('Não foi possível copiar automaticamente. Selecione o link e copie-o.') }
  }
  const hasPortfolio = assets.length > 0 || liquidatedAssets.length > 0
  const currentPage = window.location.pathname === '/minha-conta/compras' ? 'purchases' : window.location.pathname === '/minha-area-restrita/detalhamento' ? 'portfolio' : 'home'

  if (loading) return <div className="private-portfolio-page"><div className="private-loading">Carregando sua área…</div></div>
  return <div className="private-portfolio-page">
    <header className="private-topbar"><a href={currentPage === 'home' ? '/' : '/minha-area-restrita'}>{currentPage === 'home' ? <ArrowLeft/> : <LayoutDashboard/>}{currentPage === 'home' ? 'Página inicial' : 'Painel principal'}</a><strong><span>CS</span> Minha área restrita</strong>{user && <div className="private-actions">{isAdmin && <a href="/admin"><Settings/> Admin</a>}<button type="button" onClick={logout}><LogOut/> Sair</button></div>}</header>
    {!user ? <main className="auth-shell">
      <section className="auth-intro"><span className="eyebrow">Área exclusiva</span><h1>Sua carteira.<br/><em>Seus gráficos.</em></h1><p>Importe seus títulos no formato do arquivo Ativos.txt e acompanhe composição, vencimentos, concentração e rentabilidade com os mesmos gráficos da carteira publicada.</p><div><ShieldCheck/><span><strong>Dados privados</strong>As carteiras são isoladas por usuário e acessadas somente após autenticação.</span></div></section>
      <section className="auth-card"><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}><LogIn/> Entrar</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}><UserPlus/> Criar conta</button></div>
        <form onSubmit={submit}>{mode === 'register' && <label>Nome<input required minLength="2" value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label>}<label>E-mail<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>Senha<input required type="password" minLength="8" value={form.senha} onChange={event => setForm({ ...form, senha: event.target.value })}/></label><button className="auth-submit" type="submit">{mode === 'login' ? 'Entrar na minha carteira' : 'Criar minha conta'}</button></form>
        <div className="auth-divider"><span>ou</span></div><div className="google-login" ref={googleRef}/>{googleStatus && <p className="auth-status">{googleStatus}</p>}{status && <p className="auth-status">{status}</p>}
      </section>
    </main> : currentPage === 'home' ? <PrivateDashboardHome user={user}/> : currentPage === 'purchases' ? <PurchaseHistory/> : <main className="private-dashboard">
      <section className="private-welcome"><div><span className="eyebrow">Carteira pessoal</span><h1>Detalhamento da carteira</h1><p>Importe, consolide e analise seus títulos. A identidade do usuário é determinada pela sessão autenticada.</p></div></section>
      <section className="portfolio-import-panel">
        <div className="import-heading"><FileJson2/><div><span className="eyebrow">Importação orientada</span><h2>Importar títulos</h2><p>Escolha o formato e como os novos registros devem ser tratados antes de selecionar o arquivo.</p></div></div>
        <div className="import-options"><fieldset><legend>1. Formato do arquivo</legend><label><input type="radio" name="import-format" value="tsv" checked={importFormat === 'tsv'} onChange={() => setImportFormat('tsv')}/>TSV / Ativos.txt</label><label><input type="radio" name="import-format" value="json" checked={importFormat === 'json'} onChange={() => setImportFormat('json')}/>JSON</label></fieldset><fieldset><legend>2. Tratamento da carteira</legend><label><input type="radio" name="import-mode" value="substituir" checked={importMode === 'substituir'} onChange={() => setImportMode('substituir')}/>Substituir toda a carteira</label><label><input type="radio" name="import-mode" value="acrescentar" checked={importMode === 'acrescentar'} onChange={() => setImportMode('acrescentar')}/>Acrescentar aos títulos existentes</label></fieldset></div>
        <div className="import-actions"><div className="example-downloads"><a href="/exemplos/carteira-exemplo.tsv" download><Download/> Baixar exemplo TSV</a><a href="/exemplos/carteira-exemplo.json" download><Download/> Baixar exemplo JSON</a></div><label className="portfolio-upload"><FileUp/><span><strong>Selecionar arquivo {importFormat.toUpperCase()}</strong>{importMode === 'substituir' ? 'A carteira anterior será substituída somente após validação completa.' : 'Os títulos serão acrescentados sem apagar os existentes.'}</span><input type="file" accept={importFormat === 'json' ? '.json,application/json' : '.txt,.tsv,text/plain,text/tab-separated-values'} onChange={importFile}/></label></div>
      </section>
      {status && <p className="dashboard-status">{status}</p>}
      <section className="sharing-panel">
        <div><span className="eyebrow">Exposição pública</span><h2>Compartilhar carteira</h2><p>Estas opções afetam somente páginas públicas. Você sempre vê todos os campos nesta área restrita.</p></div>
        <div className="visibility-settings">
          <label className="portfolio-name-field">Nome da Carteira<input type="text" minLength="2" maxLength="120" value={settings.nomeCarteira || ''} onChange={event => setSettings(current => ({ ...current, nomeCarteira: event.target.value }))} onBlur={() => updateSettings(settings)}/></label>
          <label><input type="checkbox" checked={settings.mostrarVencimento} onChange={event => updateSettings({ ...settings, mostrarVencimento: event.target.checked })}/>Mostrar vencimento?</label>
          <label><input type="checkbox" checked={settings.mostrarTipoProduto} onChange={event => updateSettings({ ...settings, mostrarTipoProduto: event.target.checked })}/>Mostrar tipo de produto?</label>
          <label><input type="checkbox" checked={settings.mostrarTaxa} onChange={event => updateSettings({ ...settings, mostrarTaxa: event.target.checked })}/>Mostrar taxa?</label>
          <label><input type="checkbox" checked={settings.mostrarEmissor} onChange={event => updateSettings({ ...settings, mostrarEmissor: event.target.checked })}/>Mostrar emissor?</label>
        </div>
        {hasPortfolio && <div className="sharing-actions">
          {!settings.compartilhamentoAtivo ? <button type="button" onClick={generateShare}><Link/> Habilitar e gerar link</button> : <><button type="button" onClick={generateShare}><RefreshCw/> Gerar novo link</button><button className="danger" type="button" onClick={disableShare}>Desativar</button></>}
          {shareUrl && <div className="share-url"><input readOnly value={shareUrl}/><button type="button" onClick={copyShare}><Copy/> Copiar</button></div>}
          {settings.compartilhamentoAtivo && !shareUrl && <small>O link está ativo, mas por segurança não é armazenado em texto aberto. Gere um novo link para copiá-lo.</small>}
        </div>}
      </section>
      {assets.length || liquidatedAssets.length ? <PortfolioDetails
        assets={portfolioView === 'current' ? assets : liquidatedAssets}
        title={settings.nomeCarteira || `Carteira de ${user.nome.split(' ')[0]}`}
        initiallyVisible
        showImage={false}
        viewMode={portfolioView}
        onViewModeChange={setPortfolioView}
        emptyMessage={portfolioView === 'current' ? 'Nenhum título em carteira encontrado.' : 'Nenhum título liquidado encontrado.'}
        description={portfolioView === 'current'
          ? 'Todos os gráficos e insights consideram somente os títulos que ainda fazem parte da posição atual.'
          : 'Os totais, agrupamentos e análises abaixo consideram exclusivamente os títulos liquidados.'}
      /> : <section className="empty-portfolio"><FileUp/><h2>Sua carteira ainda está vazia</h2><p>Use o botão “Importar Ativos.txt” para gerar o detalhamento completo.</p></section>}
    </main>}
  </div>
}
