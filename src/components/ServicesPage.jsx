import React from 'react'
import { ArrowRight, Code2, GraduationCap, Megaphone, ShieldCheck } from 'lucide-react'
import ChildTopbar from './ChildTopbar.jsx'

const services = [
  { icon: Megaphone, title: 'Publicidade no perfil', text: 'Parcerias editoriais e publicitárias para produtos ou serviços de qualidade que façam sentido para o público do Café com Sardinha.', details: ['Avaliação de aderência ao público', 'Formato e linguagem alinhados ao perfil', 'Transparência na identificação da parceria'] },
  { icon: Code2, title: 'Desenvolvimento de software', text: 'Páginas web, aplicativos, softwares sob medida e integrações entre sistemas, da descoberta à entrega.', details: ['Levantamento de necessidades', 'Arquitetura e implementação', 'Integrações, testes e evolução'] },
  { icon: GraduationCap, title: 'Consultoria Financeira ou Educacional', text: 'Apoio para organização financeira, construção de carteira e educação aplicada a decisões reais.', details: ['Diagnóstico e organização', 'Análise de alternativas', 'Plano de ação compreensível'] },
]

export default function ServicesPage() {
  return <div className="services-page"><ChildTopbar/><section className="services-hero"><div><span className="eyebrow">Serviços</span><h1>Conhecimento aplicado a decisões e projetos reais.</h1><p>Atendimento direto, linguagem clara e escopo definido de acordo com a necessidade.</p></div></section><main className="services-main">{services.map(({ icon: Icon, title, text, details }) => <article key={title}><Icon/><div><h2>{title}</h2><p>{text}</p><ul>{details.map(item => <li key={item}><ShieldCheck/>{item}</li>)}</ul><a href={`/contato?assunto=${encodeURIComponent(title)}`}>Solicitar informações <ArrowRight/></a></div></article>)}</main></div>
}
