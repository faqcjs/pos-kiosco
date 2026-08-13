import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[-_.]/g, ' ') // replace hyphens, underscores, and dots with spaces
}

export function matchProduct(product, query) {
  const q = normalizeText(query).trim()
  if (!q) return true

  // Check barcode first
  if (product.barcode && product.barcode.includes(q)) {
    return true
  }

  const prodName = normalizeText(product.name)
  const queryWords = q.split(/\s+/).filter(Boolean)

  // Every query word must be present in the normalized product name
  return queryWords.every((word) => prodName.includes(word))
}

export function searchProducts(products = [], query = '') {
  const q = normalizeText(query).trim()
  if (!q) return []

  const words = q.split(/\s+/).filter(Boolean)

  const scored = []
  for (const p of products) {
    if (!p) continue
    const barcode = (p.barcode || '').toLowerCase()
    const nameNorm = normalizeText(p.name || '')
    const catNorm = normalizeText(p.category || '')

    let score = 0

    // Barcode matches
    if (barcode && barcode === q) {
      score += 1000
    } else if (barcode && barcode.startsWith(q)) {
      score += 500
    } else if (barcode && barcode.includes(q)) {
      score += 300
    }

    // Name matches
    if (nameNorm === q) {
      score += 800
    } else if (nameNorm.startsWith(q)) {
      score += 400
    } else {
      const allWordsMatch = words.every(
        (w) => nameNorm.includes(w) || catNorm.includes(w) || barcode.includes(w),
      )
      if (allWordsMatch) {
        score += 150
        const wordBoundaryMatch = words.some((w) =>
          nameNorm.split(/\s+/).some((nw) => nw.startsWith(w)),
        )
        if (wordBoundaryMatch) score += 50
      }
    }

    if (score > 0) {
      scored.push({ product: p, score })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((item) => item.product)
}
