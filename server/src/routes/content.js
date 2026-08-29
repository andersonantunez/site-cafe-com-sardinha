import { Router } from 'express'
import { query } from '../config/database.js'

export const contentRouter = Router()

const publicQueries = {
  sobre: `SELECT id,'sobre' AS tipo,titulo,subtitulo,conteudo,url,imagem_url,
    NULL::text AS autor,NULL::text AS fonte,NULL::text AS loja,NULL::text AS categoria,
    NULL::numeric AS preco,NULL::numeric AS preco_anterior,FALSE AS destaque,ordem
    FROM conteudos_site WHERE ativo ORDER BY ordem,id`,
  depoimento: `SELECT id,'depoimento' AS tipo,nome AS titulo,identificacao AS subtitulo,
    texto AS conteudo,'' AS url,NULL::text AS imagem_url,NULL::text AS autor,
    NULL::text AS fonte,NULL::text AS loja,NULL::text AS categoria,NULL::numeric AS preco,
    NULL::numeric AS preco_anterior,FALSE AS destaque,ordem
    FROM depoimentos WHERE publicado ORDER BY ordem,id`,
  artigo: `SELECT id,'artigo' AS tipo,titulo,'' AS subtitulo,resumo AS conteudo,''::text AS url,
    imagem_url,NULL::text AS autor,NULL::text AS fonte,NULL::text AS loja,NULL::text AS categoria,preco,
    NULL::numeric AS preco_anterior,FALSE AS destaque,ordem
    FROM artigos_interessantes WHERE publicado ORDER BY ordem,id`,
  livro: `SELECT id,'livro' AS tipo,titulo,'' AS subtitulo,resumo AS conteudo,
    COALESCE((SELECT link.url FROM livros_interessantes_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.livro_id=livros_interessantes.id AND link.ativo ORDER BY link.ordem,link.id LIMIT 1),'') AS url,capa_url AS imagem_url,autor,NULL::text AS fonte,NULL::text AS loja,
    NULL::text AS categoria,(SELECT MIN(link.preco) FROM livros_interessantes_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.livro_id=livros_interessantes.id AND link.ativo) AS preco,NULL::numeric AS preco_anterior,FALSE AS destaque,ordem
    ,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',link.id,'lojaId',link.loja_id,'loja',store.nome,'url',link.url,'preco',link.preco) ORDER BY link.ordem,link.id) FROM livros_interessantes_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.livro_id=livros_interessantes.id AND link.ativo),'[]'::jsonb) AS links
    FROM livros_interessantes WHERE publicado ORDER BY ordem,id`,
  achadinho: `SELECT id,'achadinho' AS tipo,nome AS titulo,'' AS subtitulo,
    descricao_curta AS conteudo,COALESCE((SELECT link.url FROM achadinhos_cafe_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.achadinho_id=achadinhos_cafe.id AND link.ativo ORDER BY link.ordem,link.id LIMIT 1),'') AS url,imagem_url,NULL::text AS autor,
    NULL::text AS fonte,NULL::text AS loja,categoria,(SELECT MIN(link.preco) FROM achadinhos_cafe_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.achadinho_id=achadinhos_cafe.id AND link.ativo) AS preco,NULL::numeric AS preco_anterior,destaque,ordem
    ,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',link.id,'lojaId',link.loja_id,'loja',store.nome,'url',link.url,'preco',link.preco) ORDER BY link.ordem,link.id) FROM achadinhos_cafe_links link JOIN lojas_comercio store ON store.id=link.loja_id AND store.ativo WHERE link.achadinho_id=achadinhos_cafe.id AND link.ativo),'[]'::jsonb) AS links
    FROM achadinhos_cafe WHERE publicado ORDER BY destaque DESC,ordem,id`,
}

contentRouter.get('/', async (req, res) => {
  const type = String(req.query.tipo || '')
  if (type) {
    const statement = publicQueries[type]
    if (!statement) return res.status(400).json({ error: 'Tipo de conteúdo inválido.' })
    const { rows } = await query(statement)
    return res.json(rows)
  }
  const groups = await Promise.all(Object.values(publicQueries).map(statement => query(statement)))
  res.json(groups.flatMap(group => group.rows))
})

contentRouter.get('/produtos-cafe', async (req, res) => {
  const { rows } = await query(`SELECT p.id,p.slug,p.nome,p.descricao,p.icone,p.preco,p.ordem,
    COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'corNome',v.cor_nome,'corHex',v.cor_hex,
      'tamanho',v.tamanho,'imagemUrl',v.imagem_url,'preco',COALESCE(v.preco,p.preco),'ordem',v.ordem)
      ORDER BY v.ordem,v.id) FILTER (WHERE v.id IS NOT NULL),'[]'::jsonb) AS variantes
    FROM produtos_cafe p LEFT JOIN produtos_cafe_variantes v ON v.produto_id=p.id AND v.ativo
    WHERE p.publicado GROUP BY p.id ORDER BY p.ordem,p.id`)
  res.json(rows)
})
