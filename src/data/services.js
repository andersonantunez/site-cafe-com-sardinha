import { Code2, GraduationCap, Megaphone, Workflow } from 'lucide-react'

const contact = subject => `/contato?assunto=${encodeURIComponent(subject)}`

export const services = [
  {
    id: 'publicidade',
    navLabel: 'Publicidade',
    icon: Megaphone,
    title: 'Publicidade no perfil',
    summary: 'Parcerias editoriais e publicitárias para produtos e serviços de qualidade que façam sentido para o público do Café com Sardinha.',
    highlights: ['Aderência ao público', 'Conteúdo alinhado ao perfil', 'Transparência nas parcerias'],
    contactHref: contact('Publicidade no perfil'),
    intro: 'Parcerias editoriais e publicitárias para produtos, empresas ou serviços de qualidade que tenham aderência ao público do Café com Sardinha.',
    description: 'O objetivo não é simplesmente divulgar uma marca, mas apresentar produtos e soluções que possam efetivamente gerar valor para quem acompanha o conteúdo.',
    groups: [{
      title: 'O serviço pode envolver',
      items: ['Avaliação de aderência do produto ao público', 'Desenvolvimento do formato da publicação', 'Produção de conteúdo patrocinado', 'Divulgação de produtos, serviços ou ferramentas', 'Campanhas especiais e parcerias de conteúdo', 'Linguagem alinhada ao perfil e ao público', 'Transparência na identificação da publicidade'],
    }],
  },
  {
    id: 'software',
    navLabel: 'Software',
    icon: Code2,
    title: 'Desenvolvimento de Software',
    summary: 'Soluções digitais sob medida, de ferramentas internas a sistemas, aplicações e integrações completas.',
    highlights: ['Sistemas Web e aplicativos', 'Automação e integração', 'Desenvolvimento sob medida'],
    contactHref: contact('Desenvolvimento de software'),
    intro: 'Desenvolvimento de soluções digitais sob medida para empresas, profissionais e projetos que precisam transformar processos manuais em sistemas mais organizados, seguros e eficientes.',
    description: 'O trabalho pode abranger desde pequenas ferramentas internas até aplicações completas integradas a outros sistemas.',
    groups: [
      { title: 'Algumas possibilidades', items: ['Páginas e sistemas Web', 'Aplicativos', 'Sistemas administrativos', 'Portais e áreas restritas', 'Dashboards e relatórios', 'Automatização de tarefas', 'Integrações entre sistemas', 'Integração com APIs', 'Processamento e importação de dados', 'Desenvolvimento de ferramentas internas', 'Modernização de sistemas existentes'] },
      { title: 'Etapas do trabalho', items: ['Levantamento das necessidades', 'Análise das regras de negócio', 'Definição da arquitetura', 'Desenvolvimento', 'Integração com outros sistemas', 'Testes', 'Implantação'] },
    ],
  },
  {
    id: 'processos',
    navLabel: 'Processos e Otimização',
    icon: Workflow,
    title: 'Gestão, Melhoria e Otimização de Processos',
    summary: 'Análise de processos e aplicação de tecnologia, dados e técnicas de otimização para aumentar eficiência e melhorar decisões.',
    highlights: ['Análise e melhoria de processos', 'Automação e integração', 'Pesquisa Operacional e otimização'],
    contactHref: contact('Gestão Melhoria e Otimização de Processos'),
    intro: 'Análise de processos administrativos, operacionais, logísticos ou produtivos para identificar gargalos, desperdícios, atividades redundantes e oportunidades de melhoria, automação e otimização.',
    description: 'O trabalho parte da compreensão do processo atual, das suas restrições e dos objetivos envolvidos para propor soluções que tornem a operação mais simples, eficiente, confiável e mensurável.',
    groups: [
      { title: 'Melhoria de processos', items: ['Mapeamento e análise de processos', 'Identificação de gargalos e desperdícios', 'Revisão de fluxos de trabalho', 'Análise de etapas, responsabilidades e recursos', 'Padronização e simplificação de procedimentos', 'Definição de indicadores de desempenho', 'Identificação de oportunidades de automação', 'Integração entre processos e sistemas', 'Desenvolvimento de novos fluxos de trabalho'] },
      { title: 'Otimização e Pesquisa Operacional', description: 'Quando necessário, podem ser utilizadas técnicas de Pesquisa Operacional, modelagem matemática, algoritmos, análise de dados e simulação para encontrar melhores soluções em problemas com muitas variáveis, restrições ou possibilidades de decisão.', items: ['Modelagem de problemas de otimização', 'Análise e comparação de cenários', 'Otimização de rotas e logística', 'Planejamento e sequenciamento de produção', 'Distribuição e alocação de recursos', 'Formação de cargas e paletização', 'Problemas de corte e aproveitamento de materiais', 'Gestão e dimensionamento de estoques', 'Escalas e alocação de pessoas', 'Redução de tempos, custos e desperdícios', 'Maximização da capacidade produtiva', 'Apoio quantitativo à tomada de decisão'] },
    ],
  },
  {
    id: 'consultoria',
    navLabel: 'Consultoria',
    icon: GraduationCap,
    title: 'Consultoria Financeira ou Educacional',
    summary: 'Apoio para organização financeira, análise de alternativas, construção de carteira e educação aplicada à decisão.',
    highlights: ['Diagnóstico e organização', 'Análise de alternativas', 'Plano de ação compreensível'],
    contactHref: contact('Consultoria Financeira ou Educacional'),
    intro: 'Apoio para pessoas que desejam organizar melhor suas finanças, compreender investimentos e tomar decisões com maior consciência.',
    description: 'A proposta é transformar conceitos financeiros muitas vezes apresentados de forma excessivamente complexa em análises compreensíveis e aplicáveis à realidade de cada pessoa.',
    groups: [{
      title: 'O serviço pode envolver',
      items: ['Diagnóstico da situação financeira', 'Organização financeira', 'Construção e análise de carteira', 'Comparação entre alternativas de investimento', 'Avaliação de risco', 'Diversificação', 'Análise de produtos financeiros', 'Educação financeira', 'Simulações', 'Planejamento de objetivos', 'Apoio à tomada de decisão'],
    }],
    note: 'O trabalho possui caráter educacional e analítico, fornecendo informações e ferramentas para apoiar decisões financeiras de forma mais consciente.',
  },
]
