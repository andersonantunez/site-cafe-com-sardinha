INSERT INTO conteudos_site (tipo,titulo,subtitulo,conteudo,ativo,ordem)
SELECT
  'sobre',
  'Prazer, meu codinome é Café.',
  '',
  'Sou técnico em Contabilidade e Programação, formado em Web Design e Programação, com MBA em Banco de Dados Oracle e mestrado em Administração. Desenvolvo software desde os 13 anos e invisto no mercado financeiro desde 2010.

Meus principais temas de interesse e atuação são Mercado Financeiro, Educação Financeira, Aleatoriedade Computacional, Estatística, Planejamento e Processos Organizacionais e Pesquisa Operacional.

Tenho perfil criativo, humor ácido e boa leitura de contextos. Gosto de transformar assuntos complexos em textos claros, provocativos e acessíveis.',
  TRUE,
  0
WHERE NOT EXISTS (SELECT 1 FROM conteudos_site WHERE tipo = 'sobre');
