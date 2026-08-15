# Documentação Técnica — Café com Sardinha

## Visão geral

O site Café com Sardinha é uma aplicação front-end responsiva executada inteiramente no navegador. A solução apresenta informações do perfil, simuladores, relatórios de rentabilidade, produtos, artigos, livros, frases, postagens do X e depoimentos.

O projeto utiliza um back-end Node.js com Express e PostgreSQL. Frases e postagens são carregadas pela API, com os arquivos JSON locais mantidos como fallback quando o servidor não estiver disponível.

## Tecnologias utilizadas

- **React:** organização da página em componentes e controle das funcionalidades interativas.
- **JavaScript com JSX:** lógica da aplicação, leitura dos arquivos JSON, filtros e eventos.
- **Vite:** servidor de desenvolvimento e geração da versão otimizada de produção.
- **HTML5:** estrutura inicial, metadados e carregamento da aplicação.
- **CSS responsivo:** identidade visual, layouts, animações e adaptação para diferentes telas.
- **JSON:** armazenamento local das frases e dos links das postagens.
- **Lucide React:** biblioteca de ícones utilizada na interface.
- **Google Fonts:** carregamento das famílias tipográficas Inter, Outfit e Lora.
- **Tailwind CSS:** instalado e integrado ao processo de compilação do projeto.
- **Node.js e Express:** API REST e servidor da aplicação em produção.
- **PostgreSQL:** persistência das frases e postagens.
- **node-postgres (`pg`):** pool de conexões e consultas parametrizadas ao banco.
- **Helmet e CORS:** cabeçalhos de segurança e controle das origens permitidas.
- **dotenv:** leitura das credenciais e configurações do arquivo `server/.env`.

## Estrutura principal

```text
site-cafe-com-sardinha/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── styles.css
│   ├── components/
│   ├── data/
│   │   ├── frases.json
│   │   └── postagens.json
│   ├── lib/
│   └── assets/images/
├── server/
│   ├── db/
│   ├── scripts/
│   └── src/
└── dist/
```

### `index.html`

Documento HTML inicial. Contém:

- metadados da página;
- configuração de codificação UTF-8;
- configuração responsiva para dispositivos móveis;
- descrição do site;
- importação das fontes do Google;
- elemento `#root` em que o React é renderizado.

### `src/main.jsx`

É o ponto de entrada da aplicação React. Esse arquivo concentra a estrutura e o comportamento das seções:

- navegação e menu móvel;
- banner e identificação do perfil;
- apresentação;
- simuladores;
- histórico de rentabilidade anual e mensal;
- Achadinhos do Café;
- artigos e livros;
- carrossel de frases;
- postagens do X;
- depoimentos;
- rodapé e contato.

### `src/styles.css`

Contém toda a apresentação visual do site:

- paleta em azul, laranja e marrom;
- banner e logo;
- cartões, painéis e botões;
- cartas de baralho das postagens;
- efeitos ao passar o mouse;
- tipografia e espaçamentos;
- regras responsivas para desktop, tablet e celular.

### `src/assets/images`

Armazena as imagens utilizadas no site. Entre os principais recursos estão:

- `logo3.png`: logo exibido no perfil;
- `fundo-cabecalho4.png`: imagem do banner;
- `cafe-quente-caricatura.png`: ilustração transparente da caneca com sardinha.

Durante a compilação, o Vite processa esses arquivos e gera versões com nomes próprios na pasta `dist/assets`.

## Carrossel automático de frases

As frases ficam armazenadas em:

```text
src/data/frases.json
```

O arquivo é importado diretamente pelo React:

```jsx
import quotesData from './data/frases.json'

const quotes = quotesData.frases.map(({ id, texto }) => ({
  id,
  text: texto,
}))
```

O índice da frase atual é controlado com `useState`. Um `useEffect` cria um temporizador que avança o índice a cada oito segundos:

```jsx
useEffect(() => {
  const interval = window.setInterval(() => {
    setQuoteIndex(current => (current + 1) % quotes.length)
  }, 8000)

  return () => window.clearInterval(interval)
}, [])
```

