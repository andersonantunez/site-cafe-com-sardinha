# Café com Sardinha

Aplicação full-stack com React, Vite, Node.js, Express e PostgreSQL.

## Estrutura

```text
├── src/                 # Front-end React
├── server/              # API Express
│   ├── db/              # Migrações SQL
│   ├── scripts/         # Migração e importação inicial
│   └── src/             # Configuração, rotas e acesso ao PostgreSQL
├── dist/                # Build de produção
├── package.json         # Scripts gerais/front-end
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

As dependências já podem ser instaladas com:

```bash
npm install
npm --prefix server install
```

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
- Saúde da API: `http://127.0.0.1:3001/api/health`
- Simulador PGBL x CDB: `http://127.0.0.1:5173/simulador-pgbl-cdb`
- Simulador à vista x a prazo: `http://127.0.0.1:5173/simulador-avista-aprazo`

## Scripts

- `npm run dev`: somente o front-end.
- `npm run dev:server`: somente a API.
- `npm run dev:all`: front-end e API juntos.
- `npm run build`: gera o front-end em `dist`.
- `npm start`: inicia o Express em modo definido no `.env`.
- `npm run db:migrate`: cria as tabelas e índices.
- `npm run db:seed`: importa frases e postagens dos JSONs.

O front-end consulta `/api/frases` e `/api/postagens`. Se a API estiver desligada, os JSONs locais são usados como fallback.
