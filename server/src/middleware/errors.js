export function notFound(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' })
}

export function errorHandler(error, req, res, next) {
  console.error(error)
  if (res.headersSent) return next(error)

  const status = error.status || 500
  res.status(status).json({
    erro: status === 500 ? 'Erro interno do servidor.' : error.message,
  })
}