O operador `%` faz o carrossel retornar à primeira frase após exibir a última. Os botões de navegação manual também alteram o mesmo índice.

As frases são apresentadas em itálico com a fonte **Lora**, usando Georgia e serifas do sistema como alternativas caso a fonte externa não seja carregada.

## Simulador PGBL x CDB

A segunda página está disponível em:

```text
/simulador-pgbl-cdb
```

O núcleo matemático foi portado do script `docs/references/pgbl_x_cdb.py` para JavaScript em `src/lib/pgblCdbSimulation.js`. A interface está em `src/components/PgblCdbSimulator.jsx`.

O cálculo é executado no navegador porque não precisa de Pandas ou Matplotlib para funcionar. Essa abordagem fornece resposta imediata, mantém as premissas financeiras no dispositivo do usuário e permite que o simulador funcione mesmo quando a API estiver desligada.

O simulador mantém aportes mensais em lotes separados e considera:

- aporte próprio;
- CDI anual estimado;
- percentual do CDI de cada produto;
- contrapartida do empregador e vesting;
- taxas administrativas e carregamento;
- IR regressivo da renda fixa tributável;
- renda fixa isenta;
- tributação regressiva ou progressiva estimada do PGBL;
- benefício fiscal limitado pela renda tributável;
- reinvestimento do benefício fiscal;
- checkpoints de avaliação ou resgate efetivo.

O gráfico é produzido como SVG responsivo pelo próprio React, sem biblioteca adicional. As entradas recebem validação de tipo e faixas máximas para impedir valores negativos, incompatíveis ou excessivos.

As premissas são editáveis e não representam previsão ou recomendação financeira.

## Simulador à vista x a prazo

A página está disponível em `/simulador-avista-aprazo`. O motor em `src/lib/cashInstallmentSimulation.js` foi baseado em `docs/references/avista_x_aprazo.py`, com correção da inconsistência que não descontava as parcelas do investimento.

O usuário escolhe se as parcelas são pagas pela renda mensal ou retiradas do investimento. No primeiro modo, o cenário à vista investe mensalmente o equivalente à parcela, mantendo o mesmo esforço de caixa. O simulador permite configurar preço, desconto, total parcelado, entrada, quantidade de parcelas, prazo adicional, CDI, rentabilidade, taxas, carregamento, IR e momento dos fluxos.

A interface apresenta gráfico, resultado líquido e memória de cálculo em PDF.

## Postagens do X

Os dados das postagens ficam em:

```text
src/data/postagens.json
```

Cada registro possui:

```json
{
  "id": 1,
  "url": "https://x.com/CafeComSardinha/status/...",
  "publico": true
}
```

Antes da renderização, a aplicação filtra apenas os registros públicos:

```jsx
const posts = postsData.postagens.filter(post => post.publico)
```

Cada registro gera uma carta clicável que abre a publicação original no X em uma nova guia.

O JSON atual contém apenas identificador, endereço e visibilidade. Para exibir o conteúdo textual dentro do site sem depender da API do X, cada objeto pode receber um campo `texto`:

```json
{
  "id": 1,
  "url": "https://x.com/CafeComSardinha/status/...",
  "texto": "Conteúdo da postagem",
  "publico": true
}
```

## Visual de cartas de baralho

As postagens são apresentadas como cartas de baralho temáticas. Os naipes são definidos em JavaScript:

```jsx
const cardSuits = ['♠', '♥', '♦', '♣']
```

O naipe é escolhido com base na posição da postagem. Copas e ouros recebem a cor laranja; espadas e paus recebem a cor azul.

O CSS implementa:

- proporção vertical de carta;
- cantos arredondados;
- número e naipe espelhados nos cantos;
- emblema central “CS — Café com Sardinha”;
- pequenas rotações alternadas;
- elevação e alinhamento ao passar o mouse;
- cinco colunas no desktop, três no tablet e duas no celular.

## Responsividade

O site utiliza media queries no CSS para reorganizar o conteúdo conforme a largura da tela.

### Desktop

