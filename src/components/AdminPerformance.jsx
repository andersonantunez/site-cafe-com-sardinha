import React, { useEffect, useState } from 'react'
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import { AdminTablePagination, AdminTableToolbar, SortableHeader, useAdminTable } from './AdminTable.jsx'

const empty = { id: null, competencia: '', rentabilidadeCarteira: '', rentabilidadeCdi: '', percentualCdi: '', publicado: true }
const monthValue = value => String(value || '').slice(0, 7)
const competenceLabel = value => {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  return `${date.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()}/${String(date.getUTCFullYear()).slice(-2)}`
}

export default function AdminPerformance({ onStatus }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const table = useAdminTable(items, { searchFields: ['competencia', 'rentabilidadeCarteira', 'rentabilidadeCdi', 'percentualCdi'], initialSort: 'competencia', initialDirection: 'desc' })
  const load = async () => {
    setLoading(true)
    try { setItems(await apiRequest('/api/admin/rentabilidade')) } catch (error) { onStatus(error.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const save = async event => {
    event.preventDefault()
    const competencia = `${form.competencia}-01`
    const duplicate = items.some(item => item.id !== form.id && String(item.competencia).slice(0, 10) === competencia)
    if (duplicate) { onStatus('JÃ¡ existe rentabilidade cadastrada para esta competÃªncia.'); return }
    try {
      await apiRequest(form.id ? `/api/admin/rentabilidade/${form.id}` : '/api/admin/rentabilidade', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, competencia }),
      })
      setForm(empty); await load(); onStatus('Rentabilidade salva com sucesso.')
    } catch (error) { onStatus(error.message) }
  }
  const edit = item => setForm({ ...item, competencia: monthValue(item.competencia) })
  const remove = async item => {
    if (!window.confirm(`Excluir a competência ${new Date(`${item.competencia.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}?`)) return
    try { await apiRequest(`/api/admin/rentabilidade/${item.id}`, { method: 'DELETE' }); await load(); onStatus('Competência excluída.') } catch (error) { onStatus(error.message) }
  }
  return <>
    <div className="admin-heading"><div><span className="eyebrow">Histórico real</span><h1>Rentabilidade mensal</h1><p>Os indicadores públicos são recalculados a partir destes registros.</p></div><button onClick={() => setForm(empty)}><Plus/> Novo mês</button></div>
    <form className="admin-form performance-admin-form" onSubmit={save}>
      <div className="admin-form-heading"><h2>{form.id ? 'Editar competência' : 'Cadastrar competência'}</h2>{form.id && <button type="button" onClick={() => setForm(empty)}><X/> Cancelar</button>}</div>
      <div className="admin-form-grid performance-form-grid">
        <label>Competência<input required type="month" value={form.competencia} onChange={event => setForm({ ...form, competencia: event.target.value })}/></label>
        <label>Rentabilidade da carteira (%)<input required type="number" step="0.000001" min="-100" max="1000" value={form.rentabilidadeCarteira} onChange={event => setForm({ ...form, rentabilidadeCarteira: event.target.value })}/></label>
        <label>CDI do período (%)<input required type="number" step="0.000001" min="-100" max="1000" value={form.rentabilidadeCdi} onChange={event => setForm({ ...form, rentabilidadeCdi: event.target.value })}/></label>
        <label>Percentual do CDI (%)<input required type="number" step="0.000001" min="-100000" max="100000" value={form.percentualCdi} onChange={event => setForm({ ...form, percentualCdi: event.target.value })}/></label>
        <label className="admin-check"><input type="checkbox" checked={form.publicado} onChange={event => setForm({ ...form, publicado: event.target.checked })}/>Publicado</label>
      </div>
      <button className="admin-save"><Save/> Salvar competência</button>
    </form>
    <AdminTableToolbar table={table} placeholder="Pesquisar competência ou percentual"/><div className="admin-table-wrap"><table><thead><tr><SortableHeader table={table} sortKey="competencia">Competência</SortableHeader><SortableHeader table={table} sortKey="rentabilidadeCarteira">Carteira</SortableHeader><SortableHeader table={table} sortKey="rentabilidadeCdi">CDI</SortableHeader><SortableHeader table={table} sortKey="percentualCdi">% CDI</SortableHeader><SortableHeader table={table} sortKey="publicado">Status</SortableHeader><th>Ações</th></tr></thead><tbody>{table.rows.map(item => <tr key={item.id}><td><strong>{competenceLabel(item.competencia)}</strong></td><td>{item.rentabilidadeCarteira.toLocaleString('pt-BR')}%</td><td>{item.rentabilidadeCdi.toLocaleString('pt-BR')}%</td><td>{item.percentualCdi.toLocaleString('pt-BR')}%</td><td><span className={`status-button ${item.publicado ? 'published' : ''}`}>{item.publicado ? 'Publicado' : 'Oculto'}</span></td><td><div className="admin-row-actions"><button aria-label="Editar" onClick={() => edit(item)}><Edit3/></button><button aria-label="Excluir" className="danger" onClick={() => remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table>{loading ? <p className="admin-empty">Carregando…</p> : !table.rows.length && <p className="admin-empty">Nenhuma competência cadastrada.</p>}</div><AdminTablePagination table={table}/>
  </>
}
