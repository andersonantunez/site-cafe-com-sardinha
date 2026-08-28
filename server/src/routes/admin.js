import { Router } from 'express'
import { query } from '../config/database.js'
import { requireAuth } from '../services/authService.js'
import { requireAdmin } from '../services/adminService.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

const contentTypes = new Set([
  'sobre', 'achadinho', 'livro', 'artigo', 'frase', 'postagem', 'depoimento',
])

const validUrl = (value, { required = false } = {}) => {
  if (!value) return !required
  if (value.startsWith('/') && !required) return true
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const optionalMoney = value => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}

const contentInput = body => ({
  tipo: String(body.tipo || '').trim(),
  titulo: String(body.titulo || '').trim(),
  subtitulo: String(body.subtitulo || '').trim(),
  conteudo: String(body.conteudo || '').trim(),
  url: String(body.url || '').trim(),
  imagemUrl: String(body.imagemUrl || body.imagem_url || '').trim(),
  autor: String(body.autor || '').trim(),
  fonte: String(body.fonte || '').trim(),
  loja: String(body.loja || '').trim(),
  categoria: String(body.categoria || '').trim(),
  preco: optionalMoney(body.preco),
  precoAnterior: optionalMoney(body.precoAnterior ?? body.preco_anterior),
  destaque: body.destaque === true,
  ativo: body.ativo !== false,
  ordem: Number.isInteger(Number(body.ordem)) ? Number(body.ordem) : 0,
  metadados: body.metadados && typeof body.metadados === 'object' && !Array.isArray(body.metadados)
    ? body.metadados
    : {},
})

const listQueries = {
  sobre: `SELECT id,'sobre' AS tipo,titulo,subtitulo,conteudo,url,imagem_url,
    NULL::text AS autor,NULL::text AS fonte,NULL::text AS loja,NULL::text AS categoria,
    NULL::numeric AS preco,NULL::numeric AS preco_anterior,FALSE AS destaque,
    ativo,ordem,criado_em,atualizado_em FROM conteudos_site ORDER BY ordem,id`,
  frase: `SELECT id,'frase' AS tipo,texto AS titulo,'' AS subtitulo,texto AS conteudo,
    '' AS url,'' AS imagem_url,NULL::text AS autor,NULL::text AS fonte,NULL::text AS loja,
    NULL::text AS categoria,NULL::numeric AS preco,NULL::numeric AS preco_anterior,
    FALSE AS destaque,publico AS ativo,ordem,criado_em,atualizado_em FROM frases ORDER BY ordem,id`,
  postagem: `SELECT id,'postagem' AS tipo,titulo,'' AS subtitulo,conteudo,url,
    '' AS imagem_url,NULL::text AS autor,NULL::text AS fonte,NULL::text AS loja,
    NULL::text AS categoria,NULL::numeric AS preco,NULL::numeric AS preco_anterior,
    FALSE AS destaque,publico AS ativo,ordem,criado_em,atualizado_em,
    jsonb_build_object('hashtags',hashtags) AS metadados FROM postagens ORDER BY ordem,id`,
  depoimento: `SELECT id,'depoimento' AS tipo,nome AS titulo,identificacao AS subtitulo,
    texto AS conteudo,'' AS url,avatar_url AS imagem_url,NULL::text AS autor,
    NULL::text AS fonte,NULL::text AS loja,NULL::text AS categoria,NULL::numeric AS preco,
    NULL::numeric AS preco_anterior,FALSE AS destaque,publicado AS ativo,ordem,
    criado_em,atualizado_em FROM depoimentos ORDER BY ordem,id`,
  artigo: `SELECT id,'artigo' AS tipo,titulo,'' AS subtitulo,resumo AS conteudo,url,
    imagem_url,autor,fonte,NULL::text AS loja,NULL::text AS categoria,preco,
    NULL::numeric AS preco_anterior,FALSE AS destaque,publicado AS ativo,ordem,
    criado_em,atualizado_em FROM artigos_interessantes ORDER BY ordem,id`,
  livro: `SELECT id,'livro' AS tipo,titulo,'' AS subtitulo,resumo AS conteudo,
    amazon_url AS url,capa_url AS imagem_url,autor,NULL::text AS fonte,NULL::text AS loja,
    NULL::text AS categoria,preco,NULL::numeric AS preco_anterior,FALSE AS destaque,
    publicado AS ativo,ordem,criado_em,atualizado_em FROM livros_interessantes ORDER BY ordem,id`,
  achadinho: `SELECT id,'achadinho' AS tipo,nome AS titulo,'' AS subtitulo,
    descricao_curta AS conteudo,amazon_url AS url,imagem_url,NULL::text AS autor,
    NULL::text AS fonte,NULL::text AS loja,categoria,preco,preco_anterior,destaque,
    publicado AS ativo,ordem,criado_em,atualizado_em FROM achadinhos_cafe
    ORDER BY destaque DESC,ordem,id`,
}

