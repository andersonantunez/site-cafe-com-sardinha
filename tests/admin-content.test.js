import test from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedArticleUrl } from '../server/src/routes/admin.js'

test('artigos aceitam links válidos do Google Drive e Google Docs', () => {
  assert.equal(isAllowedArticleUrl('https://drive.google.com/file/d/abc/view'), true)
  assert.equal(isAllowedArticleUrl('https://docs.google.com/document/d/abc/edit?usp=drive_link'), true)
})

test('artigos rejeitam hosts parecidos e URLs inválidas', () => {
  assert.equal(isAllowedArticleUrl('https://drive.google.com.example.com/documento'), false)
  assert.equal(isAllowedArticleUrl('javascript:alert(1)'), false)
  assert.equal(isAllowedArticleUrl('não-é-url'), false)
})
