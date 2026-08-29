# Pagamentos, conteúdo pago e contato

## Gmail

1. Ative a verificação em duas etapas na conta `cafecomsardinha@gmail.com`.
2. Em **Senhas de app** da Conta Google, gere uma senha exclusiva para este sistema.
3. Informe essa senha somente em `SMTP_PASSWORD` no arquivo `server/.env`.
4. Mantenha `SMTP_USER=cafecomsardinha@gmail.com`, porta `465` e `SMTP_SECURE=true`.

Nunca use a senha normal da conta e nunca envie `SMTP_PASSWORD` ao navegador. Consulte a
[documentação oficial de senhas de app do Google](https://support.google.com/mail/answer/185833?hl=pt-BR).

## Cloudflare Turnstile

1. Crie um widget **Managed** no painel do Cloudflare Turnstile.
2. Cadastre o domínio de produção e os hosts de teste permitidos pelo Cloudflare.
3. Copie a chave pública para `TURNSTILE_SITE_KEY`.
4. Copie o segredo somente para `TURNSTILE_SECRET_KEY` no backend.

O token é validado pelo backend no endpoint oficial `siteverify`. O contato também aplica
honeypot, formulário assinado com tempo mínimo, limites por IP/e-mail e validação de tamanho.
Sem as chaves e o SMTP, o formulário falha de forma segura e não envia mensagens.

## Asaas Sandbox

1. Entre ou crie uma conta no [Sandbox do Asaas](https://sandbox.asaas.com/).
2. Gere uma API key do Sandbox e informe-a em `ASAAS_API_KEY`.
3. Mantenha `ASAAS_ENV=sandbox` e `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`.
4. Crie no Asaas um webhook de Checkout apontando para `https://SEU-DOMINIO/api/webhooks/asaas`.
5. Gere um token aleatório de 32 a 255 caracteres, informe o mesmo valor no webhook e em
   `ASAAS_WEBHOOK_TOKEN`. Não reutilize a API key.
6. Assine os eventos `CHECKOUT_CREATED`, `CHECKOUT_PAID`, `CHECKOUT_CANCELED` e
   `CHECKOUT_EXPIRED`.
7. Cadastre preços positivos no Admin para os artigos e para o produto ou suas variantes.
8. Execute `npm run db:migrate`, reinicie a API e teste PIX/cartão no Sandbox.

O retorno para `/compra/sucesso` informa apenas que o pagamento está sendo processado.
Somente `CHECKOUT_PAID`, recebido com o header `asaas-access-token` correto, marca o pedido
como pago e concede acesso. O ID do evento possui restrição única para garantir idempotência.

Para produção, troque `ASAAS_ENV=production`, use a API key de produção e remova ou ajuste
`ASAAS_API_URL` para `https://api.asaas.com/v3`; nenhuma mudança de código é necessária.

## Teste funcional

- Artigo: cadastre um preço, entre com um usuário comum, clique em **Comprar acesso**,
  conclua o Sandbox e confira o pedido em **Minhas compras** depois de `CHECKOUT_PAID`.
- Produto: cadastre o preço padrão ou da variante, selecione cor/tamanho e clique em
  **Comprar**. O checkout usa o preço relido do PostgreSQL.
- Proteção: sem direito de acesso, `GET /api/artigos/:id` retorna `conteudo_url: null`;
  depois do webhook pago, o mesmo endpoint autenticado retorna o link integral.
