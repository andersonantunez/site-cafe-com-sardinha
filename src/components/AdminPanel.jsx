import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Edit3, ExternalLink, LogOut, Plus, Save, Search, ShieldX, Trash2, X } from 'lucide-react'
import { apiRequest, TOKEN_KEY } from '../lib/api.js'
import AdminPerformance from './AdminPerformance.jsx'
import AdminCafeProducts from './AdminCafeProducts.jsx'
import AdminSystemSettings from './AdminSystemSettings.jsx'
import AdminUsers from './AdminUsers.jsx'

const modules = [
  ['sobre', 'Sobre'],
  ['rentabilidade', 'Rentabilidade mensal'],
  ['achadinho', 'Achadinhos do Café'],
  ['produtosCafe', 'Produtos do Café'],
  ['livro', 'Livros interessantes'],
  ['artigo', 'Artigos interessantes'],
  ['frase', 'Frases interessantes'],
  ['postagem', 'Postagens interessantes'],
  ['depoimento', 'Depoimentos sobre o perfil'],
]

const empty = tipo => ({
  tipo, titulo: '', subtitulo: '', conteudo: '', url: '', imagemUrl: '', autor: '',
  fonte: '', loja: '', categoria: '', preco: '', precoAnterior: '', destaque: false,
  ordem: 0, ativo: true, metadados: {},
})

const hasUrl = type => ['postagem', 'artigo', 'livro', 'produto', 'achadinho'].includes(type)
const hasImage = type => ['achadinho', 'produto', 'livro', 'artigo', 'depoimento', 'sobre'].includes(type)
const hasPrice = type => ['achadinho', 'produto', 'livro', 'artigo'].includes(type)