const deleteTables = {
  sobre: 'conteudos_site',
  frase: 'frases',
  postagem: 'postagens',
  depoimento: 'depoimentos',
  artigo: 'artigos_interessantes',
  livro: 'livros_interessantes',
  achadinho: 'achadinhos_cafe',
}

function validationError(input) {
  if (!contentTypes.has(input.tipo)) return 'Tipo de conteúdo inválido.'
  if (!input.titulo) return 'Informe o título ou nome.'
  if (!validUrl(input.imagemUrl)) return 'Informe uma URL de imagem válida.'
  if (Number.isNaN(input.preco) || Number.isNaN(input.precoAnterior)) return 'Informe preços válidos e não negativos.'
  if (['postagem', 'artigo', 'livro', 'achadinho'].includes(input.tipo) && !validUrl(input.url, { required: true })) {
    return 'Informe uma URL HTTP(S) válida.'
  }
  if (input.tipo === 'depoimento' && !input.conteudo) return 'Informe o texto do conteúdo.'
  return null
}

async function insertContent(input) {
  switch (input.tipo) {
    case 'sobre':
      return query(`INSERT INTO conteudos_site
        (tipo,titulo,subtitulo,conteudo,url,imagem_url,ativo,ordem)
        VALUES ('sobre',$1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [input.titulo, input.subtitulo, input.conteudo, input.url, input.imagemUrl, input.ativo, input.ordem])
    case 'frase':
      return query('INSERT INTO frases (texto,publico,ordem) VALUES ($1,$2,$3) RETURNING *',
        [input.conteudo || input.titulo, input.ativo, input.ordem])
    case 'postagem': {
      const hashtags = Array.isArray(input.metadados.hashtags) ? input.metadados.hashtags.map(String).slice(0, 30) : []
      return query(`INSERT INTO postagens
        (titulo,conteudo,hashtags,url,publico,ordem,data_publicacao)
        VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE) RETURNING *`,
      [input.titulo, input.conteudo, hashtags, input.url, input.ativo, input.ordem])
    }
    case 'depoimento':
      return query(`INSERT INTO depoimentos
        (nome,texto,identificacao,avatar_url,publicado,ordem)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [input.titulo, input.conteudo, input.subtitulo, input.imagemUrl, input.ativo, input.ordem])
    case 'artigo':
      return query(`INSERT INTO artigos_interessantes
        (titulo,resumo,autor,fonte,url,imagem_url,preco,publicado,ordem)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [input.titulo, input.conteudo, input.autor, input.fonte, input.url, input.imagemUrl, input.preco, input.ativo, input.ordem])
    case 'livro':
      return query(`INSERT INTO livros_interessantes
        (titulo,autor,resumo,capa_url,amazon_url,preco,publicado,ordem)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [input.titulo, input.autor, input.conteudo, input.imagemUrl, input.url, input.preco, input.ativo, input.ordem])
    case 'achadinho':
      return query(`INSERT INTO achadinhos_cafe
        (nome,descricao_curta,imagem_url,preco,preco_anterior,amazon_url,categoria,destaque,publicado,ordem)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [input.titulo, input.conteudo, input.imagemUrl, input.preco, input.precoAnterior,
        input.url, input.categoria, input.destaque, input.ativo, input.ordem])
    default:
      throw new Error('Tipo de conteúdo inválido.')
  }
}

async function updateContent(id, input) {
  switch (input.tipo) {
    case 'sobre':
      return query(`UPDATE conteudos_site SET titulo=$1,subtitulo=$2,conteudo=$3,url=$4,
        imagem_url=$5,ativo=$6,ordem=$7,atualizado_em=NOW() WHERE id=$8 RETURNING *`,
      [input.titulo, input.subtitulo, input.conteudo, input.url, input.imagemUrl, input.ativo, input.ordem, id])
    case 'frase':
      return query(`UPDATE frases SET texto=$1,publico=$2,ordem=$3,atualizado_em=NOW()
        WHERE id=$4 RETURNING *`, [input.conteudo || input.titulo, input.ativo, input.ordem, id])
    case 'postagem': {
      const hashtags = Array.isArray(input.metadados.hashtags) ? input.metadados.hashtags.map(String).slice(0, 30) : []
      return query(`UPDATE postagens SET titulo=$1,conteudo=$2,hashtags=$3,url=$4,
        publico=$5,ordem=$6,atualizado_em=NOW() WHERE id=$7 RETURNING *`,
      [input.titulo, input.conteudo, hashtags, input.url, input.ativo, input.ordem, id])
    }
    case 'depoimento':
      return query(`UPDATE depoimentos SET nome=$1,texto=$2,identificacao=$3,avatar_url=$4,
        publicado=$5,ordem=$6,atualizado_em=NOW() WHERE id=$7 RETURNING *`,
      [input.titulo, input.conteudo, input.subtitulo, input.imagemUrl, input.ativo, input.ordem, id])
    case 'artigo':
      return query(`UPDATE artigos_interessantes SET titulo=$1,resumo=$2,autor=$3,fonte=$4,
        url=$5,imagem_url=$6,preco=$7,publicado=$8,ordem=$9,atualizado_em=NOW()
        WHERE id=$10 RETURNING *`,
      [input.titulo, input.conteudo, input.autor, input.fonte, input.url, input.imagemUrl,
        input.preco, input.ativo, input.ordem, id])
    case 'livro':
      return query(`UPDATE livros_interessantes SET titulo=$1,autor=$2,resumo=$3,capa_url=$4,
        amazon_url=$5,preco=$6,publicado=$7,ordem=$8,atualizado_em=NOW()
        WHERE id=$9 RETURNING *`,
      [input.titulo, input.autor, input.conteudo, input.imagemUrl, input.url,
        input.preco, input.ativo, input.ordem, id])
    case 'achadinho':
      return query(`UPDATE achadinhos_cafe SET nome=$1,descricao_curta=$2,imagem_url=$3,
        preco=$4,preco_anterior=$5,amazon_url=$6,categoria=$7,destaque=$8,
        publicado=$9,ordem=$10,atualizado_em=NOW() WHERE id=$11 RETURNING *`,
      [input.titulo, input.conteudo, input.imagemUrl, input.preco, input.precoAnterior,
        input.url, input.categoria, input.destaque, input.ativo, input.ordem, id])
    default:
      throw new Error('Tipo de conteúdo inválido.')
  }
}

adminRouter.get('/me', (req, res) => res.json({ admin: true }))

adminRouter.get('/usuarios', async (req, res) => {
  const search = String(req.query.busca || '').trim().slice(0, 160)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.de || '')) ? req.query.de : null
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ate || '')) ? req.query.ate : null
  const lastFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ultimoDe || '')) ? req.query.ultimoDe : null
  const lastTo = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ultimoAte || '')) ? req.query.ultimoAte : null
  const page = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
  const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limite, 10) || 25))
  const params = [search, from, to, lastFrom, lastTo, limit, (page - 1) * limit]
  const where = `WHERE ($1 = '' OR u.nome ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
    AND ($2::date IS NULL OR u.criado_em >= $2::date)
    AND ($3::date IS NULL OR u.criado_em < ($3::date + INTERVAL '1 day'))
    AND ($4::date IS NULL OR u.ultimo_login_em >= $4::date)
    AND ($5::date IS NULL OR u.ultimo_login_em < ($5::date + INTERVAL '1 day'))`
  const [{ rows }, totalResult] = await Promise.all([
    query(`SELECT u.id,u.nome,u.email,u.ativo,u.is_admin,u.criado_em,u.ultimo_login_em,
      EXISTS(SELECT 1 FROM compras_usuario c WHERE c.usuario_id=u.id AND c.status='comprado') AS possui_compra
      FROM usuarios u ${where} ORDER BY u.criado_em DESC,u.id DESC LIMIT $6 OFFSET $7`, params),
    query(`SELECT COUNT(*)::int AS total FROM usuarios u ${where}`, params.slice(0, 5)),
  ])
  res.json({ items: rows, total: totalResult.rows[0].total, pagina: page, limite: limit })
})

adminRouter.get('/usuarios/metricas', async (req, res) => {
  const requestedYear = Number.parseInt(req.query.ano, 10)
  const currentYear = new Date().getUTCFullYear()
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear + 1 ? requestedYear : currentYear
  const [totals, years, points] = await Promise.all([
    query(`SELECT COUNT(*)::int AS usuarios,
      COUNT(*) FILTER (WHERE EXISTS(SELECT 1 FROM compras_usuario c WHERE c.usuario_id=u.id AND c.status='comprado'))::int AS compradores
      FROM usuarios u WHERE u.ativo`),
    query(`SELECT DISTINCT EXTRACT(YEAR FROM criado_em)::int AS ano FROM usuarios
      WHERE criado_em IS NOT NULL ORDER BY ano DESC`),
    query(`WITH meses AS (
        SELECT generate_series(make_date($1,1,1),make_date($1,12,1),INTERVAL '1 month')::date AS mes
      ), novos AS (
        SELECT date_trunc('month',criado_em)::date AS mes,COUNT(*)::int AS quantidade
        FROM usuarios WHERE EXTRACT(YEAR FROM criado_em)=$1 GROUP BY 1
      )
      SELECT m.mes,COALESCE(n.quantidade,0)::int AS novos,
        SUM(COALESCE(n.quantidade,0)) OVER (ORDER BY m.mes)::int AS acumulado
      FROM meses m LEFT JOIN novos n ON n.mes=m.mes ORDER BY m.mes`, [year]),
  ])
  res.json({ ano: year, anos: years.rows.map(row => row.ano), totais: totals.rows[0], pontos: points.rows })
})

adminRouter.put('/usuarios/:id/permissao', async (req, res) => {
  if (typeof req.body.isAdmin !== 'boolean') return res.status(400).json({ error: 'Informe a permissão administrativa.' })
  const userId = Number(req.params.id)
  const target = await query('SELECT id,is_admin,ativo FROM usuarios WHERE id=$1', [userId])
  if (!target.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' })
  if (!req.body.isAdmin && target.rows[0].is_admin) {
    const count = await query('SELECT COUNT(*)::int AS total FROM usuarios WHERE ativo AND is_admin')
    if (count.rows[0].total <= 1) return res.status(409).json({ error: 'O sistema deve manter pelo menos um administrador ativo.' })
  }
  const { rows } = await query(`UPDATE usuarios SET is_admin=$1,atualizado_em=NOW()
    WHERE id=$2 RETURNING id,nome,email,ativo,is_admin`, [req.body.isAdmin, userId])
  res.json(rows[0])
})

adminRouter.get('/configuracoes', async (req, res) => {
  const { rows } = await query('SELECT chave,valor,descricao,criado_em,atualizado_em FROM configuracoes_sistema ORDER BY chave')
  res.json(rows)
})

adminRouter.post('/configuracoes', async (req, res) => {
  const chave = String(req.body.chave || '').trim().toLowerCase()
  const valor = String(req.body.valor || '').trim()
  const descricao = String(req.body.descricao || '').trim()
  if (!/^[a-z][a-z0-9_]{2,99}$/.test(chave) || !valor) return res.status(400).json({ error: 'Informe uma chave válida e um valor.' })
  try {
    const { rows } = await query(`INSERT INTO configuracoes_sistema (chave,valor,descricao,atualizado_por) VALUES ($1,$2,$3,$4) RETURNING *`, [chave, valor, descricao, req.userId])
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Esta chave já existe.' })
    throw error
  }
})

adminRouter.put('/configuracoes/:chave', async (req, res) => {
  const valor = String(req.body.valor || '').trim()
  const descricao = String(req.body.descricao || '').trim()
  if (!valor) return res.status(400).json({ error: 'Informe o valor.' })
  const { rows } = await query(`UPDATE configuracoes_sistema SET valor=$1,descricao=$2,atualizado_por=$3,atualizado_em=NOW() WHERE chave=$4 RETURNING *`, [valor, descricao, req.userId, req.params.chave])
  if (!rows[0]) return res.status(404).json({ error: 'Configuração não encontrada.' })
  res.json(rows[0])
})

adminRouter.delete('/configuracoes/:chave', async (req, res) => {
  if (req.params.chave === 'carteira_cafe_usuario_email') return res.status(409).json({ error: 'A configuração da carteira pública é obrigatória.' })
  const result = await query('DELETE FROM configuracoes_sistema WHERE chave=$1', [req.params.chave])
  if (!result.rowCount) return res.status(404).json({ error: 'Configuração não encontrada.' })
  res.status(204).end()
})

adminRouter.get('/produtos-cafe', async (req, res) => {
  const { rows } = await query(`SELECT p.*,
    COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'corNome',v.cor_nome,'corHex',v.cor_hex,'tamanho',v.tamanho,'imagemUrl',v.imagem_url,'preco',v.preco,'ativo',v.ativo,'ordem',v.ordem) ORDER BY v.ordem,v.id) FILTER (WHERE v.id IS NOT NULL),'[]'::jsonb) AS variantes
    FROM produtos_cafe p LEFT JOIN produtos_cafe_variantes v ON v.produto_id=p.id GROUP BY p.id ORDER BY p.ordem,p.id`)
  res.json(rows)
})

const productCafeInput = body => ({ slug: String(body.slug || '').trim().toLowerCase(), nome: String(body.nome || '').trim(), descricao: String(body.descricao || '').trim(), icone: String(body.icone || 'shirt').trim(), preco: optionalMoney(body.preco), publicado: body.publicado !== false, ordem: Number(body.ordem) || 0, variantes: Array.isArray(body.variantes) ? body.variantes : [] })
const validateProductCafe = input => {
  if (!/^[a-z0-9-]{2,80}$/.test(input.slug) || !input.nome) return 'Informe nome e slug válido.'
  if (Number.isNaN(input.preco)) return 'Informe um preço válido.'
  if (!input.variantes.length) return 'Cadastre ao menos uma variante.'
  for (const variant of input.variantes) if (!variant.corNome || !/^#[0-9a-f]{6}$/i.test(variant.corHex || '') || !validUrl(String(variant.imagemUrl || ''))) return 'Revise cor, hexadecimal e imagem das variantes.'
  return null
}
async function saveProductVariants(client, productId, variants) {
  await client.query('DELETE FROM produtos_cafe_variantes WHERE produto_id=$1', [productId])
  for (const [index, variant] of variants.entries()) await client.query(`INSERT INTO produtos_cafe_variantes (produto_id,cor_nome,cor_hex,tamanho,imagem_url,preco,ativo,ordem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [productId, String(variant.corNome).trim(), variant.corHex, variant.tamanho ? String(variant.tamanho).trim() : null, String(variant.imagemUrl).trim(), optionalMoney(variant.preco), variant.ativo !== false, Number(variant.ordem) || index])
}

