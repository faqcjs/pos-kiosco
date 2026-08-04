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
  const rawQ = (query || '').trim()
  if (!rawQ) return true

  const q = normalizeText(rawQ)
  const compactQ = q.replace(/\s+/g, '')

  // 1. Check barcode
  if (product.barcode) {
    const cleanBarcode = product.barcode.trim().toLowerCase()
    if (cleanBarcode.includes(compactQ.toLowerCase())) {
      return true
    }
  }

  // 2. Check category name
  if (product.category && normalizeText(product.category).includes(q)) {
    return true
  }

  // 3. Check product name with spaces removed (e.g. "cocacola" matching "coca cola")
  const prodName = normalizeText(product.name)
  const compactProdName = prodName.replace(/\s+/g, '')

  if (compactProdName.includes(compactQ)) {
    return true
  }

  // 4. Check every word in query is in product name
  const queryWords = q.split(/\s+/).filter(Boolean)
  return queryWords.every((word) => prodName.includes(word))
}
