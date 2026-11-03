// Pure helpers for the combo editor: an editable draft of a combo and its components.
// Cost and buildable units reuse calculateComboMetrics so the editor follows the same rules as the POS.

import { calculateComboMetrics } from './promotions'

export const COMBO_DEFAULT_CATEGORY = 'Bebidas'
const DRAFT_COMBO_ID = '__draft__'

/** @returns {{ id?: string, name: string, price: string, category: string, barcode: string, components: Array<{ productId: string, quantity: number }> }} */
export function emptyDraft() {
  return { name: '', price: '', category: COMBO_DEFAULT_CATEGORY, barcode: '', components: [] }
}

/**
 * When products are given, components pointing to a deleted product are dropped,
 * so saving the draft removes those orphan combo_items instead of zeroing the combo cost.
 */
export function draftFromCombo(combo, comboItems = [], products = null) {
  const knownIds = products ? new Set(products.map((p) => p.id)) : null
  return {
    id: combo.id,
    name: combo.name ?? '',
    price: String(combo.price ?? ''),
    category: combo.category ?? COMBO_DEFAULT_CATEGORY,
    barcode: combo.barcode ?? '',
    components: comboItems
      .filter((ci) => ci.comboId === combo.id && (!knownIds || knownIds.has(ci.productId)))
      .map(({ productId, quantity }) => ({ productId, quantity: Number(quantity) || 1 })),
  }
}

export function addComponent(components, productId) {
  const exists = components.some((c) => c.productId === productId)
  if (!exists) return [...components, { productId, quantity: 1 }]
  return components.map((c) => (c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c))
}

export function setComponentQty(components, productId, quantity) {
  if (quantity <= 0) return components.filter((c) => c.productId !== productId)
  return components.map((c) => (c.productId === productId ? { ...c, quantity } : c))
}

export function getDraftMetrics(components, products, price) {
  const priceNum = Number(price) || 0
  const items = components.map((c) => ({ ...c, comboId: DRAFT_COMBO_ID }))
  const { virtualStock, unitCost, missingCostProducts } = calculateComboMetrics(DRAFT_COMBO_ID, items, products)
  const margin = priceNum - unitCost

  return {
    cost: unitCost,
    margin,
    marginRatio: priceNum > 0 ? margin / priceNum : null,
    buildable: virtualStock,
    missingCost: missingCostProducts,
  }
}

/** Joins draft components with their product data for display. Unknown products are skipped. */
export function buildComponentLines(components, products) {
  const productMap = new Map(products.map((p) => [p.id, p]))
  return components
    .filter((c) => productMap.has(c.productId))
    .map((c) => {
      const product = productMap.get(c.productId)
      return { productId: c.productId, quantity: c.quantity, name: product.name, unitCost: Number(product.cost) || 0 }
    })
}

/** @returns {string | null} the first validation error, or null when the draft can be saved */
export function validateDraft(draft) {
  if (!draft.name.trim()) return 'Ingresá el nombre del combo'
  const priceNum = Number(draft.price)
  if (!Number.isFinite(priceNum) || priceNum <= 0) return 'Ingresá un precio de venta válido'
  if (draft.components.length === 0) return 'Agregá al menos un producto al combo'
  return null
}

/**
 * Computes the combo_items writes needed to go from the saved items to the draft components.
 * There is no update mutation, so a quantity change becomes a delete plus an insert.
 */
export function diffComponents(existingItems, components) {
  const isKept = (item) =>
    components.some((c) => c.productId === item.productId && c.quantity === Number(item.quantity))

  return {
    toDelete: existingItems.filter((item) => !isKept(item)).map((item) => item.id),
    toAdd: components.filter(
      (c) => !existingItems.some((item) => item.productId === c.productId && Number(item.quantity) === c.quantity),
    ),
  }
}