adminRouter.post('/produtos-cafe', async (req, res) => {
  const input = productCafeInput(req.body); const error = validateProductCafe(input)
  if (error) return res.status(400).json({ error })
  const { pool } = await import('../config/database.js'); const client = await pool.connect()
  try { await client.query('BEGIN'); const { rows } = await client.query(`INSERT INTO produtos_cafe (slug,nome,descricao,icone,preco,publicado,ordem) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [input.slug,input.nome,input.descricao,input.icone,input.preco,input.publicado,input.ordem]); await saveProductVariants(client, rows[0].id, input.variantes); await client.query('COMMIT'); res.status(201).json(rows[0]) } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
})

adminRouter.put('/produtos-cafe/:id', async (req, res) => {
  const input = productCafeInput(req.body); const error = validateProductCafe(input)
  if (error) return res.status(400).json({ error })
  const { pool } = await import('../config/database.js'); const client = await pool.connect()
  try { await client.query('BEGIN'); const { rows } = await client.query(`UPDATE produtos_cafe SET slug=$1,nome=$2,descricao=$3,icone=$4,preco=$5,publicado=$6,ordem=$7,atualizado_em=NOW() WHERE id=$8 RETURNING *`, [input.slug,input.nome,input.descricao,input.icone,input.preco,input.publicado,input.ordem,req.params.id]); if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Produto não encontrado.' }) } await saveProductVariants(client, rows[0].id, input.variantes); await client.query('COMMIT'); res.json(rows[0]) } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
})

adminRouter.delete('/produtos-cafe/:id', async (req, res) => { const result = await query('DELETE FROM produtos_cafe WHERE id=$1', [req.params.id]); if (!result.rowCount) return res.status(404).json({ error: 'Produto não encontrado.' }); res.status(204).end() })

const performanceInput = body => ({
  competencia: String(body.competencia || '').trim(),
  carteira: Number(body.rentabilidadeCarteira),
  cdi: Number(body.rentabilidadeCdi),
  percentualCdi: Number(body.percentualCdi),
  publicado: body.publicado !== false,
})

const performanceError = input => {
  if (!/^\d{4}-\d{2}-01$/.test(input.competencia)) return 'Informe uma competência mensal válida.'
  if (![input.carteira, input.cdi, input.percentualCdi].every(Number.isFinite)) return 'Informe todos os percentuais.'
  if (input.carteira < -100 || input.carteira > 1000 || input.cdi < -100 || input.cdi > 1000 || Math.abs(input.percentualCdi) > 100000) return 'Percentual fora do intervalo permitido.'
  return null
}

adminRouter.get('/rentabilidade', async (req, res) => {
  const { rows } = await query(`SELECT id,competencia,rentabilidade_carteira,rentabilidade_cdi,
    percentual_cdi,publicado,criado_em,atualizado_em FROM rentabilidade_mensal ORDER BY competencia DESC`)
  res.json(rows.map(row => ({
    id: row.id,
    competencia: row.competencia,
    rentabilidadeCarteira: Number(row.rentabilidade_carteira),
    rentabilidadeCdi: Number(row.rentabilidade_cdi),
    percentualCdi: Number(row.percentual_cdi),
    publicado: row.publicado,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  })))
})

adminRouter.post('/rentabilidade', async (req, res) => {
  const input = performanceInput(req.body)
  const error = performanceError(input)
  if (error) return res.status(400).json({ error })
  try {
    const { rows } = await query(`INSERT INTO rentabilidade_mensal
      (competencia,rentabilidade_carteira,rentabilidade_cdi,percentual_cdi,publicado,criado_por,atualizado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [input.competencia, input.carteira, input.cdi, input.percentualCdi, input.publicado, req.userId])
    res.status(201).json(rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe rentabilidade cadastrada para esta competência.' })
    throw error
  }
})

adminRouter.put('/rentabilidade/:id', async (req, res) => {
  const input = performanceInput(req.body)
  const error = performanceError(input)
  if (error) return res.status(400).json({ error })
  try {
    const { rows } = await query(`UPDATE rentabilidade_mensal SET competencia=$1,
      rentabilidade_carteira=$2,rentabilidade_cdi=$3,percentual_cdi=$4,publicado=$5,
      atualizado_por=$6,atualizado_em=NOW() WHERE id=$7 RETURNING *`,
    [input.competencia, input.carteira, input.cdi, input.percentualCdi, input.publicado, req.userId, req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Rentabilidade não encontrada.' })
    res.json(rows[0])
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe rentabilidade cadastrada para esta competência.' })
    throw error
  }
})

adminRouter.delete('/rentabilidade/:id', async (req, res) => {
  const result = await query('DELETE FROM rentabilidade_mensal WHERE id=$1', [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Rentabilidade não encontrada.' })
  res.status(204).end()
})

adminRouter.get('/conteudos', async (req, res) => {
  const type = String(req.query.tipo || '')
  if (type && !contentTypes.has(type)) return res.status(400).json({ error: 'Tipo de conteúdo inválido.' })
  if (type) {
    const { rows } = await query(listQueries[type])
    return res.json(rows)
  }
  const groups = await Promise.all(Object.values(listQueries).map(statement => query(statement)))
  res.json(groups.flatMap(group => group.rows))
})

adminRouter.post('/conteudos', async (req, res) => {
  const input = contentInput(req.body)
  const error = validationError(input)
  if (error) return res.status(400).json({ error })
  const { rows } = await insertContent(input)
  res.status(201).json(rows[0])
})

adminRouter.put('/conteudos/:id', async (req, res) => {
  const input = contentInput(req.body)
  const error = validationError(input)
  if (error) return res.status(400).json({ error })
  const { rows } = await updateContent(req.params.id, input)
  if (!rows[0]) return res.status(404).json({ error: 'Conteúdo não encontrado.' })
  res.json(rows[0])
})

adminRouter.delete('/conteudos/:id', async (req, res) => {
  const type = String(req.query.tipo || '')
  const table = deleteTables[type]
  if (!table) return res.status(400).json({ error: 'Tipo de conteúdo inválido.' })
  const result = await query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id])
  if (!result.rowCount) return res.status(404).json({ error: 'Conteúdo não encontrado.' })
  res.status(204).end()
})
