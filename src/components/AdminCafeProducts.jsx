import React, { useEffect, useState } from 'react'
import { CopyPlus, Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import AdminImageUpload from './AdminImageUpload.jsx'
import { AdminTablePagination, AdminTableToolbar, SortableHeader, useAdminTable } from './AdminTable.jsx'

const variant = ordem => ({ corNome: '', corHex: '#493326', tamanho: '', imagemUrl: '', preco: '', ativo: true, ordem })
const empty = { slug: '', nome: '', descricao: '', icone: 'shirt', preco: '', publicado: true, ordem: 0, variantes: [variant(0)] }

export default function AdminCafeProducts({ onStatus }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const table = useAdminTable(items, { searchFields: ['nome', 'slug', 'descricao'], initialSort: 'ordem' })
  const load = () => apiRequest('/api/admin/produtos-cafe')
    .then(rows => setItems(rows.map(item => ({ ...item, variantCount: item.variantes.length }))))
    .catch(error => onStatus(error.message))

  useEffect(() => { load() }, [])

  const updateVariant = (index, changes) => setForm(current => ({
    ...current,
    variantes: current.variantes.map((item, position) => position === index ? { ...item, ...changes } : item),
  }))
  const addVariant = source => setForm(current => ({
    ...current,
    variantes: [...current.variantes, { ...(source || variant(current.variantes.length)), id: undefined, ordem: current.variantes.length }],
  }))
  const removeVariant = index => setForm(current => ({
    ...current,
    variantes: current.variantes.filter((_, position) => position !== index).map((item, ordem) => ({ ...item, ordem })),
  }))
  const save = async event => {
    event.preventDefault()
    if (!form.variantes.length) return onStatus('Cadastre ao menos uma variante.')
    try {
      const body = {
        ...form,
        preco: form.preco || null,
        variantes: form.variantes.map((item, ordem) => ({ ...item, tamanho: item.tamanho || null, preco: item.preco || null, ordem })),
      }
      await apiRequest(form.id ? `/api/admin/produtos-cafe/${form.id}` : '/api/admin/produtos-cafe', {
        method: form.id ? 'PUT' : 'POST', body: JSON.stringify(body),
      })
      setForm(empty)
      await load()
      onStatus('Produto da loja salvo.')
    } catch (error) { onStatus(error.message) }
  }
  const edit = item => setForm({
    ...item,
    preco: item.preco ?? '',
    variantes: item.variantes.map((entry, ordem) => ({ ...entry, tamanho: entry.tamanho || '', preco: entry.preco ?? '', ordem })),
  })
  const remove = async item => {
    if (!window.confirm(`Excluir “${item.nome}” e todas as variantes?`)) return
    try {
      await apiRequest(`/api/admin/produtos-cafe/${item.id}`, { method: 'DELETE' })
      await load()
      onStatus('Produto excluído.')
    } catch (error) { onStatus(error.message) }
  }

  return <div>
    <div className="admin-heading"><div><span className="eyebrow">Loja virtual</span><h1>Produtos do Café</h1><p>Cadastre o produto principal e organize cores, tamanhos, imagens e preços em variantes separadas.</p></div><button onClick={() => setForm(empty)}><Plus/> Novo produto</button></div>
    <form className="admin-form product-master-form" onSubmit={save}>
      <div className="admin-form-heading"><h2>{form.id ? 'Editar produto' : 'Cadastrar produto'}</h2>{form.id && <button type="button" onClick={() => setForm(empty)}><X/> Cancelar</button>}</div>
      <div className="product-master-fields">
        <label>Nome<input required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label>
        <label>Slug<input required pattern="[a-z0-9-]+" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })}/></label>
        <label>Preço padrão<input type="number" min="0" step="0.01" value={form.preco ?? ''} onChange={event => setForm({ ...form, preco: event.target.value })}/></label>
        <label className="admin-order-field">Ordem<input type="number" value={form.ordem} onChange={event => setForm({ ...form, ordem: Number(event.target.value) })}/></label>
        <label className="admin-check"><input type="checkbox" checked={form.publicado} onChange={event => setForm({ ...form, publicado: event.target.checked })}/>Publicado</label>
      </div>
      <label>Descrição<textarea rows="3" value={form.descricao} onChange={event => setForm({ ...form, descricao: event.target.value })}/></label>
      <section className="variant-editor">
        <div className="variant-editor-heading"><div><span className="eyebrow">Detalhes do produto</span><h3>Variantes</h3><p>Uma linha por combinação de cor e tamanho. Use “Duplicar” para cadastrar tamanhos da mesma cor com menos digitação.</p></div><button type="button" onClick={() => addVariant()}><Plus/> Adicionar variante</button></div>
        <div className="variant-list">{form.variantes.map((item, index) => <article className="variant-card" key={item.id || index}>
          <div className="variant-card-heading"><strong>Variante {index + 1}</strong><div><button type="button" onClick={() => addVariant(item)}><CopyPlus/> Duplicar</button><button type="button" className="danger" disabled={form.variantes.length === 1} onClick={() => removeVariant(index)}><Trash2/> Remover</button></div></div>
          <div className="variant-fields"><label>Cor<input required maxLength="80" value={item.corNome} onChange={event => updateVariant(index, { corNome: event.target.value })}/></label><label>Cor visual<div className="variant-color"><input type="color" value={item.corHex} onChange={event => updateVariant(index, { corHex: event.target.value })}/><input required pattern="#[0-9A-Fa-f]{6}" value={item.corHex} onChange={event => updateVariant(index, { corHex: event.target.value })}/></div></label><label>Tamanho<input maxLength="30" placeholder="Opcional" value={item.tamanho} onChange={event => updateVariant(index, { tamanho: event.target.value })}/></label><label>Preço específico<input type="number" min="0" step="0.01" placeholder="Usa o preço padrão" value={item.preco} onChange={event => updateVariant(index, { preco: event.target.value })}/></label></div>
          <AdminImageUpload type="produto-cafe" label="Imagem da variante" value={item.imagemUrl} onChange={imagemUrl => updateVariant(index, { imagemUrl })} onStatus={onStatus}/>
          <label className="admin-check"><input type="checkbox" checked={item.ativo !== false} onChange={event => updateVariant(index, { ativo: event.target.checked })}/>Variante ativa</label>
        </article>)}</div>
      </section>
      <button className="admin-save"><Save/> Salvar produto e variantes</button>
    </form>
    <AdminTableToolbar table={table} placeholder="Pesquisar produto"/>
    <div className="admin-table-wrap"><table><thead><tr><SortableHeader table={table} sortKey="ordem">Ordem</SortableHeader><SortableHeader table={table} sortKey="nome">Produto</SortableHeader><SortableHeader table={table} sortKey="preco">Preço</SortableHeader><SortableHeader table={table} sortKey="variantCount">Variantes</SortableHeader><SortableHeader table={table} sortKey="publicado">Status</SortableHeader><th>Ações</th></tr></thead><tbody>{table.rows.map(item => <tr key={item.id}><td>{item.ordem}</td><td><strong>{item.nome}</strong><small>{item.slug}</small></td><td>{item.preco == null ? 'Por variante' : Number(item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{item.variantes.length}</td><td>{item.publicado ? 'Publicado' : 'Oculto'}</td><td><div className="admin-row-actions"><button aria-label="Editar" onClick={() => edit(item)}><Edit3/></button><button aria-label="Excluir" className="danger" onClick={() => remove(item)}><Trash2/></button></div></td></tr>)}</tbody></table></div>
    <AdminTablePagination table={table}/>
  </div>
}
