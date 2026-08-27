# Café com Sardinha

Aplicação full-stack com React, Vite, Node.js, Express e PostgreSQL.

## Estrutura

```text
├── docs/                # Documentação e códigos usados como referência
├── server/              # API Express (workspace npm)
│   ├── db/migrations/   # Migrações SQL ordenadas
│   ├── scripts/         # Migração e importação inicial
│   └── src/             # Configuração, middleware, rotas e serviços
├── src/                 # Front-end React
│   ├── assets/          # Imagens e outros arquivos estáticos
│   ├── components/      # Componentes e simuladores React
│   ├── data/            # Dados JSON usados como fallback
│   └── lib/             # Cálculos, relatórios e utilitários
├── index.html           # Entrada HTML do Vite
├── scripts/             # Geradores e ferramentas auxiliares de assets
├── package.json         # Scripts gerais e configuração dos workspaces
└── vite.config.js       # Vite e proxy /api
```

## Preparação do PostgreSQL

Crie um banco local:

```sql
CREATE DATABASE cafe_com_sardinha;
```

Copie `server/.env.example` para `server/.env` e informe suas credenciais:

```powershell
Copy-Item server/.env.example server/.env
```

Você pode usar `DATABASE_URL` ou os campos `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e `PGPASSWORD`.

## Primeira execução

Instale todas as dependências do front-end e da API com um único comando:

```bash
npm install
```

O projeto usa npm workspaces. Por isso, as dependências são centralizadas em
`node_modules/` na raiz; não é necessário manter outro `node_modules` dentro de
`server/`.

Crie as tabelas e importe os JSONs atuais:

```bash
npm run db:migrate
npm run db:seed
```

Inicie front-end e API juntos:

```bash
npm run dev:all
```

- Site: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`
- Área autenticada: `http://127.0.0.1:5173/minha-carteira`
- Saúde da API: `http://127.0.0.1:3001/api/health`
- Simulador PGBL x CDB: `http://127.0.0.1:5173/simulador-pgbl-cdb`
- Simulador à vista x a prazo: `http://127.0.0.1:5173/simulador-avista-aprazo`
- Sorteio computacional: produto independente em `https://melhorsorteio.com.br/`.

## Scripts

- `npm run dev`: somente o front-end.
- `npm run dev:server`: somente a API.
- `npm run dev:all`: front-end e API juntos.
- `npm run build`: gera o front-end em `dist`.
- `npm start`: inicia o Express em modo definido no `.env`.
- `npm run db:migrate`: cria as tabelas e índices.
- `npm run db:seed`: importa frases e postagens dos JSONs.

O front-end consulta `/api/frases` e `/api/postagens`. Se a API estiver desligada, os JSONs locais são usados como fallback.

## Usuários e carteiras privadas

A migração `003_usuarios_carteiras.sql` cria usuários, registros de importação e
os títulos privados. A tabela de títulos preserva todas as 15 colunas do arquivo
`Ativos.txt`, além de identificadores, vínculo com o usuário e campos de auditoria.

Defina uma chave longa e aleatória (ao menos 32 caracteres) em `AUTH_SECRET`. Para ativar o botão do
Google, crie no Google Cloud Console um OAuth Client ID do tipo **Aplicativo da
Web**, cadastre `http://localhost:5173` e `http://127.0.0.1:5173` em **Authorized
JavaScript origins** e informe somente o identificador em `GOOGLE_CLIENT_ID`.
Este projeto recebe um ID Token com Google Identity Services e não usa redirect
OAuth, portanto **Authorized redirect URIs** não é necessário no desenvolvimento
local.

Depois execute:

```bash
npm run db:migrate
npm run dev:all
```

Cada usuário pode acessar `/minha-carteira`, criar uma conta ou entrar com Google
e importar um arquivo tabulado no mesmo formato de `Ativos.txt`. A importação é
transacional e todos os gráficos e insights são recalculados no navegador.
