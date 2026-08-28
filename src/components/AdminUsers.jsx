import React, { useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, Users } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : 'Nunca acessou'
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—'

export default function AdminUsers({ onStatus }) {
  const [filters, setFilters] = useState({ busca: '', de: '', ate: '', ultimoDe: '', ultimoAte: '', pagina: 1 })
  const [data, setData] = useState({ items: [], total: 0, pagina: 1, limite: 25 })
  const [metrics, setMetrics] = useState({ ano: new Date().getFullYear(), anos: [new Date().getFullYear()], totais: {}, pontos: [] })
  const [loading, setLoading] = useState(true)
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])).toString(), [filters])
  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await apiRequest(`/api/admin/usuarios?${query}`)
      setData(Array.isArray(response) ? { items: response, total: response.length, pagina: 1, limite: 25 } : { items: [], total: 0, pagina: 1, limite: 25, ...response })
    } catch (error) { onStatus(error.message) } finally { setLoading(false) }
  }
  const loadMetrics = async year => {
    try { setMetrics(await apiRequest(`/api/admin/usuarios/metricas?ano=${year}`)) } catch (error) { onStatus(error.message) }
  }
  useEffect(() => { loadUsers() }, [query])
  useEffect(() => { loadMetrics(metrics.ano) }, [])
  const toggleAdmin = async user => {
    try {
      await apiRequest(`/api/admin/usuarios/${user.id}/permissao`, { method: 'PUT', body: JSON.stringify({ isAdmin: !user.is_admin }) })
      await loadUsers()
      onStatus(user.is_admin ? 'Permissão administrativa removida.' : 'Permissão administrativa concedida.')
    } catch (error) { onStatus(error.message) }
  }
  const maximum = Math.max(...metrics.pontos.map(point => Number(point.acumulado)), 1)
  return <div className="admin-users-page">
    <div className="admin-heading"><div><span className="eyebrow">Base cadastrada</span><h1>Usuários</h1><p>Consulte cadastros, acessos e permissões sem excluir contas.</p></div></div>
    <section className="admin-users-metrics"><article><Users/><span>Usuários cadastrados</span><strong>{metrics.totais.usuarios ?? '—'}</strong></article><article><ShieldCheck/><span>Já compraram no site</span><strong>{metrics.totais.compradores ?? '—'}</strong></article></section>
    <section className="admin-growth-card"><div><div><span className="eyebrow">Crescimento</span><h2>Novos usuários por mês</h2><p>Entradas mensais e crescimento acumulado da base.</p></div><label>Ano<select value={metrics.ano} onChange={event => { const ano = Number(event.target.value); setMetrics(current => ({ ...current, ano })); loadMetrics(ano) }}>{metrics.anos.map(year => <option key={year} value={year}>{year}</option>)}</select></label></div><div className="admin-growth-chart" role="img" aria-label={`Crescimento mensal de usuários em ${metrics.ano}`}>{metrics.pontos.map(point => <div key={point.mes} title={`${new Date(`${point.mes.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}: ${point.novos} novos usuários, ${point.acumulado} no ano`}><i style={{ height: `${Number(point.acumulado) / maximum * 100}%` }}/><strong>{point.novos}</strong><span>{new Date(`${point.mes.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()}</span></div>)}</div></section>
    <section className="admin-permissions"><div><span className="eyebrow">Consulta e permissões</span><h2>Usuários cadastrados</h2></div><div className="admin-user-filters"><label><Search/><input type="search" placeholder="Nome ou e-mail" value={filters.busca} onChange={event => setFilters(current => ({ ...current, busca: event.target.value, pagina: 1 }))}/></label><label>Entrou de<input type="date" value={filters.de} onChange={event => setFilters(current => ({ ...current, de: event.target.value, pagina: 1 }))}/></label><label>Até<input type="date" value={filters.ate} onChange={event => setFilters(current => ({ ...current, ate: event.target.value, pagina: 1 }))}/></label><label>Último acesso de<input type="date" value={filters.ultimoDe} onChange={event => setFilters(current => ({ ...current, ultimoDe: event.target.value, pagina: 1 }))}/></label><label>Até<input type="date" value={filters.ultimoAte} onChange={event => setFilters(current => ({ ...current, ultimoAte: event.target.value, pagina: 1 }))}/></label></div><div className="admin-table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Cadastro</th><th>Último acesso</th><th>Comprou</th><th>Permissão administrativa</th></tr></thead><tbody>{data.items.map(user => <tr key={user.id}><td><strong>{user.nome}</strong></td><td>{user.email}</td><td>{date(user.criado_em)}</td><td>{dateTime(user.ultimo_login_em)}</td><td>{user.possui_compra ? 'Sim' : 'Não'}</td><td><label className="admin-user-permission"><input type="checkbox" checked={Boolean(user.is_admin)} disabled={!user.ativo} onChange={() => toggleAdmin(user)}/><span>{user.is_admin ? 'Permitida' : 'Não permitida'}</span></label></td></tr>)}</tbody></table>{loading ? <p className="admin-empty">Carregando usuários…</p> : !data.items.length && <p className="admin-empty">Nenhum usuário encontrado para estes filtros.</p>}</div>{data.total > data.limite && <div className="admin-pagination"><span>{data.total} usuários encontrados</span><button disabled={data.pagina <= 1} onClick={() => setFilters(current => ({ ...current, pagina: current.pagina - 1 }))}>Anterior</button><strong>Página {data.pagina}</strong><button disabled={data.pagina * data.limite >= data.total} onClick={() => setFilters(current => ({ ...current, pagina: current.pagina + 1 }))}>Próxima</button></div>}</section>
  </div>
}
