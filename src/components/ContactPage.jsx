import React, { useEffect, useRef, useState } from 'react'
import { Mail, Send, ShieldCheck } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'

const initialForm = subject => ({ name: '', email: '', subject, message: '', website: '' })

export default function ContactPage() {
  const initialSubject = (new URLSearchParams(window.location.search).get('assunto') || '').slice(0, 240)
  const [form, setForm] = useState(() => initialForm(initialSubject))
  const [security, setSecurity] = useState({ siteKey: '', formToken: '', turnstileToken: '', error: '' })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)
  const widgetContainer = useRef(null)
  const widgetId = useRef(null)

  const loadConfig = () => fetch('/api/contato/config', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Não foi possível preparar o formulário seguro.')
    return response.json()
  }).then(data => setSecurity(current => ({ ...current, siteKey: data.siteKey || '', formToken: data.formToken || '', error: data.siteKey ? '' : 'A verificação anti-spam ainda não foi configurada.' }))).catch(error => setSecurity(current => ({ ...current, error: error.message })))

  useEffect(() => { loadConfig() }, [])
  useEffect(() => {
    if (!security.siteKey || !widgetContainer.current) return
    const render = () => {
      if (!window.turnstile || widgetId.current != null) return
      widgetId.current = window.turnstile.render(widgetContainer.current, {
        sitekey: security.siteKey,
        theme: 'light',
        callback: token => setSecurity(current => ({ ...current, turnstileToken: token, error: '' })),
        'expired-callback': () => setSecurity(current => ({ ...current, turnstileToken: '' })),
        'error-callback': () => setSecurity(current => ({ ...current, turnstileToken: '', error: 'Não foi possível carregar a verificação anti-spam.' })),
      })
    }
    if (window.turnstile) { render(); return }
    let script = document.querySelector('script[data-cafe-turnstile]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.cafeTurnstile = 'true'
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    return () => script.removeEventListener('load', render)
  }, [security.siteKey])

  const submit = async event => {
    event.preventDefault()
    if (!security.turnstileToken) { setStatus('Conclua a verificação anti-spam.'); return }
    setSending(true); setStatus('Enviando…')
    try {
      const response = await fetch('/api/contato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, formToken: security.formToken, turnstileToken: security.turnstileToken }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.erro || 'Não foi possível enviar a mensagem.')
      setForm(initialForm(''))
      setStatus('Mensagem enviada com sucesso. Entraremos em contato pelo e-mail informado.')
      if (window.turnstile && widgetId.current != null) window.turnstile.reset(widgetId.current)
      setSecurity(current => ({ ...current, turnstileToken: '' }))
      await loadConfig()
    } catch (error) {
      setStatus(error.message)
      if (window.turnstile && widgetId.current != null) window.turnstile.reset(widgetId.current)
      setSecurity(current => ({ ...current, turnstileToken: '' }))
      await loadConfig()
    } finally { setSending(false) }
  }
  return <div className="contact-page"><ChildTopbar/><section className="contact-hero"><Mail/><div><span className="eyebrow">Contato</span><h1>Vamos conversar.</h1><p>Use o formulário para publicidade, projetos, consultoria ou dúvidas.</p></div></section><main className="contact-main"><form onSubmit={submit}><label>Nome<input required minLength="2" maxLength="120" autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>E-mail<input required type="email" maxLength="254" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>Assunto<input required minLength="3" maxLength="240" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })}/></label><label>Mensagem<textarea required minLength="10" maxLength="3000" rows="8" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })}/></label><label className="contact-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })}/></label><div className="turnstile-widget" ref={widgetContainer}/>{security.error && <p className="contact-security-error" role="alert">{security.error}</p>}<button disabled={sending || !security.formToken || !security.siteKey}><Send/> {sending ? 'Enviando…' : 'Enviar mensagem'}</button>{status && <p className="contact-status" role="status">{status}</p>}</form><aside><ShieldCheck/><strong>Segurança e privacidade</strong><p>O formulário usa Cloudflare Turnstile, campo anti-robô, limite por rede e e-mail e validação integral no servidor. Seu e-mail é usado somente para responder à mensagem.</p></aside></main></div>
}
