import sanitizedPortfolio from '../data/portfolioAssetsSanitized.js'

export const portfolioAssets = sanitizedPortfolio.assets

export function aggregateAssets(field) {
  return sanitizedPortfolio.allocations[field] || []
}

export function aggregateMaturities() {
  return sanitizedPortfolio.maturities
}
