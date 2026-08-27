import React, { useEffect, useState } from 'react'
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const empty = { chave: '', valor: '', descricao: '' }

export default function AdminSystemSettings({ onStatus }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const load = () => apiRequest('/api/admin/configuracoes').then(setItems).catch(error => onStatus(error.message))
  useEffect(() => { load() }, [])
  const save = async event => {
    event.preventDefault()
    try {
      await apiRequest(form.originalKey ? `/api/admin/configuracoes/${form.originalKey}` : '/api/admin/configuracoes', { method: form.originalKey ? 'PUT' : 'POST', body: JSON.stringify(form) })
      setForm(empty); await load(); onStatus('Configuração salva.')
    } catch (error) { onStatus(error.message) }
  }
  const remove = async item => {
    if (!confirm(`Excluir a configuração “${item.chave}”?`)) return
    try { await apiRequest(`/api/admin/configuracoes/${item.chave}`, { method: 'DELETE' }); await load(); onStatus('Configuração excluída.') } catch (error) { onStatus(error.message) }
  }
  return <div><div className="admin-heading"><div><span className="eyebrow">Tempo de execução</span><h1>Configurações do Sistema</h1><p>Variáveis globais aplicadas sem recompilar a aplicação.</p></div><button onClick={() => setForm(empty)}><Plus/> Nova variável</button></div>
    <form className="admin-form" onSubmit={save}><div className="admin-form-heading"><h2>{form.originalKey ? 'Editar variável' : 'Cadastrar variável'}</h2>{form.originalKey && <button type="button" onClick={() => setForm(empty)}><X/> Cancelar</button>}</div><label>Chave<input required disabled={Boolean(form.originalKey)} pattern="[a-z][a-z0-9_]{2,99}" value={form.chave} onChange={event => setForm({ ...form, chave: event.target.value })}/></label><label>Valor<input required value={form.valor} onChange={event => setForm({ ...form, valor: event.target.value })}/></label><label>Descrição<textarea rows="3" value={form.descricao} onChange={event => setForm({ ...form, descricao: event.target.value })}/></label><button className="admin-save"><Save/> Salvar</button></form>
    <div className="admin-table-wrap"><table><thead><tr><th>Chave</th><th>Valor</th><th>Descrição</th><th>Ações</th></tr></thead><tbody>{items.map(item => <tr key={item.chave}><td><strong>{item.chave}</strong></td><td>{item.valor}</td><td>{item.descricao}</td><td><div className="admin-row-actions"><button aria-label="Editar" onClick={() => setForm({ ...item, originalKey: item.chave })}><Edit3/></button>{item.chave !== 'carteira_cafe_usuario_email' && <button aria-label="Excluir" className="danger" onClick={() => remove(item)}><Trash2/></button>}</div></td></tr>)}</tbody></table></div>
  </div>
}
