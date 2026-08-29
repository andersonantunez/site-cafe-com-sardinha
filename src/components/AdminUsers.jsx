import React, { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Users } from 'lucide-react'
import { apiRequest } from '../lib/api.js'
import { AdminTablePagination, AdminTableToolbar, SortableHeader, useAdminTable } from './AdminTable.jsx'

const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : 'Nunca acessou'
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—'
const initialFilters = { busca: '', pagina: 1 }

export default function AdminUsers({ onStatus }) {
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState({ items: [], total: 0, pagina: 1, limite: 25 })
  const [metrics, setMetrics] = useState({ ano: new Date().getFullYear(), anos: [new Date().getFullYear()], totais: {}, pontos: [] })
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [administrators, setAdministrators] = useState([])
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [lookupMessage, setLookupMessage] = useState('')
  const [pageSize, setPageSizeState] = useState(15)
  const [sortKey, setSortKey] = useState('criado_em')
  const [sortDirection, setSortDirection] = useState('desc')
  const administratorsTable = useAdminTable(administrators, { searchFields: ['nome', 'email'], initialSort: 'nome' })
  const query = useMemo(() => new URLSearchParams({ busca: filters.busca, pagina: String(filters.pagina), limite: String(pageSize), ordenar: sortKey, direcao: sortDirection }).toString(), [filters, pageSize, sortDirection, sortKey])

  const loadUsers = async () => {
    setLoading(true)
    try { setData({ items: [], total: 0, pagina: 1, limite: pageSize, ...await apiRequest(`/api/admin/usuarios?${query}`) }) }
    catch (error) { onStatus(error.message) }
    finally { setLoading(false) }
  }
  const loadMetrics = async year => {
    try { setMetrics(await apiRequest(`/api/admin/usuarios/metricas?ano=${year}`)) }
    catch (error) { onStatus(error.message) }
  }
  const loadAdministrators = async () => {
    try { setAdministrators(await apiRequest('/api/admin/usuarios/administradores')) }
    catch (error) { onStatus(error.message) }
  }
  useEffect(() => { loadUsers() }, [query])
  useEffect(() => { loadMetrics(metrics.ano) }, [])
  useEffect(() => { loadAdministrators() }, [])

  const verifyAdminCandidate = async event => {
    event.preventDefault()
    setPermissionLoading(true)
    setCandidate(null)
    setLookupMessage('')
    try { setCandidate(await apiRequest('/api/admin/usuarios/permissao/verificar', { method: 'POST', body: JSON.stringify({ email: adminEmail }) })) }
    catch (error) {
      if (error.status === 404) setLookupMessage('Não foi encontrado o e-mail informado.')
      else setLookupMessage(error.message)
    }
    finally { setPermissionLoading(false) }
  }
  const grantAdmin = async () => {
    if (!candidate || candidate.is_admin || !window.confirm(`Conceder acesso administrativo a ${candidate.nome} (${candidate.email})?`)) return
    try {
      await apiRequest('/api/admin/usuarios/permissao', { method: 'POST', body: JSON.stringify({ email: candidate.email }) })
      setAdminEmail(''); setCandidate(null)
      await Promise.all([loadAdministrators(), loadUsers()])
      onStatus('Permissão administrativa concedida.')
    } catch (error) { onStatus(error.message) }
  }
  const revokeAdmin = async user => {
    if (!window.confirm(`Revogar o acesso administrativo de ${user.nome} (${user.email})?`)) return
    try {
      await apiRequest(`/api/admin/usuarios/${user.id}/permissao`, { method: 'DELETE' })
      await Promise.all([loadAdministrators(), loadUsers()])
      onStatus('Permissão administrativa revogada.')
    } catch (error) { onStatus(error.message) }
  }

  const maximum = Math.max(...metrics.pontos.map(point => Number(point.novos)), 1)
  const usersTable = {
    total: data.total, page: data.pagina, pageSize, searchTerm: filters.busca, sortKey, sortDirection,
    applySearch: busca => setFilters({ busca, pagina: 1 }),
    setPage: pagina => setFilters(current => ({ ...current, pagina })),
    setPageSize: value => { setPageSizeState(value); setFilters(current => ({ ...current, pagina: 1 })) },
    toggleSort: key => { if (sortKey === key) setSortDirection(current => current === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDirection('asc') }; setFilters(current => ({ ...current, pagina: 1 })) },
  }

  return <div className="admin-users-page">
    <div className="admin-heading"><div><span className="eyebrow">Base cadastrada</span><h1>Usuários</h1><p>Consulte cadastros, acessos e permissões sem excluir contas.</p></div></div>
    <section className="admin-users-metrics"><article><Users/><span>Usuários cadastrados</span><strong>{metrics.totais.usuarios ?? '—'}</strong></article><article><ShieldCheck/><span>Já compraram no site</span><strong>{metrics.totais.compradores ?? '—'}</strong></article></section>
    <section className="admin-growth-card"><div><div><span className="eyebrow">Crescimento</span><h2>Novos usuários por mês</h2><p>Entradas mensais e crescimento acumulado da base.</p></div><label>Ano<select value={metrics.ano} onChange={event => { const ano = Number(event.target.value); setMetrics(current => ({ ...current, ano })); loadMetrics(ano) }}>{metrics.anos.map(year => <option key={year} value={year}>{year}</option>)}</select></label></div><div className="admin-growth-chart" role="img" aria-label={`Crescimento mensal de usuários em ${metrics.ano}`}>{metrics.pontos.map(point => <div key={point.mes} title={`${new Date(`${point.mes.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}: ${point.novos} novos usuários, ${point.acumulado} no ano`}><i className={Number(point.novos) === 0 ? 'empty' : ''} style={{ height: Number(point.novos) === 0 ? 0 : `${Number(point.novos) / maximum * 100}%` }}/><strong>{point.novos}</strong><span>{new Date(`${point.mes.slice(0, 10)}T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase()}</span></div>)}</div></section>
    <section className="admin-permissions">
      <div><span className="eyebrow">Consulta e permissões</span><h2>Usuários cadastrados</h2></div>
      <AdminTableToolbar table={usersTable} placeholder="Pesquisar por nome ou e-mail"/>
      <div className="admin-table-wrap"><table><thead><tr><SortableHeader table={usersTable} sortKey="nome">Nome</SortableHeader><SortableHeader table={usersTable} sortKey="email">E-mail</SortableHeader><SortableHeader table={usersTable} sortKey="criado_em">Cadastro</SortableHeader><SortableHeader table={usersTable} sortKey="ultimo_login_em">Último acesso</SortableHeader><SortableHeader table={usersTable} sortKey="possui_compra">Comprou</SortableHeader></tr></thead><tbody>{data.items.map(user => <tr key={user.id}><td><strong>{user.nome}</strong></td><td>{user.email}</td><td>{date(user.criado_em)}</td><td>{dateTime(user.ultimo_login_em)}</td><td>{user.possui_compra ? 'Sim' : 'Não'}</td></tr>)}</tbody></table>{loading ? <p className="admin-empty">Carregando usuários…</p> : !data.items.length && <p className="admin-empty">Nenhum usuário encontrado.</p>}</div><AdminTablePagination table={usersTable}/>
    </section>
    <section className="admin-access-management">
      <div><span className="eyebrow">Segurança</span><h2>Permissões administrativas</h2><p>A concessão exige localizar primeiro uma conta pelo e-mail exato e confirmar a identidade encontrada.</p></div>
      <form className="admin-access-lookup" onSubmit={verifyAdminCandidate}><label>E-mail do usuário<input required type="email" autoComplete="off" placeholder="usuario@exemplo.com" value={adminEmail} onChange={event => { setAdminEmail(event.target.value); setCandidate(null); setLookupMessage('') }}/></label><button type="submit" disabled={permissionLoading}>{permissionLoading ? 'Verificando…' : 'Verificar usuário'}</button></form>
      {lookupMessage && <p className="admin-lookup-message" role="status">{lookupMessage}</p>}
      {candidate && <article className="admin-candidate"><div><ShieldCheck/><span><strong>{candidate.nome}</strong><small>{candidate.email}</small></span></div>{candidate.is_admin ? <b>Este usuário já é administrador</b> : <button type="button" onClick={grantAdmin}>Conceder permissão</button>}</article>}
      <div className="admin-list-heading administrators-heading"><h3>Administradores atuais</h3></div><AdminTableToolbar table={administratorsTable} placeholder="Pesquisar administrador"/>
      <div className="admin-table-wrap"><table><thead><tr><SortableHeader table={administratorsTable} sortKey="nome">Nome</SortableHeader><SortableHeader table={administratorsTable} sortKey="email">E-mail</SortableHeader><SortableHeader table={administratorsTable} sortKey="ultimo_login_em">Último acesso</SortableHeader><th>Ação protegida</th></tr></thead><tbody>{administratorsTable.rows.map(user => <tr key={user.id}><td><strong>{user.nome}</strong></td><td>{user.email}</td><td>{dateTime(user.ultimo_login_em)}</td><td><button type="button" className="admin-permission-button enabled" disabled={administrators.length <= 1} title={administrators.length <= 1 ? 'O sistema deve manter ao menos um administrador.' : undefined} onClick={() => revokeAdmin(user)}>Revogar permissão</button></td></tr>)}</tbody></table></div><AdminTablePagination table={administratorsTable}/>
    </section>
  </div>
}
