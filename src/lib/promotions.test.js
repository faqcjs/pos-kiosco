import { describe, it, expect } from 'vitest'
import { calculateComboMetrics, evaluateCartPromotions } from './promotions'

describe('calculateComboMetrics', () => {
  const products = [
    { id: 'prod-fernet', name: 'Fernet Branca', stock: 10, cost: 8000 },
    { id: 'prod-coca', name: 'Coca-Cola 1.5L', stock: 4, cost: 2000 },
    { id: 'prod-hielo', name: 'Hielo', stock: 20, cost: 500 },
  ]

  const comboItems = [
    { comboId: 'combo-previa', productId: 'prod-fernet', quantity: 1 },
    { comboId: 'combo-previa', productId: 'prod-coca', quantity: 1 },
  ]

  it('calculates virtual stock constrained by the bottleneck component', () => {
    // Fernet stock is 10, Coca stock is 4. Bottleneck is Coca -> 4 combos possible
    const metrics = calculateComboMetrics('combo-previa', comboItems, products)
    expect(metrics.virtualStock).toBe(4)
    expect(metrics.isAvailable).toBe(true)
    expect(metrics.unitCost).toBe(10000) // 8000 + 2000
  })

  it('calculates virtual stock when a component requires multiple units', () => {
    const multiItems = [
      { comboId: 'combo-fernet-duo', productId: 'prod-coca', quantity: 2 },
    ]
    // Coca stock is 4, requires 2 -> 4 / 2 = 2 combos
    const metrics = calculateComboMetrics('combo-fernet-duo', multiItems, products)
    expect(metrics.virtualStock).toBe(2)
  })

  it('returns 0 stock if any component is out of stock', () => {
    const emptyProducts = [
      { id: 'prod-fernet', name: 'Fernet', stock: 10, cost: 8000 },
      { id: 'prod-coca', name: 'Coca', stock: 0, cost: 2000 },
    ]
    const metrics = calculateComboMetrics('combo-previa', comboItems, emptyProducts)
    expect(metrics.virtualStock).toBe(0)
    expect(metrics.isAvailable).toBe(false)
  })

  it('reports no missing cost when every component has a cost', () => {
    const metrics = calculateComboMetrics('combo-previa', comboItems, products)
    expect(metrics.hasMissingCost).toBe(false)
    expect(metrics.missingCostProducts).toEqual([])
  })

  it('flags components without a cost loaded', () => {
    const noCostCoca = [
      { id: 'prod-fernet', name: 'Fernet Branca', stock: 10, cost: 8000 },
      { id: 'prod-coca', name: 'Coca-Cola 1.5L', stock: 4, cost: 0 },
    ]
    const metrics = calculateComboMetrics('combo-previa', comboItems, noCostCoca)
    expect(metrics.hasMissingCost).toBe(true)
    expect(metrics.missingCostProducts).toEqual(['Coca-Cola 1.5L'])
    expect(metrics.unitCost).toBe(8000)
  })

  it('handles unknown comboId gracefully', () => {
    const metrics = calculateComboMetrics('non-existent', comboItems, products)
    expect(metrics.virtualStock).toBe(0)
    expect(metrics.unitCost).toBe(0)
    expect(metrics.isAvailable).toBe(false)
  })
})

describe('evaluateCartPromotions', () => {
  const promotions = [
    {
      id: 'promo-2x1-alfajor',
      name: '2x1 Alfajor Havanna',
      type: 'nxm',
      productId: 'prod-alfajor',
      buyQty: 2,
      payQty: 1,
      active: true,
    },
    {
      id: 'promo-3x2-chicle',
      name: '3x2 Chicles Beldent',
      type: 'nxm',
      productId: 'prod-chicle',
      buyQty: 3,
      payQty: 2,
      active: true,
    },
    {
      id: 'promo-10pct-coca',
      name: '10% OFF Coca-Cola',
      type: 'percentage_discount',
      productId: 'prod-coca',
      discountPercent: 10,
      active: true,
    },
  ]

  it('applies 2x1 promotion correctly', () => {
    const cart = [
      { id: 'item-1', productId: 'prod-alfajor', name: 'Alfajor Havanna', price: 1000, qty: 2 },
    ]
    const result = evaluateCartPromotions(cart, promotions)
    expect(result.totalDiscount).toBe(1000)
    expect(result.promoDiscounts).toHaveLength(1)
    expect(result.promoDiscounts[0].amount).toBe(1000)
  })

  it('applies 2x1 promotion multiple times for higher quantities (e.g. 5 units)', () => {
    const cart = [
      // 5 units: 2 full sets of 2 = 2 free units ($2000 discount), 1 unit at regular price
      { id: 'item-1', productId: 'prod-alfajor', name: 'Alfajor Havanna', price: 1000, qty: 5 },
    ]
    const result = evaluateCartPromotions(cart, promotions)
    expect(result.totalDiscount).toBe(2000)
  })

  it('applies 3x2 promotion correctly', () => {
    const cart = [
      { id: 'item-2', productId: 'prod-chicle', name: 'Chicles Beldent', price: 500, qty: 3 },
    ]
    const result = evaluateCartPromotions(cart, promotions)
    // 3 chicles, pay for 2 -> 1 free chicle = 500 discount
    expect(result.totalDiscount).toBe(500)
  })

  it('applies percentage discount correctly', () => {
    const cart = [
      { id: 'item-3', productId: 'prod-coca', name: 'Coca-Cola', price: 2000, qty: 2 },
    ]
    const result = evaluateCartPromotions(cart, promotions)
    // 2 * 2000 = 4000. 10% of 4000 = 400
    expect(result.totalDiscount).toBe(400)
  })

  it('does not apply inactive promotions', () => {
    const inactivePromos = [
      {
        id: 'promo-inactive',
        type: 'nxm',
        productId: 'prod-alfajor',
        buyQty: 2,
        payQty: 1,
        active: false,
      },
    ]
    const cart = [
      { id: 'item-1', productId: 'prod-alfajor', name: 'Alfajor Havanna', price: 1000, qty: 2 },
    ]
    const result = evaluateCartPromotions(cart, inactivePromos)
    expect(result.totalDiscount).toBe(0)
    expect(result.promoDiscounts).toHaveLength(0)
  })
})
