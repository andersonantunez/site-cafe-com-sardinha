import { query } from '../config/database.js'
import { normalizeRateType } from './portfolioParser.js'

export const defaultVisibility = Object.freeze({
  mostrarVencimento: false,
  mostrarTipoProduto: false,
  mostrarTaxa: false,
  mostrarEmissor: false,
})

const formatDate = value => value
  ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  : null

const mapVisibility = row => ({
  mostrarVencimento: row?.mostrar_vencimento ?? false,
  mostrarTipoProduto: row?.mostrar_tipo_produto ?? false,
  mostrarTaxa: row?.mostrar_taxa ?? false,
  mostrarEmissor: row?.mostrar_emissor ?? false,
})

export function mapPortfolioRows(rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.valor_investido), 0)
  return rows.map(row => ({
    id: row.id,
    code: row.codigo,
    issuer: row.produto,
    product: row.tipo,
    investedValue: Number(row.valor_investido),
    issuedAt: formatDate(row.emissao),
    maturityAt: formatDate(row.vencimento),
    calendarDays: row.dias_corridos,
    businessDays: row.dias_uteis,
    rate: row.taxa,
    rateType: normalizeRateType(row.tipo_indexador),
    unitPrice: Number(row.preco_unitario),
    quantity: Number(row.quantidade),
    netValue: Number(row.valor_liquido),
    netReturn: Number(row.rentabilidade_liquida),
    averageDailyReturn: Number(row.rentabilidade_media),
    liquidated: Boolean(row.liquidado),
    allocation: total ? Number((Number(row.valor_investido) / total * 100).toFixed(3)) : 0,
  }))
}

export function partitionPortfolioRows(rows) {
  const current = []
  const liquidated = []
  for (const row of rows) (row.liquidado ? liquidated : current).push(row)
  return { current, liquidated }
}

export async function getPortfolioSettings(userId) {
  const { rows } = await query(`SELECT mostrar_vencimento, mostrar_tipo_produto, mostrar_taxa, mostrar_emissor, nome_carteira,
    compartilhamento_ativo, token_criado_em, atualizado_em
    FROM carteira_configuracoes WHERE usuario_id=$1`, [userId])
  const row = rows[0]
  return {
    ...mapVisibility(row),
    nomeCarteira: row?.nome_carteira ?? 'Minha carteira',
    compartilhamentoAtivo: row?.compartilhamento_ativo ?? false,
    tokenCriadoEm: row?.token_criado_em ?? null,
    atualizadoEm: row?.atualizado_em ?? null,
  }
}

export async function getUserPortfolio(userId) {
  const [{ rows }, importResult, settings] = await Promise.all([
    query('SELECT * FROM carteira_titulos WHERE usuario_id=$1 AND ativo ORDER BY id', [userId]),
    query(`SELECT criado_em FROM carteira_importacoes
      WHERE usuario_id=$1 ORDER BY criado_em DESC, id DESC LIMIT 1`, [userId]),
    getPortfolioSettings(userId),
  ])
  const grouped = partitionPortfolioRows(rows)
  return {
    assets: mapPortfolioRows(grouped.current),
    liquidatedAssets: mapPortfolioRows(grouped.liquidated),
    updatedAt: importResult.rows[0]?.criado_em ?? null,
    settings,
  }
}

export function sanitizePublicPortfolio(portfolio) {
  const visibility = mapVisibility({
    mostrar_vencimento: portfolio.settings?.mostrarVencimento,
    mostrar_tipo_produto: portfolio.settings?.mostrarTipoProduto,
    mostrar_taxa: portfolio.settings?.mostrarTaxa,
    mostrar_emissor: portfolio.settings?.mostrarEmissor,
  })
  const productAliases = new Map()
  const issuerAliases = new Map()
  const assets = portfolio.assets.map((asset, index) => {
    const safe = {
      id: index + 1,
      issuer: asset.issuer,
      product: asset.product,
      netReturn: asset.netReturn,
      averageDailyReturn: asset.averageDailyReturn,
      allocation: asset.allocation,
      rateType: asset.rateType,
    }
    if (!visibility.mostrarTipoProduto) {
      if (!productAliases.has(asset.product)) productAliases.set(asset.product, `Produto ${productAliases.size + 1}`)
      safe.product = productAliases.get(asset.product)
    }
    if (!visibility.mostrarEmissor) {
      if (!issuerAliases.has(asset.issuer)) issuerAliases.set(asset.issuer, `Emissor ${issuerAliases.size + 1}`)
      safe.issuer = issuerAliases.get(asset.issuer)
    }
    if (visibility.mostrarTaxa) safe.rate = asset.rate
    safe.calendarDays = asset.calendarDays
    safe.businessDays = asset.businessDays
    if (visibility.mostrarVencimento) {
      safe.maturityAt = asset.maturityAt
      safe.issuedAt = asset.issuedAt
    }
    return safe
  })
  return { assets, updatedAt: portfolio.updatedAt, visibility, portfolioName: portfolio.settings?.nomeCarteira || 'Minha carteira' }
}

export async function getAdminUserId() {
  const { rows } = await query(`SELECT u.id
    FROM configuracoes_sistema c
    JOIN usuarios u ON LOWER(u.email)=LOWER(c.valor) AND u.ativo
    WHERE c.chave='carteira_cafe_usuario_email'`)
  return rows[0]?.id ? Number(rows[0].id) : null
}

export async function getAdminPublicPortfolio() {
  const userId = await getAdminUserId()
  if (!userId) return { assets: [], updatedAt: null, visibility: defaultVisibility, configured: false }
  return { ...sanitizePublicPortfolio(await getUserPortfolio(userId)), configured: true }
}
