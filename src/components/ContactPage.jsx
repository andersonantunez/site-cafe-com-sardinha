import React, { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'

export default function ContactPage() {
  const initialSubject = new URLSearchParams(window.location.search).get('assunto') || ''
  const [form, setForm] = useState({ nome: '', email: '', assunto: initialSubject.slice(0, 240), mensagem: '', website: '' })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const submit = async event => {
    event.preventDefault(); setSending(true); setStatus('Enviando…')
    try {
      const response = await fetch('/api/contato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.')
      setForm({ nome: '', email: '', assunto: '', mensagem: '', website: '' }); setStatus('Mensagem recebida com sucesso. Entraremos em contato pelo e-mail informado.')
    } catch (error) { setStatus(error.message) } finally { setSending(false) }
  }
  return <div className="contact-page"><ChildTopbar/><section className="contact-hero"><Mail/><div><span className="eyebrow">Contato</span><h1>Vamos conversar.</h1><p>Use o formulário para publicidade, projetos, consultoria ou dúvidas.</p></div></section><main className="contact-main"><form onSubmit={submit}><label>Nome<input required minLength="2" maxLength="160" autoComplete="name" value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })}/></label><label>E-mail<input required type="email" maxLength="320" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>Assunto<input required minLength="3" maxLength="240" value={form.assunto} onChange={event => setForm({ ...form, assunto: event.target.value })}/></label><label>Mensagem<textarea required minLength="10" maxLength="5000" rows="8" value={form.mensagem} onChange={event => setForm({ ...form, mensagem: event.target.value })}/></label><label className="contact-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })}/></label><button disabled={sending}><Send/> {sending ? 'Enviando…' : 'Enviar mensagem'}</button>{status && <p className="contact-status" role="status">{status}</p>}</form><aside><strong>Segurança e privacidade</strong><p>Os dados são validados no servidor, persistidos por consultas parametrizadas e protegidos por limite de tentativas. O endereço de rede é armazenado somente como hash para prevenção de abuso.</p></aside></main></div>
}
