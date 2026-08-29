import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')
const folders = new Map([
  ['achadinho', 'achadinhos'], ['produto-cafe', 'produtos-cafe'],
  ['livro', 'livros'], ['artigo', 'artigos'],
])
const signatures = [
  { extension: 'png', mime: 'image/png', matches: buffer => buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  { extension: 'jpg', mime: 'image/jpeg', matches: buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { extension: 'webp', mime: 'image/webp', matches: buffer => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' },
]

export const uploadsRoot = root

export async function saveUploadedImage({ type, content }) {
  const folder = folders.get(String(type || ''))
  if (!folder) throw new Error('Destino de imagem inválido.')
  const match = String(content || '').match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('Envie uma imagem PNG, JPG ou WebP válida.')
  const buffer = Buffer.from(match[1], 'base64')
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.')
  const signature = signatures.find(item => item.matches(buffer))
  if (!signature) throw new Error('O conteúdo do arquivo não corresponde a uma imagem permitida.')
  await fs.mkdir(path.join(root, folder), { recursive: true })
  const filename = `${crypto.randomUUID()}.${signature.extension}`
  await fs.writeFile(path.join(root, folder, filename), buffer, { flag: 'wx' })
  return `/uploads/${folder}/${filename}`
}
