import { describe, it, expect } from 'vitest'
import {
  buildProductsMap,
  freezeItemCosts,
  getSaleCost,
  getSaleLineCosts,
  sumItemsCost,
} from './sale-cost'

const PRODUCTS = [
  { id: 'a', name: 'Alfajor', cost: 100, price: 200 },
  { id: 'b', name: 'Gaseosa', cost: 300, price: 500 },
  { id: 'c', name: 'Sin costo', cost: 0, price: 150 },
  { id: 'combo1', name: 'Combo Merienda', cost: 0, price: 600, isCombo: true },
]
const COMBO_ITEMS = [
  { comboId: 'combo1', productId: 'a', quantity: 1 },
  { comboId: 'combo1', productId: 'b', quantity: 1 },
]
const MAP = buildProductsMap(PRODUCTS)

describe('getSaleCost / getSaleLineCosts', () => {
  it('ventas nuevas: suma el costo congelado de cada ítem', () => {
    const sale = {
      cost: 700,
      items: [
        { productId: 'a', price: 200, qty: 2, cost: 90 },
        { productId: 'b', price: 500, qty: 1, cost: 250 },
      ],
    }
    expect(getSaleCost(sale, MAP)).toBe(2 * 90 + 250)
    expect(getSaleLineCosts(sale, MAP)).toEqual([180, 250])
  })

  it('ventas nuevas: el costo congelado no cambia aunque cambie el catálogo', () => {
    const sale = { items: [{ productId: 'a', price: 200, qty: 1, cost: 80 }] }
    expect(getSaleCost(sale, MAP)).toBe(80)
  })

  it('ventas nuevas: si el costo congelado es 0 usa el costo actual del catálogo', () => {
    const sale = { items: [{ productId: 'a', price: 200, qty: 3, cost: 0 }] }
    expect(getSaleCost(sale, MAP)).toBe(300)
  })

  it('el monto rápido (sin producto) suma costo 0', () => {
    const sale = {
      items: [
        { productId: 'a', price: 200, qty: 1, cost: 100 },
        { name: 'Monto rápido', price: 1000, qty: 1 },
      ],
    }
    expect(getSaleCost(sale, MAP)).toBe(100)
    expect(getSaleLineCosts(sale, MAP)).toEqual([100, 0])
  })

  it('ventas viejas: usa el costo guardado en la venta', () => {
    const sale = {
      cost: 650,
      items: [
        { productId: 'a', price: 200, qty: 1 },
        { productId: 'b', price: 500, qty: 1 },
      ],
    }
    expect(getSaleCost(sale, MAP)).toBe(650)
  })

  it('ventas viejas: las líneas suman exactamente el costo guardado', () => {
    const sale = {
      cost: 650,
      items: [
        { productId: 'a', price: 200, qty: 1 },
        { productId: 'b', price: 500, qty: 1 },
      ],
    }
    const lines = getSaleLineCosts(sale, MAP)
    expect(lines).toHaveLength(2)
    expect(lines.reduce((s, c) => s + c, 0)).toBeCloseTo(650, 6)
    // la línea más cara según catálogo recibe la mayor parte
    expect(lines[1]).toBeGreaterThan(lines[0])
  })

  it('ventas viejas con costo guardado 0: recalcula con el costo actual del catálogo', () => {
    const sale = {
      cost: 0,
      items: [
        { productId: 'a', price: 200, qty: 2 },
        { productId: 'b', price: 500, qty: 1 },
      ],
    }
    expect(getSaleCost(sale, MAP)).toBe(2 * 100 + 300)
  })

  it('ventas viejas con costo guardado pero sin costos en el catálogo: reparte por importe', () => {
    const sale = {
      cost: 100,
      items: [
        { productId: 'c', price: 150, qty: 1 },
        { name: 'Monto rápido', price: 50, qty: 1 },
      ],
    }
    const lines = getSaleLineCosts(sale, MAP)
    expect(lines.reduce((s, c) => s + c, 0)).toBeCloseTo(100, 6)
  })

  it('venta sin ítems usa el costo guardado o 0', () => {
    expect(getSaleCost({ cost: 50, items: [] }, MAP)).toBe(50)
    expect(getSaleCost({ items: [] }, MAP)).toBe(0)
    expect(getSaleCost(undefined, MAP)).toBe(0)
  })
})

describe('freezeItemCosts / sumItemsCost', () => {
  it('congela el costo actual en cada ítem con producto y deja intactos los montos rápidos', () => {
    const items = [
      { id: 'a', productId: 'a', name: 'Alfajor', price: 200, qty: 2 },
      { id: 'q1', name: 'Monto rápido', price: 1000, qty: 1 },
    ]
    const frozen = freezeItemCosts(items, PRODUCTS)

    expect(frozen[0]).toEqual({ ...items[0], cost: 100 })
    expect(frozen[1]).toBe(items[1])
    expect('cost' in frozen[1]).toBe(false)
    expect(sumItemsCost(frozen)).toBe(200)
  })

  it('no modifica los ítems originales', () => {
    const items = [{ id: 'a', productId: 'a', price: 200, qty: 1 }]
    freezeItemCosts(items, PRODUCTS)
    expect('cost' in items[0]).toBe(false)
  })

  it('producto sin costo cargado congela costo 0', () => {
    const frozen = freezeItemCosts([{ productId: 'c', price: 150, qty: 1 }], PRODUCTS)
    expect(frozen[0].cost).toBe(0)
  })

  it('congela costo unitario para combos según sus componentes', () => {
    const items = [{ productId: 'combo1', price: 600, qty: 2 }]
    // combo1 = 1 Alfajor (100) + 1 Gaseosa (300) = 400
    const frozen = freezeItemCosts(items, PRODUCTS, COMBO_ITEMS)
    expect(frozen[0].cost).toBe(400)
    expect(sumItemsCost(frozen)).toBe(800)
  })
})
