import React, { useEffect, useState } from 'react'
import { ArrowLeft, Edit3, ExternalLink, LogOut, Plus, Save, ShieldX, Trash2, X } from 'lucide-react'
import { apiRequest, TOKEN_KEY } from '../lib/api.js'
import AdminPerformance from './AdminPerformance.jsx'
import AdminCafeProducts from './AdminCafeProducts.jsx'
import AdminSystemSettings from './AdminSystemSettings.jsx'
import AdminUsers from './AdminUsers.jsx'
import AdminImageUpload from './AdminImageUpload.jsx'
import AdminStores from './AdminStores.jsx'
import { AdminTablePagination, AdminTableToolbar, SortableHeader, useAdminTable } from './AdminTable.jsx'

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
  fonte: '', categoria: '', preco: '', destaque: false,
  ordem: 0, ativo: true, metadados: {},
  links: [],
})

const hasImage = type => ['achadinho', 'produto', 'livro', 'artigo', 'sobre'].includes(type)
const hasImageUpload = type => ['achadinho', 'livro', 'artigo'].includes(type)
const hasPrice = type => ['produto', 'artigo'].includes(type)

export default function AdminPanel() {
  const [active, setActive] = useState('sobre')
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty('sobre'))
  const [status, setStatus] = useState('Validando permissões…')
  const [authorized, setAuthorized] = useState(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [stores, setStores] = useState([])
  const table = useAdminTable(items, { searchFields: ['titulo', 'subtitulo', 'conteudo', 'url'], initialSort: 'ordem' })

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

  const loadStores = async () => {
    try { setStores(await apiRequest('/api/admin/lojas')) }
    catch (error) { setStatus(error.message) }
  }

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.location.replace('/minha-area-restrita?returnTo=%2Fadmin')
      return
    }
    apiRequest('/api/admin/me').then(async () => {
      setAuthorized(true)
      setStatus('')
      await Promise.all([load('sobre'), loadStores()])
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
    if (!authorized || ['users', 'stores', 'system', 'rentabilidade', 'produtosCafe'].includes(active)) return
    setForm(empty(active))
    table.applySearch('')
    load(active)
  }, [active, authorized])

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
      links: item.links || [],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addCommerceLink = () => setForm(current => ({ ...current, links: [...current.links, { lojaId: stores.find(store => store.ativo)?.id || '', url: '', preco: '', ativo: true }] }))
  const updateCommerceLink = (index, changes) => setForm(current => ({ ...current, links: current.links.map((link, position) => position === index ? { ...link, ...changes } : link) }))
  const removeCommerceLink = index => setForm(current => ({ ...current, links: current.links.filter((_, position) => position !== index) }))

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
      <aside><h2>Gerenciamento</h2>{modules.map(([key, label]) => <button className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)}>{label}</button>)}<button className={active === 'stores' ? 'active' : ''} onClick={() => setActive('stores')}>Lojas</button><button className={active === 'users' ? 'active' : ''} onClick={() => setActive('users')}>Usuários</button><button className={active === 'system' ? 'active' : ''} onClick={() => setActive('system')}>Configurações do Sistema</button></aside>
      <section className="admin-content">
        {status && <p className="dashboard-status">{status}</p>}
        {active === 'users' ? <AdminUsers onStatus={setStatus}/> : active === 'stores' ? <AdminStores onStatus={setStatus}/> : active === 'system' ? <AdminSystemSettings onStatus={setStatus}/> : active === 'produtosCafe' ? <AdminCafeProducts onStatus={setStatus}/> : active === 'rentabilidade' ? <AdminPerformance onStatus={setStatus}/> : <>
          <div className="admin-heading"><div><span className="eyebrow">Gerenciamento</span><h1>{modules.find(([key]) => key === active)?.[1]}</h1></div><button onClick={() => setForm(empty(active))}><Plus/> Novo</button></div>
          <form className="admin-form" onSubmit={save}>
            <div className="admin-form-heading"><h2>{form.id ? 'Editar conteúdo' : 'Cadastrar conteúdo'}</h2>{form.id && <button type="button" onClick={() => setForm(empty(active))}><X/> Cancelar</button>}</div>
            {active === 'frase' ? <label>Texto<textarea rows="5" required maxLength="2000" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value, conteudo: event.target.value })}/></label> : <label>{active === 'depoimento' ? 'Nome' : active === 'achadinho' ? 'Nome' : 'Título'}<input required maxLength="240" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value })}/></label>}
            {active === 'sobre' && <label>Subtítulo<input maxLength="320" value={form.subtitulo} onChange={event => setForm({ ...form, subtitulo: event.target.value })}/></label>}
            {active !== 'frase' && <label>{active === 'livro' ? 'Resumo editorial' : active === 'depoimento' ? 'Depoimento' : 'Descrição ou conteúdo'}<textarea rows="5" required={active === 'depoimento'} value={form.conteudo} onChange={event => setForm({ ...form, conteudo: event.target.value })}/></label>}
            <div className="admin-form-grid">
              {active === 'achadinho' && <label>Categoria<input value={form.categoria} onChange={event => setForm({ ...form, categoria: event.target.value })}/></label>}
              {active === 'postagem' && <label className="admin-wide-field">Link externo<input required type="url" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>}
              {hasPrice(active) && <label>Preço<input min="0" step="0.01" type="number" value={form.preco} onChange={event => setForm({ ...form, preco: event.target.value })}/></label>}
              <label className="admin-order-field">Ordem<input type="number" value={form.ordem} onChange={event => setForm({ ...form, ordem: Number(event.target.value) })}/></label>
              {active === 'achadinho' && <label className="admin-check"><input type="checkbox" checked={form.destaque} onChange={event => setForm({ ...form, destaque: event.target.checked })}/>Destaque</label>}
              <label className="admin-check"><input type="checkbox" checked={form.ativo} onChange={event => setForm({ ...form, ativo: event.target.checked })}/>Publicado</label>
            </div>
            {active === 'artigo' && <label className="admin-full-field">Link do artigo no Google Drive ou Docs<input required type="url" placeholder="https://docs.google.com/document/d/..." value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>}
            {hasImageUpload(active) && <AdminImageUpload type={active} value={form.imagemUrl} onChange={imagemUrl => setForm(current => ({ ...current, imagemUrl }))} onStatus={setStatus}/>}
            {hasImage(active) && !hasImageUpload(active) && <label>Imagem (URL)<input type="url" value={form.imagemUrl} onChange={event => setForm({ ...form, imagemUrl: event.target.value })}/></label>}
            {['livro', 'achadinho'].includes(active) && <section className="commerce-links-editor"><div><div><span className="eyebrow">Onde comprar</span><h3>Links de lojas</h3><p>Cadastre uma ou mais opções para permitir comparação de preço.</p></div><button type="button" onClick={addCommerceLink} disabled={!stores.some(store => store.ativo)}><Plus/> Adicionar loja</button></div>{!stores.some(store => store.ativo) && <p className="admin-empty">Cadastre e habilite uma loja no módulo Lojas antes de adicionar links.</p>}{stores.some(store => store.ativo) && !form.links.length && <p className="admin-empty">Adicione ao menos uma loja.</p>}<div>{form.links.map((link, index) => <article key={link.id || index}><div><strong>Loja {index + 1}</strong><button type="button" className="danger" onClick={() => removeCommerceLink(index)}><Trash2/> Remover</button></div><div className="commerce-link-fields"><label>Loja<select required value={link.lojaId || ''} onChange={event => updateCommerceLink(index, { lojaId: Number(event.target.value) })}><option value="">Selecione uma loja</option>{stores.map(store => <option key={store.id} value={store.id} disabled={!store.ativo && store.id !== Number(link.lojaId)}>{store.nome}{store.ativo ? '' : ' (desativada)'}</option>)}</select></label><label>Link<input required type="url" value={link.url} onChange={event => updateCommerceLink(index, { url: event.target.value })}/></label><label>Preço atual<input type="number" min="0" step="0.01" value={link.preco ?? ''} onChange={event => updateCommerceLink(index, { preco: event.target.value })}/></label></div></article>)}</div></section>}
            <button className="admin-save"><Save/> Salvar</button>
          </form>
          <AdminTableToolbar table={table} placeholder="Pesquisar neste módulo"/>
          <div className="admin-table-wrap"><table><thead><tr><SortableHeader table={table} sortKey="ordem">Ordem</SortableHeader><SortableHeader table={table} sortKey="titulo">Conteúdo</SortableHeader><SortableHeader table={table} sortKey="ativo">Status</SortableHeader><th>Ações</th></tr></thead><tbody>{table.rows.map(item => <tr key={item.id}><td>{item.ordem}</td><td><strong>{item.titulo}</strong><small>{item.subtitulo || item.autor || item.loja}</small>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Abrir link <ExternalLink/></a>}</td><td><button className={`status-button ${item.ativo ? 'published' : ''}`} onClick={() => togglePublication(item)}>{item.ativo ? 'Publicado' : 'Não publicado'}</button></td><td><div className="admin-row-actions"><button aria-label="Editar" onClick={() => edit(item)}><Edit3/></button><button aria-label="Excluir" className="danger" onClick={() => remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table>{loadingItems ? <p className="admin-empty">Carregando…</p> : !table.rows.length && <p className="admin-empty">Nenhum conteúdo encontrado neste módulo.</p>}</div><AdminTablePagination table={table}/>
        </>}
      </section>
    </main>
  </div>
}
