import React from 'react'
import { ArrowLeft, LogIn } from 'lucide-react'

export default function ChildTopbar({ className = 'performance-topbar' }) {
  return <header className={className}>
    <a href="/"><ArrowLeft/> Voltar ao site</a>
    <a className="child-account" href="/minha-area-restrita"><LogIn/> Acessar minha área restrita</a>
  </header>
}
