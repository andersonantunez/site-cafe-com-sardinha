# API Café com Sardinha

Back-end Node.js, Express e PostgreSQL.

## Configuração

1. Crie no PostgreSQL um banco chamado `cafe_com_sardinha`.
2. Copie `.env.example` para `.env`.
3. Preencha as credenciais locais no `.env`.
4. Na raiz do projeto, execute:

```bash
npm install
npm --prefix server install
npm run db:migrate
npm run db:seed
npm run dev:all
```

Se o navegador mostrar HTTP 502, confirme que `server/.env` existe, que
`PGPASSWORD` contém a senha real do PostgreSQL e que a API exibiu a mensagem
`API disponível em http://127.0.0.1:3001`.

Front-end: `http://127.0.0.1:5173`

API: `http://127.0.0.1:3001`

## Rotas

- `GET /api/health`
- `GET /api/frases`
- `POST /api/frases`
- `PUT /api/frases/:id`
- `DELETE /api/frases/:id`
- `GET /api/postagens`
- `GET /api/postagens/:id`
- `POST /api/postagens`
- `PUT /api/postagens/:id`
- `DELETE /api/postagens/:id`

As consultas públicas retornam somente itens com `publico = true`.

O front-end tenta carregar frases e postagens pela API. Se ela estiver indisponível, usa os JSONs locais como fallback.
