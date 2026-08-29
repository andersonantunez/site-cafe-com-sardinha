import React from 'react'
import { ArrowRight, Check, Lightbulb } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'
import { services } from '../data/services.js'

function ServiceList({ items }) {
  return <ul className="service-list">{items.map(item => <li key={item}><Check/>{item}</li>)}</ul>
}

function ServiceSection({ service, index }) {
  const Icon = service.icon
  return <section id={service.id} className={`service-detail service-detail-${index + 1}`}>
    <div className="service-detail-heading"><div className="service-detail-icon"><Icon/></div><div><span className="eyebrow">Serviço {String(index + 1).padStart(2, '0')}</span><h2>{service.title}</h2></div></div>
    <div className="service-detail-copy"><p className="service-detail-intro">{service.intro}</p><p>{service.description}</p></div>
    <div className={`service-groups ${service.groups.length > 1 ? 'two-groups' : ''}`}>{service.groups.map(group => <div className="service-group" key={group.title}><h3>{group.title}</h3>{group.description && <p>{group.description}</p>}<ServiceList items={group.items}/></div>)}</div>
    {service.note && <aside className="service-note"><Lightbulb/><p>{service.note}</p></aside>}
    <a className="service-cta" href={service.contactHref}>Solicitar informações <ArrowRight/></a>
  </section>
}

export default function ServicesPage() {
  return <div className="services-page">
    <ChildTopbar/>
    <header className="services-hero">
      <div><span className="eyebrow">Serviços</span><h1>Soluções práticas para problemas reais.</h1><p>Soluções práticas em tecnologia, finanças, processos e otimização, desenvolvidas a partir de problemas reais e com foco em resultados mensuráveis.</p><p>A proposta é combinar conhecimento técnico, análise de dados e experiência prática para desenvolver soluções adequadas à realidade de cada projeto.</p></div>
    </header>
    <nav className="services-anchor-nav" aria-label="Navegação dos serviços"><div>{services.map(service => <a href={`#${service.id}`} key={service.id}>{service.navLabel}</a>)}</div></nav>
    <main className="services-main">
      {services.map((service, index) => <ServiceSection service={service} index={index} key={service.id}/>) }
      <section className="services-contact-cta"><span className="eyebrow">Vamos conversar</span><h2>Tem um problema que não se encaixa exatamente nesses serviços?</h2><p>Muitos projetos começam com um problema específico que ainda não possui uma solução claramente definida.</p><p>Se existe um processo demorado, uma atividade repetitiva, uma decisão difícil de otimizar ou uma ideia de sistema que precisa sair do papel, podemos analisar o problema e avaliar possíveis caminhos.</p><a className="service-cta" href="/contato?assunto=Quero%20discutir%20um%20projeto">Descrever meu projeto <ArrowRight/></a></section>
    </main>
  </div>
}