export default function AdminPanel() {
  const [active, setActive] = useState('sobre')
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty('sobre'))
  const [status, setStatus] = useState('Validando permissões…')
  const [authorized, setAuthorized] = useState(null)
  const [search, setSearch] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)

  const load = async type => {
    setLoadingItems(true)
    try {
      setItems(await apiRequest(`/api/admin/conteudos?tipo=${type}`))
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.location.replace('/minha-area-restrita?returnTo=%2Fadmin')
      return
    }
    apiRequest('/api/admin/me').then(async () => {
      setAuthorized(true)
      setStatus('')
      await load('sobre')
    }).catch(error => {
      if (error.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        window.location.replace('/minha-area-restrita?returnTo=%2Fadmin')
        return
      }
      setAuthorized(false)
      setStatus('')
    })
  }, [])

  useEffect(() => {
    if (!authorized || ['users', 'system', 'rentabilidade', 'produtosCafe'].includes(active)) return
    setForm(empty(active))
    setSearch('')
    load(active)
  }, [active, authorized])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return items
    return items.filter(item => [item.titulo, item.subtitulo, item.conteudo]
      .some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [items, search])

  const save = async event => {
    event.preventDefault()
    setStatus('Salvando…')
    try {
      const path = form.id ? `/api/admin/conteudos/${form.id}` : '/api/admin/conteudos'
      await apiRequest(path, { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setForm(empty(active))
      await load(active)
      setStatus('Conteúdo salvo com sucesso.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const edit = item => {
    setForm({
      ...empty(active), ...item,
      imagemUrl: item.imagem_url || '',
      preco: item.preco ?? '',
      precoAnterior: item.preco_anterior ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async item => {
    if (!window.confirm(`Excluir “${item.titulo}”? Esta ação não pode ser desfeita.`)) return
    try {
      await apiRequest(`/api/admin/conteudos/${item.id}?tipo=${active}`, { method: 'DELETE' })
      await load(active)
      setStatus('Conteúdo excluído.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const togglePublication = async item => {
    try {
      await apiRequest(`/api/admin/conteudos/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...item, tipo: active, imagemUrl: item.imagem_url || '', ativo: !item.ativo }),
      })
      await load(active)
      setStatus(item.ativo ? 'Conteúdo despublicado.' : 'Conteúdo publicado.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  if (authorized === null) return <div className="private-loading">Validando permissões…</div>
  if (!authorized) return <main className="admin-denied"><section><div className="admin-denied-icon"><ShieldX/></div><span className="eyebrow">Área administrativa</span><h1>Acesso negado</h1><p>Esta área é restrita a usuários com permissão de administrador.</p><a href="/minha-area-restrita"><ArrowLeft/> Voltar para minha conta</a></section></main>

  return <div className="admin-page">
    <header className="private-topbar admin-topbar"><a href="/"><ArrowLeft/> Página inicial</a><strong><span>CS</span> Administração</strong><div className="private-actions"><a href="/minha-area-restrita"><ArrowLeft/> Área restrita</a><button type="button" onClick={() => { localStorage.removeItem(TOKEN_KEY); window.location.replace('/') }}><LogOut/> Sair</button></div></header>
    <main className="admin-shell">
      <aside><h2>Gerenciamento</h2>{modules.map(([key, label]) => <button className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)}>{label}</button>)}<button className={active === 'users' ? 'active' : ''} onClick={() => setActive('users')}>Usuários</button><button className={active === 'system' ? 'active' : ''} onClick={() => setActive('system')}>Configurações do Sistema</button></aside>
      <section className="admin-content">
        {status && <p className="dashboard-status">{status}</p>}
        {active === 'users' ? <AdminUsers onStatus={setStatus}/> : active === 'system' ? <AdminSystemSettings onStatus={setStatus}/> : active === 'produtosCafe' ? <AdminCafeProducts onStatus={setStatus}/> : active === 'rentabilidade' ? <AdminPerformance onStatus={setStatus}/> : <>
          <div className="admin-heading"><div><span className="eyebrow">Gerenciamento</span><h1>{modules.find(([key]) => key === active)?.[1]}</h1></div><button onClick={() => setForm(empty(active))}><Plus/> Novo</button></div>
          <form className="admin-form" onSubmit={save}>
            <div className="admin-form-heading"><h2>{form.id ? 'Editar conteúdo' : 'Cadastrar conteúdo'}</h2>{form.id && <button type="button" onClick={() => setForm(empty(active))}><X/> Cancelar</button>}</div>
            {active === 'frase' ? <label>Texto<textarea rows="5" required maxLength="2000" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value, conteudo: event.target.value })}/></label> : <label>{active === 'depoimento' ? 'Nome' : active === 'achadinho' ? 'Nome' : 'Título'}<input required maxLength="240" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value })}/></label>}
            {active === 'sobre' && <label>Subtítulo<input maxLength="320" value={form.subtitulo} onChange={event => setForm({ ...form, subtitulo: event.target.value })}/></label>}
            {active !== 'frase' && <label>{active === 'livro' ? 'Resumo editorial' : active === 'depoimento' ? 'Depoimento' : 'Descrição ou conteúdo'}<textarea rows="5" required={active === 'depoimento'} value={form.conteudo} onChange={event => setForm({ ...form, conteudo: event.target.value })}/></label>}
            <div className="admin-form-grid">
              {['artigo', 'livro'].includes(active) && <label>Autor<input value={form.autor} onChange={event => setForm({ ...form, autor: event.target.value })}/></label>}
              {active === 'artigo' && <label>Fonte<input value={form.fonte} onChange={event => setForm({ ...form, fonte: event.target.value })}/></label>}
              {active === 'produto' && <label>Loja ou origem<input value={form.loja} onChange={event => setForm({ ...form, loja: event.target.value })}/></label>}
              {active === 'achadinho' && <label>Categoria<input value={form.categoria} onChange={event => setForm({ ...form, categoria: event.target.value })}/></label>}
              {hasUrl(active) && <label>{['livro', 'achadinho'].includes(active) ? 'Link da Amazon' : 'Link externo'}<input required type="url" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>}
              {hasImage(active) && <label>Imagem (URL)<input type="url" value={form.imagemUrl} onChange={event => setForm({ ...form, imagemUrl: event.target.value })}/></label>}
              {hasPrice(active) && <label>Preço<input min="0" step="0.01" type="number" value={form.preco} onChange={event => setForm({ ...form, preco: event.target.value })}/></label>}
              {active === 'achadinho' && <label>Preço anterior<input min="0" step="0.01" type="number" value={form.precoAnterior} onChange={event => setForm({ ...form, precoAnterior: event.target.value })}/></label>}
              <label>Ordem<input type="number" value={form.ordem} onChange={event => setForm({ ...form, ordem: Number(event.target.value) })}/></label>
              {active === 'achadinho' && <label className="admin-check"><input type="checkbox" checked={form.destaque} onChange={event => setForm({ ...form, destaque: event.target.checked })}/>Destaque</label>}
              <label className="admin-check"><input type="checkbox" checked={form.ativo} onChange={event => setForm({ ...form, ativo: event.target.checked })}/>Publicado</label>
            </div>
            {form.imagemUrl && <div className="admin-image-preview"><img src={form.imagemUrl} alt="Prévia cadastrada"/><span>Prévia da imagem</span></div>}
            <button className="admin-save"><Save/> Salvar</button>
          </form>
          <label className="admin-search"><Search/><input type="search" placeholder="Buscar neste módulo" value={search} onChange={event => setSearch(event.target.value)}/></label>
          <div className="admin-table-wrap"><table><thead><tr><th>Ordem</th><th>Conteúdo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filteredItems.map(item => <tr key={item.id}><td>{item.ordem}</td><td><strong>{item.titulo}</strong><small>{item.subtitulo || item.autor || item.loja}</small>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Abrir link <ExternalLink/></a>}</td><td><button className={`status-button ${item.ativo ? 'published' : ''}`} onClick={() => togglePublication(item)}>{item.ativo ? 'Publicado' : 'Não publicado'}</button></td><td><div className="admin-row-actions"><button aria-label="Editar" onClick={() => edit(item)}><Edit3/></button><button aria-label="Excluir" className="danger" onClick={() => remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table>{loadingItems ? <p className="admin-empty">Carregando…</p> : !filteredItems.length && <p className="admin-empty">Nenhum conteúdo encontrado neste módulo.</p>}</div>
        </>}
      </section>
    </main>
  </div>
}
