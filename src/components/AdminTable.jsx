import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search, Settings } from 'lucide-react'

const text = value => String(value ?? '').toLocaleLowerCase('pt-BR')
const compare = (left, right) => {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), 'pt-BR', { numeric: true, sensitivity: 'base' })
}

export function useAdminTable(items, { searchFields = [], initialSort = 'id', initialDirection = 'asc' } = {}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(15)
  const [sortKey, setSortKey] = useState(initialSort)
  const [sortDirection, setSortDirection] = useState(initialDirection)
  const filtered = useMemo(() => {
    const term = text(searchTerm.trim())
    if (!term) return items
    return items.filter(item => searchFields.some(field => text(typeof field === 'function' ? field(item) : item[field]).includes(term)))
  }, [items, searchFields, searchTerm])
  const sorted = useMemo(() => [...filtered].sort((left, right) => {
    const leftValue = typeof sortKey === 'function' ? sortKey(left) : left[sortKey]
    const rightValue = typeof sortKey === 'function' ? sortKey(right) : right[sortKey]
    return compare(leftValue, rightValue) * (sortDirection === 'asc' ? 1 : -1)
  }), [filtered, sortDirection, sortKey])
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  useEffect(() => { if (page !== safePage) setPage(safePage) }, [page, safePage])
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const setPageSize = value => { setPageSizeState(Number(value)); setPage(1) }
  const applySearch = value => { setSearchTerm(value); setPage(1) }
  const toggleSort = key => {
    if (sortKey === key) setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDirection('asc') }
    setPage(1)
  }
  return { rows, total, page: safePage, pageSize, searchTerm, sortKey, sortDirection, setPage, setPageSize, applySearch, toggleSort }
}

export function AdminTableToolbar({ table, placeholder = 'Pesquisar registros' }) {
  const [draft, setDraft] = useState(table.searchTerm || '')
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => { setDraft(table.searchTerm || '') }, [table.searchTerm])
  return <div className="admin-table-toolbar">
    <div className="admin-table-toolbar-main"><form onSubmit={event => { event.preventDefault(); table.applySearch(draft.trim()) }}><label><Search/><input type="search" placeholder={placeholder} value={draft} onChange={event => setDraft(event.target.value)}/></label><button type="submit">Pesquisar</button>{(draft || table.searchTerm) && <button type="button" className="secondary" onClick={() => { setDraft(''); table.applySearch('') }}>Limpar</button>}</form><div className="admin-table-meta"><strong>{table.total.toLocaleString('pt-BR')}</strong><span>{table.total === 1 ? 'registro recuperado' : 'registros recuperados'}</span><button type="button" className={settingsOpen ? 'active' : ''} aria-label="Configurar tabela" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(current => !current)}><Settings/></button></div></div>
    {settingsOpen && <div className="admin-table-settings"><span>Configuração da tabela</span><label>Registros por página<select value={table.pageSize} onChange={event => table.setPageSize(Number(event.target.value))}><option value="10">10</option><option value="15">15</option><option value="25">25</option><option value="50">50</option></select></label></div>}
  </div>
}

export function SortableHeader({ table, sortKey, children, className = '' }) {
  const active = table.sortKey === sortKey
  return <th className={className}><button type="button" className={`admin-sort-header ${active ? 'active' : ''}`} onClick={() => table.toggleSort(sortKey)}>{children}<ChevronsUpDown/>{active && <span className="sr-only">{table.sortDirection === 'asc' ? 'ordem crescente' : 'ordem decrescente'}</span>}</button></th>
}

export function AdminTablePagination({ table }) {
  const totalPages = Math.max(1, Math.ceil(table.total / table.pageSize))
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(value => value === 1 || value === totalPages || Math.abs(value - table.page) <= 2)
  const visible = pages.reduce((result, value, index) => {
    if (index && value - pages[index - 1] > 1) result.push(`gap-${value}`)
    result.push(value)
    return result
  }, [])
  return <nav className="admin-pagination google-pagination" aria-label="Paginação"><button type="button" className="page-arrow" aria-label="Página anterior" disabled={table.page <= 1} onClick={() => table.setPage(table.page - 1)}><ChevronLeft/></button>{visible.map(value => typeof value === 'string' ? <i key={value}>…</i> : <button type="button" key={value} className={value === table.page ? 'current' : ''} aria-current={value === table.page ? 'page' : undefined} onClick={() => table.setPage(value)}>{value}</button>)}<button type="button" className="page-arrow" aria-label="Próxima página" disabled={table.page >= totalPages} onClick={() => table.setPage(table.page + 1)}><ChevronRight/></button></nav>
}
