import { describe, it, expect } from 'vitest'
import {
  buildProductsMap,
  freezeItemCosts,
  getSaleCost,
  getSaleLineCosts,
  getSaleProfit,
  getUncostedRevenue,
  getUncostedItems,
  summarizeUncostedSales,
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

describe('getUncostedRevenue / getSaleProfit', () => {
  it('separa el monto rápido de la ganancia', () => {
    const sale = {
      total: 1200,
      items: [
        { productId: 'a', price: 200, qty: 1, cost: 100 },
        { name: 'Monto rápido', price: 1000, qty: 1 },
      ],
    }
    expect(getUncostedRevenue(sale)).toBe(1000)
    expect(getSaleProfit(sale, MAP)).toBe(100)
  })

  it('reparte descuentos y recargos proporcionalmente', () => {
    // subtotal 1200, total 600 (50% de descuento)
    const sale = {
      total: 600,
      items: [
        { productId: 'a', price: 200, qty: 1, cost: 50 },
        { name: 'Monto rápido', price: 1000, qty: 1 },
      ],
    }
    expect(getUncostedRevenue(sale)).toBe(500)
    expect(getSaleProfit(sale, MAP)).toBe(50)
  })

  it('una venta sin monto rápido no tiene ingresos sin costo', () => {
    const sale = { total: 400, items: [{ productId: 'a', price: 200, qty: 2, cost: 100 }] }
    expect(getUncostedRevenue(sale)).toBe(0)
    expect(getSaleProfit(sale, MAP)).toBe(200)
  })

  it('una venta solo de monto rápido no aporta ganancia', () => {
    const sale = { total: 500, items: [{ name: 'Monto rápido', price: 500, qty: 1 }] }
    expect(getUncostedRevenue(sale)).toBe(500)
    expect(getSaleProfit(sale, MAP)).toBe(0)
  })
})

describe('productos sin costo cargado', () => {
  it('cuentan como ventas sin costo y no suman ganancia', () => {
    // 'c' no tiene costo en el catálogo
    const sale = {
      total: 350,
      items: [
        { productId: 'a', price: 200, qty: 1, cost: 100 },
        { productId: 'c', price: 150, qty: 1, cost: 0 },
      ],
    }
    expect(getUncostedRevenue(sale, MAP)).toBe(150)
    expect(getSaleProfit(sale, MAP)).toBe(100)
  })

  it('vuelven a la ganancia cuando después se carga el costo', () => {
    const sale = { total: 150, items: [{ productId: 'c', price: 150, qty: 1, cost: 0 }] }
    const withCost = buildProductsMap([{ id: 'c', name: 'Sin costo', cost: 60, price: 150 }])
    expect(getUncostedRevenue(sale, withCost)).toBe(0)
    expect(getSaleProfit(sale, withCost)).toBe(90)
  })

  it('ventas viejas con costo total guardado no se marcan sin costo', () => {
    const sale = {
      total: 350,
      cost: 200,
      items: [
        { productId: 'a', price: 200, qty: 1 },
        { productId: 'c', price: 150, qty: 1 },
      ],
    }
    expect(getUncostedRevenue(sale, MAP)).toBe(0)
    expect(getSaleProfit(sale, MAP)).toBe(150)
  })
})

describe('combos con productos sin costo cargado', () => {
  const products = [
    ...PRODUCTS,
    { id: 'combo2', name: 'Combo Incompleto', cost: 100, price: 400, isCombo: true },
  ]
  const comboItems = [...COMBO_ITEMS, { comboId: 'combo2', productId: 'a', quantity: 1 }, { comboId: 'combo2', productId: 'c', quantity: 1 }]

  it('al vender, congela costo 0 si falta el costo de algún componente', () => {
    const [item] = freezeItemCosts([{ productId: 'combo2', price: 400, qty: 1 }], products, comboItems)
    expect(item.cost).toBe(0)
  })

  it('al vender, congela la suma de componentes si todos tienen costo', () => {
    const [item] = freezeItemCosts([{ productId: 'combo1', price: 600, qty: 1 }], products, comboItems)
    expect(item.cost).toBe(400)
  })

  it('el combo incompleto cuenta como venta sin costo', () => {
    const map = buildProductsMap(products)
    const sale = { total: 400, items: [{ productId: 'combo2', price: 400, qty: 1, cost: 0 }] }
    expect(getUncostedRevenue(sale, map, comboItems)).toBe(400)
    expect(getSaleProfit(sale, map, comboItems)).toBe(0)
  })
})

describe('getUncostedItems / summarizeUncostedSales', () => {
  const products = [
    ...PRODUCTS,
    { id: 'combo2', name: 'Combo Incompleto', cost: 0, price: 400, isCombo: true },
  ]
  const map = buildProductsMap(products)

  it('devuelve los ítems sin costo con su motivo', () => {
    const sale = {
      total: 1050,
      items: [
        { productId: 'a', name: 'Alfajor', price: 200, qty: 1, cost: 100 },
        { productId: 'c', name: 'Sin costo', price: 150, qty: 1, cost: 0 },
        { productId: 'combo2', name: 'Combo Incompleto', price: 400, qty: 1, cost: 0 },
        { name: 'Pan', price: 300, qty: 1 },
      ],
    }
    expect(getUncostedItems(sale, map).map(({ index, reason }) => ({ index, reason }))).toEqual([
      { index: 1, reason: 'product' },
      { index: 2, reason: 'combo' },
      { index: 3, reason: 'quick' },
    ])
  })

  it('una venta con todos los costos no tiene ítems sin costo', () => {
    const sale = { total: 200, items: [{ productId: 'a', name: 'Alfajor', price: 200, qty: 1, cost: 100 }] }
    expect(getUncostedItems(sale, map)).toEqual([])
  })

  it('agrupa por producto o por nombre de monto rápido, ordenado por lo cobrado', () => {
    const sales = [
      { total: 450, items: [{ productId: 'c', name: 'Sin costo', price: 150, qty: 3, cost: 0 }] },
      {
        total: 500,
        items: [
          { name: 'Pan', price: 300, qty: 1 },
          { name: ' pan ', price: 200, qty: 1 },
        ],
      },
      { total: 150, items: [{ productId: 'c', name: 'Sin costo', price: 150, qty: 1, cost: 0 }] },
    ]
    expect(summarizeUncostedSales(sales, map)).toEqual([
      { key: 'product:c', name: 'Sin costo', reason: 'product', qty: 4, revenue: 600, salesCount: 2 },
      { key: 'quick:pan', name: 'Pan', reason: 'quick', qty: 2, revenue: 500, salesCount: 1 },
    ])
  })

  it('reparte el descuento de la venta en lo cobrado', () => {
    const sales = [
      {
        total: 300,
        items: [
          { productId: 'a', name: 'Alfajor', price: 200, qty: 1, cost: 100 },
          { name: 'Pan', price: 400, qty: 1 },
        ],
      },
    ]
    expect(summarizeUncostedSales(sales, map)[0].revenue).toBe(200)
  })
})
