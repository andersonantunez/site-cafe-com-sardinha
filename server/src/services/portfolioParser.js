import crypto from 'node:crypto'

const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()

const number = (value, label, allowNegative = false) => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (!allowNegative && value < 0)) {
      throw new Error(`Valor inválido em ${label}: ${value}`)
    }
    return value
  }
  const parsed = Number(String(value || '').replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) {
    throw new Error(`Valor inválido em ${label}: ${value}`)
  }
  return parsed
}

const date = value => {
  const [day, month, year] = String(value || '').split('/')
  if (!day || !month || !year) throw new Error(`Data inválida: ${value}`)
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Data inválida: ${value}`)
  }
  return iso
}

const boolean = (value, label) => {
  const normalized = normalize(value)
  if (['true', 'sim', '1'].includes(normalized)) return true
  if (['false', 'nao', '0'].includes(normalized)) return false
  throw new Error(`Valor booleano inválido em ${label}: ${value}`)
}

const required = [
  'Código', 'Produto', 'Tipo', 'Valor Investido', 'Emissão', 'Vencimento',
  'Dias Corridos', 'Dias Úteis', 'Taxa', 'Tipo Indexador', 'Preço Unitário',
  'Quantidade', 'Valor Líquido', 'Rentabilidade Líquida', 'Rentabilidade Média',
  'Liquidado?',
]

export function parsePortfolioFile(content) {
  const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) throw new Error('O arquivo não contém títulos.')
  const headers = lines[0].split('\t').map(normalize)
  const index = Object.fromEntries(headers.map((header, position) => [header, position]))
  for (const name of required) {
    if (index[normalize(name)] === undefined) throw new Error(`Coluna obrigatória ausente: ${name}`)
  }
  if (lines.length > 2001) throw new Error('O arquivo pode conter no máximo 2.000 títulos.')
  const get = (row, name) => row[index[normalize(name)]]?.trim() || ''
  const assets = lines.slice(1).map((line, position) => {
    const row = line.split('\t')
    const lineNumber = position + 2
    return {
      codigo: get(row, 'Código'),
      produto: get(row, 'Produto'),
      tipo: get(row, 'Tipo'),
      valorInvestido: number(get(row, 'Valor Investido'), `Valor Investido (linha ${lineNumber})`),
      emissao: date(get(row, 'Emissão')),
      vencimento: date(get(row, 'Vencimento')),
      diasCorridos: number(get(row, 'Dias Corridos'), `Dias Corridos (linha ${lineNumber})`),
      diasUteis: number(get(row, 'Dias Úteis'), `Dias Úteis (linha ${lineNumber})`),
      taxa: get(row, 'Taxa'),
      tipoIndexador: get(row, 'Tipo Indexador'),
      precoUnitario: number(get(row, 'Preço Unitário'), `Preço Unitário (linha ${lineNumber})`),
      quantidade: number(get(row, 'Quantidade'), `Quantidade (linha ${lineNumber})`),
      valorLiquido: number(get(row, 'Valor Líquido'), `Valor Líquido (linha ${lineNumber})`),
      rentabilidadeLiquida: number(get(row, 'Rentabilidade Líquida'), `Rentabilidade Líquida (linha ${lineNumber})`, true),
      rentabilidadeMedia: number(get(row, 'Rentabilidade Média'), `Rentabilidade Média (linha ${lineNumber})`, true),
      liquidado: boolean(get(row, 'Liquidado?'), `Liquidado? (linha ${lineNumber})`),
      linhaOrigem: lineNumber,
    }
  })
  if (assets.some(asset => !asset.codigo || !asset.produto || !asset.tipo)) {
    throw new Error('Existem linhas sem código, produto ou tipo.')
  }
  return { assets, hash: crypto.createHash('sha256').update(content).digest('hex') }
}

const jsonFields = {
  codigo: ['Código', 'codigo'], produto: ['Produto', 'produto'], tipo: ['Tipo', 'tipo'],
  valorInvestido: ['Valor Investido', 'valorInvestido'], emissao: ['Emissão', 'emissao'],
  vencimento: ['Vencimento', 'vencimento'], diasCorridos: ['Dias Corridos', 'diasCorridos'],
  diasUteis: ['Dias Úteis', 'diasUteis'], taxa: ['Taxa', 'taxa'],
  tipoIndexador: ['Tipo Indexador', 'tipoIndexador'], precoUnitario: ['Preço Unitário', 'precoUnitario'],
  quantidade: ['Quantidade', 'quantidade'], valorLiquido: ['Valor Líquido', 'valorLiquido'],
  rentabilidadeLiquida: ['Rentabilidade Líquida', 'rentabilidadeLiquida'],
  rentabilidadeMedia: ['Rentabilidade Média', 'rentabilidadeMedia'], liquidado: ['Liquidado?', 'liquidado'],
}

export function parsePortfolioJson(content) {
  let document
  try { document = JSON.parse(String(content || '').replace(/^\uFEFF/, '')) } catch { throw new Error('O arquivo JSON não é válido.') }
  const entries = Array.isArray(document) ? document : document?.titulos
  if (!Array.isArray(entries) || !entries.length) throw new Error('O JSON deve conter uma lista não vazia de títulos.')
  if (entries.length > 2000) throw new Error('O arquivo pode conter no máximo 2.000 títulos.')
  const assets = entries.map((entry, position) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Título inválido na posição ${position + 1}.`)
    const normalized = Object.fromEntries(Object.entries(entry).map(([key, value]) => [normalize(key), value]))
    const get = field => {
      for (const alias of jsonFields[field]) if (normalized[normalize(alias)] !== undefined) return normalized[normalize(alias)]
      throw new Error(`Campo obrigatório ausente: ${jsonFields[field][0]} (título ${position + 1})`)
    }
    const lineNumber = position + 1
    return {
      codigo: String(get('codigo')).trim(), produto: String(get('produto')).trim(), tipo: String(get('tipo')).trim(),
      valorInvestido: number(get('valorInvestido'), `Valor Investido (título ${lineNumber})`),
      emissao: date(get('emissao')), vencimento: date(get('vencimento')),
      diasCorridos: number(get('diasCorridos'), `Dias Corridos (título ${lineNumber})`),
      diasUteis: number(get('diasUteis'), `Dias Úteis (título ${lineNumber})`),
      taxa: String(get('taxa')).trim(), tipoIndexador: String(get('tipoIndexador')).trim(),
      precoUnitario: number(get('precoUnitario'), `Preço Unitário (título ${lineNumber})`),
      quantidade: number(get('quantidade'), `Quantidade (título ${lineNumber})`),
      valorLiquido: number(get('valorLiquido'), `Valor Líquido (título ${lineNumber})`),
      rentabilidadeLiquida: number(get('rentabilidadeLiquida'), `Rentabilidade Líquida (título ${lineNumber})`, true),
      rentabilidadeMedia: number(get('rentabilidadeMedia'), `Rentabilidade Média (título ${lineNumber})`, true),
      liquidado: typeof get('liquidado') === 'boolean' ? get('liquidado') : boolean(get('liquidado'), `Liquidado? (título ${lineNumber})`),
      linhaOrigem: lineNumber,
    }
  })
  if (assets.some(asset => !asset.codigo || !asset.produto || !asset.tipo)) throw new Error('Existem títulos sem código, produto ou tipo.')
  return { assets, hash: crypto.createHash('sha256').update(content).digest('hex') }
}

export function normalizeRateType(value) {
  const normalized = normalize(value)
  if (normalized.includes('inflacao')) return 'Inflação'
  if (normalized.includes('pos-fixado')) return 'Pós-fixado'
  return 'Prefixado'
}
