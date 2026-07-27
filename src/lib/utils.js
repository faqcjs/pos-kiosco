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
