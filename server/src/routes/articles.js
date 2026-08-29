import { Router } from 'express'
import { query } from '../config/database.js'
import { optionalAuth, requireAuth } from '../services/authService.js'

export const articlesRouter = Router()

const articleSelect = `SELECT a.id,a.titulo,a.resumo,a.imagem_url,a.preco,a.conteudo_pago,a.ordem,
  (NOT a.conteudo_pago OR ($1::bigint IS NOT NULL AND EXISTS (
    SELECT 1 FROM acessos_artigos access
    WHERE access.usuario_id=$1 AND access.artigo_id=a.id AND access.revogado_em IS NULL
  ))) AS tem_acesso,
  CASE WHEN NOT a.conteudo_pago OR ($1::bigint IS NOT NULL AND EXISTS (
    SELECT 1 FROM acessos_artigos access
    WHERE access.usuario_id=$1 AND access.artigo_id=a.id AND access.revogado_em IS NULL
  )) THEN '/api/artigos/' || a.id::text || '/conteudo' ELSE NULL END AS conteudo_url
  FROM artigos_interessantes a`

articlesRouter.get('/', optionalAuth, async (req, res) => {
  const { rows } = await query(`${articleSelect} WHERE a.publicado ORDER BY a.ordem,a.id`, [req.userId || null])
  res.json(rows)
})

export function protectedGoogleUrl(rawUrl) {
  const url = new URL(rawUrl)
  const documentMatch = url.hostname === 'docs.google.com' && url.pathname.match(/^\/document\/d\/([^/]+)/)
  if (documentMatch) return `https://docs.google.com/document/d/${encodeURIComponent(documentMatch[1])}/export?format=pdf`
  const driveMatch = url.hostname === 'drive.google.com' && url.pathname.match(/^\/file\/d\/([^/]+)/)
  if (driveMatch) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveMatch[1])}`
  return null
}

articlesRouter.get('/:id/conteudo', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Artigo inválido.' })
  const { rows } = await query(`SELECT a.titulo,a.url FROM artigos_interessantes a
    WHERE a.id=$1 AND a.publicado AND EXISTS (SELECT 1 FROM acessos_artigos access
      WHERE access.usuario_id=$2 AND access.artigo_id=a.id AND access.revogado_em IS NULL)`, [id, req.userId])
  if (!rows[0]) return res.status(403).json({ error: 'Você não possui acesso a este artigo.' })
  const sourceUrl = protectedGoogleUrl(rows[0].url)
  if (!sourceUrl) return res.status(422).json({ error: 'A origem protegida deste artigo não é compatível.' })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(sourceUrl, { redirect: 'follow', signal: controller.signal })
    if (!response.ok) return res.status(502).json({ error: 'Não foi possível carregar o artigo no Google Drive.' })
    const length = Number(response.headers.get('content-length') || 0)
    if (length > 25 * 1024 * 1024) return res.status(413).json({ error: 'O arquivo do artigo excede o limite permitido.' })
    const content = Buffer.from(await response.arrayBuffer())
    if (content.length > 25 * 1024 * 1024) return res.status(413).json({ error: 'O arquivo do artigo excede o limite permitido.' })
    const safeName = rows[0].titulo.replace(/[^a-z0-9áàâãéêíóôõúç _-]/gi, '').trim().replace(/\s+/g, '-') || `artigo-${id}`
    res.set('Cache-Control', 'private, no-store')
    res.set('Content-Type', response.headers.get('content-type') || 'application/pdf')
    res.set('Content-Disposition', `inline; filename="${safeName}.pdf"`)
    res.send(content)
  } catch {
    if (!res.headersSent) res.status(502).json({ error: 'Não foi possível carregar o artigo protegido.' })
  } finally {
    clearTimeout(timeout)
  }
})

articlesRouter.get('/:id', optionalAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Artigo inválido.' })
  const { rows } = await query(`${articleSelect} WHERE a.id=$2 AND a.publicado`, [req.userId || null, id])
  if (!rows[0]) return res.status(404).json({ error: 'Artigo não encontrado.' })
  res.json(rows[0])
})
