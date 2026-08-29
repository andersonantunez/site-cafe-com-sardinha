import React, { useEffect, useState } from 'react'
import { Download, PackageOpen } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const typeLabels = { ebook: 'E-book em PDF', caneca: 'Caneca', camiseta: 'Camiseta', blusao: 'Blusão', assinatura: 'Assinatura', consultoria: 'Consultoria', artigo: 'Artigo', produto: 'Produto', outro: 'Outro' }

export default function PurchaseHistory() {
  const [filter, setFilter] = useState('todos')
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setState(current => ({ ...current, loading: true, error: '' }))
    apiRequest(`/api/compras?status=${filter}`, { signal: controller.signal }).then(items => setState({ loading: false, items, error: '' }))
      .catch(error => { if (error.name !== 'AbortError') setState({ loading: false, items: [], error: error.message }) })
    return () => controller.abort()
  }, [filter])
  return <main className="private-dashboard purchases-page">
    <div className="purchases-heading"><div><span className="eyebrow">Histórico da conta</span><h1>Minhas compras</h1><p>Produtos, conteúdos digitais, assinaturas e serviços associados à sua conta.</p></div><label>Status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="todos">Todas</option><option value="comprado">Compradas</option><option value="cancelado">Canceladas</option></select></label></div>
    {state.loading ? <div className="private-loading">Carregando compras…</div> : state.error ? <p className="dashboard-status">{state.error}</p> : !state.items.length ? <section className="empty-portfolio"><PackageOpen/><h2>Nenhuma compra encontrada</h2><p>Não existem registros para o filtro selecionado.</p></section> : <div className="purchase-table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor pago</th><th>Pagamento</th><th>Status</th><th>Detalhes</th></tr></thead><tbody>{state.items.map(item => <tr key={item.id}><td>{new Date(item.data_compra).toLocaleDateString('pt-BR')}</td><td><strong>{typeLabels[item.tipo] || item.tipo}</strong></td><td>{item.descricao}</td><td>{item.valor_pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{item.forma_pagamento}</td><td><span className={`purchase-status ${item.status}`}>{item.status === 'comprado' ? 'Comprado' : 'Cancelado'}</span></td><td>{item.tipo === 'assinatura' && item.vencimento ? <>Vence em {new Date(`${item.vencimento.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</> : item.arquivo_url ? <a href={item.arquivo_url} download={item.tipo !== 'artigo'}>{item.tipo === 'artigo' ? 'Acessar artigo' : <><Download/> Baixar PDF</>}</a> : '—'}</td></tr>)}</tbody></table></div>}
  </main>
}
