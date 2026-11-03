/**
 * Helpers for Combos (Composite Bundles) and Promotions (2x1, NxM)
 */

/**
 * Calculates virtual stock and total cost for a composite combo based on its components.
 * 
 * @param {string} comboId 
 * @param {Array} comboItems - Array of { comboId, productId, quantity }
 * @param {Array} products - Array of product objects { id, stock, cost, ... }
 * @returns {{ virtualStock: number, unitCost: number, isAvailable: boolean, hasMissingCost: boolean, missingCostProducts: string[] }}
 *   unitCost sums only the components with a known cost; when hasMissingCost is true it is
 *   incomplete and must not be used as the combo cost.
 */
export function calculateComboMetrics(comboId, comboItems = [], products = []) {
  const components = comboItems.filter((ci) => ci.comboId === comboId)
  if (!components.length) {
    return { virtualStock: 0, unitCost: 0, isAvailable: false, hasMissingCost: false, missingCostProducts: [] }
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  let minStock = Infinity
  let totalCost = 0
  const missingCostProducts = []

  for (const comp of components) {
    const prod = productMap.get(comp.productId)
    const requiredQty = Number(comp.quantity) || 1
    const availableStock = Number(prod?.stock) || 0
    const prodCost = Number(prod?.cost) || 0

    if (!prod || requiredQty <= 0) {
      return { virtualStock: 0, unitCost: 0, isAvailable: false, hasMissingCost: false, missingCostProducts: [] }
    }

    if (prodCost <= 0) missingCostProducts.push(prod.name)

    const possibleCombos = Math.floor(availableStock / requiredQty)
    if (possibleCombos < minStock) {
      minStock = possibleCombos
    }

    totalCost += prodCost * requiredQty
  }

  const virtualStock = minStock === Infinity ? 0 : Math.max(0, minStock)

  return {
    virtualStock,
    unitCost: Number(totalCost.toFixed(2)),
    isAvailable: virtualStock > 0,
    hasMissingCost: missingCostProducts.length > 0,
    missingCostProducts,
  }
}

/**
 * Evaluates active promotions on cart items (e.g. 2x1, 3x2, percentage discount).
 * 
 * @param {Array} cart - Array of cart items { id, productId, name, price, qty }
 * @param {Array} promotions - Array of { id, name, type, productId, category, buyQty, payQty, discountPercent, active }
 * @returns {{ totalDiscount: number, promoDiscounts: Array<{ promoId: string, promoName: string, amount: number, productId: string }> }}
 */
export function evaluateCartPromotions(cart = [], promotions = []) {
  if (!cart.length || !promotions.length) {
    return { totalDiscount: 0, promoDiscounts: [] }
  }

  const activePromos = promotions.filter((p) => p.active !== false)
  const promoDiscounts = []
  let totalDiscount = 0

  for (const promo of activePromos) {
    // 1. NxM Promotion (e.g. 2x1, 3x2)
    if (promo.type === 'nxm' && promo.productId) {
      const cartItem = cart.find((i) => i.productId === promo.productId)
      const buyQty = Number(promo.buyQty) || 2
      const payQty = Number(promo.payQty) || 1

      if (cartItem && cartItem.qty >= buyQty && buyQty > payQty) {
        const fullSets = Math.floor(cartItem.qty / buyQty)
        const freeUnits = fullSets * (buyQty - payQty)
        const discountAmount = Number((freeUnits * cartItem.price).toFixed(2))

        if (discountAmount > 0) {
          promoDiscounts.push({
            promoId: promo.id,
            promoName: promo.name || `${buyQty}x${payQty}`,
            amount: discountAmount,
            productId: promo.productId,
          })
          totalDiscount += discountAmount
        }
      }
    }

    // 2. Percentage discount on specific product
    if (promo.type === 'percentage_discount' && promo.productId && promo.discountPercent > 0) {
      const cartItem = cart.find((i) => i.productId === promo.productId)
      if (cartItem && cartItem.qty > 0) {
        const discountAmount = Number(((cartItem.price * cartItem.qty * promo.discountPercent) / 100).toFixed(2))
        if (discountAmount > 0) {
          promoDiscounts.push({
            promoId: promo.id,
            promoName: promo.name || `${promo.discountPercent}% OFF`,
            amount: discountAmount,
            productId: promo.productId,
          })
          totalDiscount += discountAmount
        }
      }
    }
  }

  return {
    totalDiscount: Number(totalDiscount.toFixed(2)),
    promoDiscounts,
  }
}
