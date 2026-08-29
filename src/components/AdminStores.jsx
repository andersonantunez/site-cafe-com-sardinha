import React, { useEffect, useState } from 'react'
import { Edit3, Plus, Save, Store, Trash2, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import { AdminTablePagination, AdminTableToolbar, SortableHeader, useAdminTable } from './AdminTable.jsx'

const emptyStore = { nome: '', ativo: true, ordem: 0 }

export default function AdminStores({ onStatus }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyStore)
  const [loading, setLoading] = useState(true)
  const table = useAdminTable(items, { searchFields: ['nome'], initialSort: 'ordem' })

  const load = async () => {
    setLoading(true)
    try { setItems(await apiRequest('/api/admin/lojas')) }
    catch (error) { onStatus(error.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async event => {
    event.preventDefault()
    try {
      await apiRequest(form.id ? `/api/admin/lojas/${form.id}` : '/api/admin/lojas', {
        method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form),
      })
      setForm(emptyStore)
      await load()
      onStatus('Loja salva com sucesso.')
    } catch (error) { onStatus(error.message) }
  }

  const remove = async item => {
    if (!window.confirm(`Excluir a loja “${item.nome}”?`)) return
    try {
      await apiRequest(`/api/admin/lojas/${item.id}`, { method: 'DELETE' })
      if (form.id === item.id) setForm(emptyStore)
      await load()
      onStatus('Loja excluída.')
    } catch (error) { onStatus(error.message) }
  }

  return <div className="admin-stores-page">
    <div className="admin-heading"><div><span className="eyebrow">Cadastros auxiliares</span><h1>Lojas</h1><p>As lojas cadastradas ficam disponíveis nos links de livros e achadinhos.</p></div><button type="button" onClick={() => setForm(emptyStore)}><Plus/> Nova loja</button></div>
    <form className="admin-form admin-store-form" onSubmit={save}>
      <div className="admin-form-heading"><h2>{form.id ? 'Editar loja' : 'Cadastrar loja'}</h2>{form.id && <button type="button" onClick={() => setForm(emptyStore)}><X/> Cancelar</button>}</div>
      <div className="admin-form-grid">
        <label>Nome da loja<input required minLength="2" maxLength="120" placeholder="Ex.: Amazon" value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label>
        <label>Ordem<input type="number" value={form.ordem} onChange={event => setForm({ ...form, ordem: Number(event.target.value) })}/></label>
        <label className="admin-check"><input type="checkbox" checked={form.ativo} onChange={event => setForm({ ...form, ativo: event.target.checked })}/>Disponível</label>
      </div>
      <button className="admin-save"><Save/> Salvar loja</button>
    </form>
    <AdminTableToolbar table={table} placeholder="Pesquisar loja"/>
    <div className="admin-table-wrap"><table><thead><tr><SortableHeader table={table} sortKey="ordem">Ordem</SortableHeader><SortableHeader table={table} sortKey="nome">Loja</SortableHeader><SortableHeader table={table} sortKey="ativo">Status</SortableHeader><th>Ações</th></tr></thead><tbody>{table.rows.map(item => <tr key={item.id}><td>{item.ordem}</td><td><strong className="admin-store-name"><Store/>{item.nome}</strong></td><td>{item.ativo ? 'Disponível' : 'Desativada'}</td><td><div className="admin-row-actions"><button type="button" aria-label={`Editar ${item.nome}`} onClick={() => setForm(item)}><Edit3/></button><button type="button" className="danger" aria-label={`Excluir ${item.nome}`} onClick={() => remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table>{loading ? <p className="admin-empty">Carregando lojas…</p> : !table.rows.length && <p className="admin-empty">Nenhuma loja cadastrada.</p>}</div><AdminTablePagination table={table}/>
  </div>
}
