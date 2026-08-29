import React, { useState } from 'react'
import { Image, Upload } from 'lucide-react'
import { apiRequest } from '../lib/api.js'

export default function AdminImageUpload({ type, value, onChange, onStatus, label = 'Imagem' }) {
  const [uploading, setUploading] = useState(false)
  const upload = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onStatus('Selecione uma imagem PNG, JPG ou WebP de até 5 MB.')
      return
    }
    setUploading(true)
    try {
      const conteudo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
      const result = await apiRequest('/api/admin/uploads', { method: 'POST', body: JSON.stringify({ tipo: type, conteudo }) })
      onChange(result.url)
      onStatus('Imagem enviada com sucesso.')
    } catch (error) { onStatus(error.message) } finally { setUploading(false) }
  }
  return <div className="admin-image-upload"><span>{label}</span><div>{value ? <img src={value} alt="Prévia da imagem"/> : <Image/>}<label><Upload/>{uploading ? 'Enviando…' : value ? 'Trocar imagem' : 'Selecionar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={upload}/></label></div>{value && <small>{value}</small>}</div>
}
