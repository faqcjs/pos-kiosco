// Cálculo único del costo de una venta. Lo usan todos los reportes para que
// la ganancia estimada sea la misma en cualquier pestaña.
//
// Orden de prioridad:
//  1. Ventas nuevas: cada ítem con producto trae su costo congelado (`item.cost`),
//     el costo unitario que tenía el producto al momento de vender.
//     Si ese costo es 0 (el producto aún no tenía costo cargado), se usa el costo
//     actual del catálogo como aproximación.
//  2. Ventas viejas (sin costo por ítem): se usa el costo guardado en la venta
//     (`sale.cost`). Si también es 0, se recalcula con el costo actual del catálogo.
//
// Los ítems sin producto (monto rápido) no tienen costo conocido y suman 0.

import { calculateComboMetrics } from './promotions'

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const getQty = (item) => toNumber(item?.qty) || 1

const getCatalogUnitCost = (item, productsMap, comboItems = []) => {
  if (!item?.productId || !productsMap) return 0
  const prod = productsMap.get(item.productId)
  if (!prod) return 0
  if (prod.isCombo && Array.isArray(comboItems) && comboItems.length > 0) {
    const rawProducts = Array.from(productsMap.values())
    const metrics = calculateComboMetrics(item.productId, comboItems, rawProducts)
    if (metrics.unitCost > 0) return metrics.unitCost
  }
  return toNumber(prod.cost)
}

// Una venta es "nueva" si al menos un ítem con producto trae su costo congelado.
const hasFrozenItemCosts = (items) =>
  items.some((item) => item?.productId && typeof item.cost === 'number')

/**
 * Arma un Map con id → producto para consultar costos del catálogo.
 */
export function buildProductsMap(products) {
  const map = new Map()
  if (Array.isArray(products)) {
    products.forEach((p) => {
      if (p?.id) map.set(p.id, p)
    })
  }
  return map
}

/**
 * Costo total de cada línea de la venta (costo unitario × cantidad),
 * en el mismo orden que `sale.items`.
 */
export function getSaleLineCosts(sale, productsMap, comboItems = []) {
  const items = Array.isArray(sale?.items) ? sale.items : []
  if (items.length === 0) return []

  if (hasFrozenItemCosts(items)) {
    return items.map((item) => {
      const frozen = toNumber(item?.cost)
      const unitCost = frozen > 0 ? frozen : getCatalogUnitCost(item, productsMap, comboItems)
      return unitCost * getQty(item)
    })
  }

  // Venta vieja: solo se conoce el costo total de la venta. Se reparte entre
  // las líneas según su costo actual de catálogo (o según su importe si no hay
  // costos de catálogo), así la suma de las líneas coincide con el total.
  const catalogLines = items.map((item) => getCatalogUnitCost(item, productsMap, comboItems) * getQty(item))
  const catalogSum = catalogLines.reduce((sum, c) => sum + c, 0)
  const savedCost = toNumber(sale?.cost)

  if (savedCost <= 0) return catalogLines

  const weights =
    catalogSum > 0 ? catalogLines : items.map((item) => toNumber(item?.price) * getQty(item))
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  if (weightSum <= 0) return items.map(() => 0)

  return weights.map((w) => (w / weightSum) * savedCost)
}

/**
 * Costo total de la venta.
 */
export function getSaleCost(sale, productsMap, comboItems = []) {
  const items = Array.isArray(sale?.items) ? sale.items : []
  const savedCost = toNumber(sale?.cost)

  if (!hasFrozenItemCosts(items) && savedCost > 0) return savedCost

  return getSaleLineCosts(sale, productsMap, comboItems).reduce((sum, c) => sum + c, 0)
}

/**
 * Devuelve los ítems con el costo unitario actual congelado.
 * Los ítems sin producto (monto rápido) se devuelven sin cambios.
 */
export function freezeItemCosts(items, products, comboItems = []) {
  const productsMap = buildProductsMap(products)
  return (items || []).map((item) => {
    if (!item?.productId) return item
    const unitCost = getCatalogUnitCost(item, productsMap, comboItems)
    return { ...item, cost: unitCost }
  })
}

/**
 * Costo total de una lista de ítems ya congelados.
 */
export function sumItemsCost(items) {
  return (items || []).reduce(
    (sum, item) => (item?.productId ? sum + toNumber(item.cost) * getQty(item) : sum),
    0
  )
}