- navegação horizontal completa;
- grades com múltiplas colunas;
- cinco cartas de postagem por linha.

### Tablet

- menu compacto;
- redução do banner;
- grades reorganizadas;
- três cartas de postagem por linha.

### Celular

- menu móvel;
- seções em uma coluna;
- tipografia e espaçamentos reduzidos;
- duas cartas de postagem por linha;
- listas e produtos adaptados para telas menores.

## Imagem transparente da caneca

A ilustração da caneca foi criada como um recurso raster e posteriormente teve o fundo removido. O arquivo final é um PNG com canal alfa:

```text
src/assets/images/cafe-quente-caricatura.png
```

O fundo transparente permite que a imagem seja utilizada sobre diferentes cores e texturas sem exibir uma moldura retangular. A borda e a sombra do elemento `coffee-figure` também foram removidas no CSS.

## Execução local

### Requisitos

- Node.js;
- npm.

### Instalação das dependências

```bash
npm install
```

### Servidor de desenvolvimento

```bash
npm run dev
```

Por padrão, o Vite disponibiliza o site em um endereço local semelhante a:

```text
http://127.0.0.1:5173
```

As alterações feitas nos arquivos são atualizadas automaticamente durante o desenvolvimento.

## Compilação para produção

Execute:

```bash
npm run build
```

O Vite cria a versão final otimizada na pasta:

```text
dist/
```

Essa pasta contém HTML, CSS, JavaScript e imagens processadas, prontos para hospedagem.

Para visualizar localmente a versão compilada:

```bash
npm run preview
```

## Publicação

Como o projeto é estático, pode ser publicado em serviços como:

- Vercel;
- Netlify;
- GitHub Pages;
- Cloudflare Pages;
- hospedagem convencional com suporte a arquivos estáticos.

Na hospedagem convencional, normalmente basta enviar o conteúdo gerado dentro de `dist` para a pasta pública do servidor.

## Back-end e PostgreSQL

O back-end está localizado em `server`. A API disponibiliza rotas REST para frases e postagens, usa consultas parametrizadas e retorna apenas registros públicos nas consultas abertas.

As credenciais ficam em `server/.env`, que é ignorado pelo Git. O modelo das variáveis está em `server/.env.example`.

As tabelas são criadas com `npm run db:migrate`. O comando `npm run db:seed` importa os JSONs atuais para o PostgreSQL.

Durante o desenvolvimento, o Vite encaminha chamadas de `/api` para `http://127.0.0.1:3001`. O comando `npm run dev:all` inicia front-end e API simultaneamente.

## Limitações atuais

- Não existe painel administrativo para atualizar conteúdos, embora a API já ofereça rotas CRUD.
- O texto das postagens não é obtido automaticamente do X.
- Simuladores, produtos, artigos, livros e depoimentos ainda contêm itens demonstrativos.
- O formulário de contato é um link de e-mail, e não um envio processado por servidor.

## Próximas evoluções possíveis

- adicionar textos reais ao JSON das postagens;
- criar páginas individuais para artigos;
- implementar os simuladores financeiros;
- cadastrar produtos e livros reais;
- adicionar um gerenciador de conteúdo;
- incluir métricas de acesso;
- otimizar o tamanho das imagens;
- configurar domínio, hospedagem e SEO avançado.
## Simulador de renda fixa

A rota `/simulador-renda-fixa` oferece um fluxo em duas etapas: primeiro o valor e as projeções de IPCA, Selic e CDI para os cenários Conservador, Realista e Otimista; depois os títulos que serão comparados. O cenário Realista é selecionado por padrão. Ao adicionar ou remover um produto, o React recalcula a carteira e atualiza lista, ordenação e gráfico automaticamente.

A implementação utilizada pelo site está em `src/lib/fixedIncomeSimulation.js`. Ela reproduz no navegador as fórmulas de prazo em dias úteis, IR regressivo, isenção, taxa anual e rentabilidade líquida acumulada. Assim, a página funciona sem Express, PostgreSQL ou credenciais. O módulo PostgreSQL permanece no projeto como alternativa para uma futura persistência ou conferência no servidor.
