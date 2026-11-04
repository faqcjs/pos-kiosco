// Pure transitions for the purchase draft (lines of a new or edited purchase).

import { money } from '@/lib/format'
import { DIRECT_PURCHASE_SUPPLIER_ID, DIRECT_PURCHASE_SUPPLIER_NAME } from '@/lib/constants'

// How a purchase was paid. ACCOUNT also covers a purchase the cashier already paid with a
// "Pago a proveedor" egreso: that payment cancels the debt this purchase adds.
export const PURCHASE_PAYMENT = Object.freeze({ CASH: 'caja', OTHER: 'otro', ACCOUNT: 'cuenta' })

export const PURCHASE_PAYMENT_OPTIONS = [
  {
    id: PURCHASE_PAYMENT.CASH,
    label: 'Con plata de la caja',
    hint: 'Queda pagada y se descuenta de la caja abierta.',
  },
  {
    id: PURCHASE_PAYMENT.OTHER,
    label: 'Pagada por transferencia u otro medio',
    hint: 'Queda pagada, sin tocar la caja.',
  },
  {
    id: PURCHASE_PAYMENT.ACCOUNT,
    label: 'A cuenta',
    hint: 'Queda como deuda con el proveedor. Usala si se paga después o si el cajero ya la pagó con "Pago a proveedor".',
  },
]

/** @returns {string | null} the error that blocks saving, or null */
export function validatePurchasePayment({ payment, cashOpen, canPay }) {
  if (payment === PURCHASE_PAYMENT.CASH && !cashOpen) {
    return 'No hay una caja abierta. Abrí la caja para pagar con plata de la caja, o elegí otra forma de pago.'
  }
  if (payment === PURCHASE_PAYMENT.OTHER && !canPay) {
    return 'Tu usuario no puede registrar pagos a proveedores. Elegí "A cuenta" y que un administrador o cajero registre el pago.'
  }
  return null
}

const PURCHASE_SUCCESS_MESSAGES = Object.freeze({
  [PURCHASE_PAYMENT.CASH]: 'Compra registrada y pagada con plata de la caja',
  [PURCHASE_PAYMENT.OTHER]: 'Compra registrada y pagada',
  [PURCHASE_PAYMENT.ACCOUNT]: 'Compra registrada, stock y costos de productos actualizados',
})
const EDITED_PURCHASE_MESSAGE = 'Compra actualizada exitosamente'

export const getPurchaseSuccessMessage = ({ isEditing, payment }) =>
  isEditing ? EDITED_PURCHASE_MESSAGE : (PURCHASE_SUCCESS_MESSAGES[payment] ?? PURCHASE_SUCCESS_MESSAGES[PURCHASE_PAYMENT.ACCOUNT])

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
 * Arguments for `onReceive(supplierId, total, detail, paidCash, items)`, plus whether the purchase
 * must then be settled with a supplier payment that does not touch the register.
 * @param {{ items: object[], supplierId: string, invoiceDate?: string|null, now: string, payment?: string }} params
 */
export function buildPurchasePayload({ items, supplierId, invoiceDate, now, payment = PURCHASE_PAYMENT.ACCOUNT }) {
  const text = items
    .map((it) => `${it.name} (x${it.totalUnits} un. a ${money(it.unitCost)})`)
    .join(', ')

  return {
    supplierId: supplierId || DIRECT_PURCHASE_SUPPLIER_ID,
    total: getDraftTotal(items),
    paidCash: payment === PURCHASE_PAYMENT.CASH,
    // A direct purchase has no supplier account to settle
    settleWithoutCash: payment === PURCHASE_PAYMENT.OTHER && Boolean(supplierId),
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
