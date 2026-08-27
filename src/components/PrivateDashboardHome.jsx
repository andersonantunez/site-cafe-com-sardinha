import React from 'react'
import { ShoppingBag, WalletCards } from 'lucide-react'

export default function PrivateDashboardHome({ user }) {
  return <main className="private-dashboard private-home">
    <section className="private-welcome"><div><span className="eyebrow">Minha área restrita</span><h1>Olá, {user.nome.split(' ')[0]}.</h1><p>Escolha o que deseja consultar ou atualizar.</p></div></section>
    <section className="private-menu-grid" aria-label="Opções da área restrita">
      <a href="/minha-area-restrita/detalhamento"><WalletCards/><div><h2>Detalhamento da carteira</h2><p>Importe títulos, acompanhe gráficos, rentabilidade, liquidados e compartilhamento.</p></div></a>
      <a href="/minha-conta/compras"><ShoppingBag/><div><h2>Minhas compras</h2><p>Consulte produtos, serviços, assinaturas e arquivos digitais adquiridos.</p></div></a>
    </section>
  </main>
}
