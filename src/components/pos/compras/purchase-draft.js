// Pure transitions for the purchase draft (lines of a new or edited purchase).

import { money } from '@/lib/format'
import { DIRECT_PURCHASE_SUPPLIER_ID, DIRECT_PURCHASE_SUPPLIER_NAME } from '@/lib/constants'

export const isDirectPurchaseSupplier = ({ id, name } = {}) =>
  id === DIRECT_PURCHASE_SUPPLIER_ID || name === DIRECT_PURCHASE_SUPPLIER_NAME

/** Supplier selection when editing: direct purchases map to the empty option. */
export const resolveEditingSupplierId = (purchase) =>
  isDirectPurchaseSupplier({ id: purchase?.supplierId, name: purchase?.supplierName })
    ? ''
    : purchase?.supplierId || ''

/**
 * Adds a product line, or increments it when the product is already in the draft.
 * @returns {{ items: object[], incremented: boolean }}
 */
export function addProductToDraft(items, product, lineId) {
  const incremented = items.some((it) => it.productId === product.id)

  if (incremented) {
    return {
      incremented,
      items: items.map((it) => {
        if (it.productId !== product.id) return it
        const qty = it.qty + 1
        const totalUnits = qty * it.unitSize
        return { ...it, qty, totalUnits, cost: totalUnits * (Number(it.unitCost) || 0) }
      }),
    }
  }

  const unitSize = product.unidad || 1
  return {
    incremented,
    items: [
      ...items,
      {
        id: lineId,
        productId: product.id,
        name: product.name,
        qty: 1,
        totalUnits: unitSize,
        // Empty on purpose: the real invoice price must be typed in.
        // The catalog cost is only shown as a reference.
        unitCost: null,
        previousCost: Number(product.cost) || 0,
        cost: 0,
        isCustom: false,
        unitSize,
      },
    ],
  }
}

export function updateDraftItemQty(items, id, nextQty) {
  return items.map((it) => {
    if (it.id !== id) return it
    const qty = Math.max(1, Number(nextQty) || 1)
    const totalUnits = qty * it.unitSize
    return { ...it, qty, totalUnits, cost: totalUnits * (it.unitCost || 0) }
  })
}

export function updateDraftItemUnitCost(items, id, nextUnitCost) {
  return items.map((it) => {
    if (it.id !== id) return it
    const unitCost = nextUnitCost === '' ? null : Math.max(0, Number(nextUnitCost) || 0)
    return { ...it, unitCost, cost: it.totalUnits * (unitCost ?? 0) }
  })
}

export const removeDraftItem = (items, id) => items.filter((it) => it.id !== id)

export const getDraftTotal = (items) => items.reduce((sum, it) => sum + (Number(it.cost) || 0), 0)

/**
 * Arguments for `onReceive(supplierId, total, detail, false, items)`.
 * @param {{ items: object[], supplierId: string, invoiceDate?: string|null, now: string }} params
 */
export function buildPurchasePayload({ items, supplierId, invoiceDate, now }) {
  const text = items
    .map((it) => `${it.name} (x${it.totalUnits} un. a ${money(it.unitCost)})`)
    .join(', ')

  return {
    supplierId: supplierId || DIRECT_PURCHASE_SUPPLIER_ID,
    total: getDraftTotal(items),
    detail: JSON.stringify({ text, invoiceDate: invoiceDate ?? now }),
    items: items.map((it) => ({
      productId: it.productId || null,
      name: it.name,
      qty: it.qty,
      totalUnits: it.totalUnits,
      cost: it.cost,
      unitCost: it.unitCost,
      isCustom: it.isCustom,
      unitSize: it.unitSize,
    })),
  }
}
