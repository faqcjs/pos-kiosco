import { describe, it, expect } from 'vitest'
import { applyPurchaseItems, calculateWeightedAverageCost } from './purchase-cost'

describe('calculateWeightedAverageCost', () => {
  it('averages existing stock cost with the purchase unit cost', () => {
    // 50 u. a $100 + 10 u. a $150 (línea de $1500) => 6500 / 60 = 108.33
    expect(
      calculateWeightedAverageCost({ currentStock: 50, currentCost: 100, addedUnits: 10, lineCost: 1500 })
    ).toBe(108.33)
  })

  it('uses the purchase unit cost when there is no previous stock', () => {
    expect(
      calculateWeightedAverageCost({ currentStock: 0, currentCost: 100, addedUnits: 10, lineCost: 1500 })
    ).toBe(150)
  })

  it('treats negative stock as zero', () => {
    expect(
      calculateWeightedAverageCost({ currentStock: -5, currentCost: 100, addedUnits: 10, lineCost: 1500 })
    ).toBe(150)
  })

  it('uses the purchase unit cost when the product had no cost loaded', () => {
    expect(
      calculateWeightedAverageCost({ currentStock: 50, currentCost: 0, addedUnits: 10, lineCost: 1500 })
    ).toBe(150)
  })

  it('keeps the current cost when the purchase line has no cost', () => {
    expect(
      calculateWeightedAverageCost({ currentStock: 50, currentCost: 100, addedUnits: 10, lineCost: 0 })
    ).toBe(100)
  })

  it('keeps the current cost when no units are added', () => {
    expect(
      calculateWeightedAverageCost({ currentStock: 50, currentCost: 100, addedUnits: 0, lineCost: 1500 })
    ).toBe(100)
  })
})

describe('applyPurchaseItems', () => {
  const product = { id: 'a', stock: 50, cost: 100 }

  it('returns the averaged cost and the new stock', () => {
    expect(applyPurchaseItems(product, [{ productId: 'a', totalUnits: 10, cost: 1500 }])).toEqual({
      cost: 108.33,
      stock: 60,
    })
  })

  it('applies repeated lines of the same product in order', () => {
    const items = [
      { productId: 'a', totalUnits: 10, cost: 1500 },
      { productId: 'b', totalUnits: 99, cost: 9999 },
      { productId: 'a', totalUnits: 40, cost: 4000 },
    ]
    // 50 a 100 + 10 a 150 => 60 a 108.33; + 40 a 100 => (6499.8 + 4000) / 100 = 105
    expect(applyPurchaseItems(product, items)).toEqual({ cost: 105, stock: 100 })
  })

  it('leaves the product unchanged when no line matches', () => {
    expect(applyPurchaseItems(product, [{ productId: 'b', totalUnits: 5, cost: 500 }])).toEqual({
      cost: 100,
      stock: 50,
    })
  })
})
