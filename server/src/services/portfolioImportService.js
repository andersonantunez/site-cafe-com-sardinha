async function importUserPortfolio(client, { userId, fileName, hash, assets, replace }) {
  await client.query('BEGIN')
  try {
    const imported = await client.query(
      `INSERT INTO carteira_importacoes
        (usuario_id,nome_arquivo,hash_arquivo,quantidade_titulos)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [userId, fileName, hash, assets.length],
    )
    if (replace) await client.query('DELETE FROM carteira_titulos WHERE usuario_id=$1', [userId])
    for (const asset of assets) {
      await client.query(
        `INSERT INTO carteira_titulos
          (usuario_id,importacao_id,codigo,produto,tipo,valor_investido,emissao,vencimento,
           dias_corridos,dias_uteis,taxa,tipo_indexador,preco_unitario,quantidade,
           valor_liquido,rentabilidade_liquida,rentabilidade_media,liquidado,linha_origem,ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,TRUE)`,
        [userId, imported.rows[0].id, asset.codigo, asset.produto, asset.tipo,
          asset.valorInvestido, asset.emissao, asset.vencimento, asset.diasCorridos,
          asset.diasUteis, asset.taxa, asset.tipoIndexador, asset.precoUnitario,
          asset.quantidade, asset.valorLiquido, asset.rentabilidadeLiquida,
          asset.rentabilidadeMedia, asset.liquidado, asset.linhaOrigem],
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export const replaceUserPortfolio = (client, input) => importUserPortfolio(client, { ...input, replace: true })
export const appendUserPortfolio = (client, input) => importUserPortfolio(client, { ...input, replace: false })
