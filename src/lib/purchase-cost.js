// Costo promedio ponderado al recibir mercadería.
//
// El nuevo costo unitario combina el stock existente con lo comprado:
//   (stock × costo actual + unidades compradas × costo unitario de compra)
//   / (stock + unidades compradas)
//
// Misma regla que `receive_goods_rpc` en Supabase: si cambia una, cambiar la otra.

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const round2 = (value) => Math.round(value * 100) / 100

/**
 * @param {{ currentStock: number, currentCost: number, addedUnits: number, lineCost: number }} params
 *   lineCost es el costo total de la línea de compra (no el unitario).
 * @returns {number} nuevo costo unitario redondeado a 2 decimales
 */
export function calculateWeightedAverageCost({ currentStock, currentCost, addedUnits, lineCost }) {
  const cost = toNumber(currentCost)
  const units = toNumber(addedUnits)
  if (units <= 0) return cost

  const unitCost = round2(toNumber(lineCost) / units)
  if (unitCost <= 0) return cost

  const prevStock = Math.max(toNumber(currentStock), 0)
  if (prevStock === 0 || cost <= 0) return unitCost

  return round2((prevStock * cost + units * unitCost) / (prevStock + units))
}

/**
 * Aplica en orden todas las líneas de compra de un producto.
 * @returns {{ cost: number, stock: number }}
 */
export function applyPurchaseItems(product, items = []) {
  return (items || [])
    .filter((item) => item?.productId === product.id)
    .reduce(
      (acc, item) => ({
        cost: calculateWeightedAverageCost({
          currentStock: acc.stock,
          currentCost: acc.cost,
          addedUnits: item.totalUnits,
          lineCost: item.cost,
        }),
        stock: acc.stock + toNumber(item.totalUnits),
      }),
      { cost: toNumber(product.cost), stock: toNumber(product.stock) }
    )
}
