import { describe, it, expect } from 'vitest'
import {
  addComponent,
  buildComponentLines,
  diffComponents,
  draftFromCombo,
  emptyDraft,
  getDraftMetrics,
  setComponentQty,
  validateDraft,
} from './combo-draft'

const products = [
  { id: 'fernet', name: 'Fernet Branca', stock: 10, cost: 8000 },
  { id: 'coca', name: 'Coca-Cola 1.5L', stock: 4, cost: 2000 },
  { id: 'hielo', name: 'Hielo', stock: 20, cost: 0 },
]

describe('combo draft components', () => {
  it('adds a new component with quantity 1', () => {
    expect(addComponent([], 'fernet')).toEqual([{ productId: 'fernet', quantity: 1 }])
  })

  it('increments the quantity when the component already exists', () => {
    const components = [{ productId: 'coca', quantity: 1 }]
    expect(addComponent(components, 'coca')).toEqual([{ productId: 'coca', quantity: 2 }])
  })

  it('removes the component when its quantity drops to zero', () => {
    const components = [{ productId: 'coca', quantity: 1 }, { productId: 'fernet', quantity: 1 }]
    expect(setComponentQty(components, 'coca', 0)).toEqual([{ productId: 'fernet', quantity: 1 }])
  })

  it('does not mutate the original array', () => {
    const components = [{ productId: 'coca', quantity: 1 }]
    addComponent(components, 'coca')
    expect(components).toEqual([{ productId: 'coca', quantity: 1 }])
  })
})

describe('getDraftMetrics', () => {
  it('computes cost, margin, margin ratio and buildable units', () => {
    const components = [{ productId: 'fernet', quantity: 1 }, { productId: 'coca', quantity: 2 }]
    const metrics = getDraftMetrics(components, products, '15000')
    expect(metrics.cost).toBe(12000)
    expect(metrics.margin).toBe(3000)
    expect(metrics.marginRatio).toBeCloseTo(0.2)
    expect(metrics.buildable).toBe(2)
    expect(metrics.missingCost).toEqual([])
  })

  it('lists components without a known cost', () => {
    const metrics = getDraftMetrics([{ productId: 'hielo', quantity: 1 }], products, '1000')
    expect(metrics.missingCost).toEqual(['Hielo'])
  })

  it('returns a null margin ratio when there is no price', () => {
    const metrics = getDraftMetrics([{ productId: 'coca', quantity: 1 }], products, '')
    expect(metrics.marginRatio).toBeNull()
  })

  it('returns empty metrics when there are no components', () => {
    const metrics = getDraftMetrics([], products, '1000')
    expect(metrics.cost).toBe(0)
    expect(metrics.buildable).toBe(0)
  })
})

describe('buildComponentLines', () => {
  it('joins components with product name and unit cost, skipping unknown products', () => {
    const components = [{ productId: 'coca', quantity: 2 }, { productId: 'gone', quantity: 1 }]
    expect(buildComponentLines(components, products)).toEqual([
      { productId: 'coca', quantity: 2, name: 'Coca-Cola 1.5L', unitCost: 2000 },
    ])
  })
})

describe('validateDraft', () => {
  const valid = { ...emptyDraft(), name: 'Previa', price: '12000', components: [{ productId: 'coca', quantity: 1 }] }

  it('accepts a complete draft', () => {
    expect(validateDraft(valid)).toBeNull()
  })

  it('requires a name', () => {
    expect(validateDraft({ ...valid, name: '  ' })).toBe('Ingresá el nombre del combo')
  })

  it('requires a positive price', () => {
    expect(validateDraft({ ...valid, price: '0' })).toBe('Ingresá un precio de venta válido')
  })

  it('requires at least one component', () => {
    expect(validateDraft({ ...valid, components: [] })).toBe('Agregá al menos un producto al combo')
  })
})

describe('draftFromCombo', () => {
  it('builds an editable draft from a saved combo', () => {
    const combo = { id: 'c1', name: 'Previa', price: 12000, category: 'Bebidas', barcode: null }
    const comboItems = [
      { id: 'i1', comboId: 'c1', productId: 'coca', quantity: 2 },
      { id: 'i2', comboId: 'other', productId: 'fernet', quantity: 1 },
    ]
    expect(draftFromCombo(combo, comboItems)).toEqual({
      id: 'c1',
      name: 'Previa',
      price: '12000',
      category: 'Bebidas',
      barcode: '',
      components: [{ productId: 'coca', quantity: 2 }],
    })
  })
})

describe('draftFromCombo with products', () => {
  it('drops components whose product no longer exists', () => {
    const combo = { id: 'c1', name: 'Previa', price: 12000, category: 'Bebidas' }
    const comboItems = [
      { id: 'i1', comboId: 'c1', productId: 'coca', quantity: 1 },
      { id: 'i2', comboId: 'c1', productId: 'deleted', quantity: 1 },
    ]
    expect(draftFromCombo(combo, comboItems, products).components).toEqual([{ productId: 'coca', quantity: 1 }])
  })
})

describe('diffComponents', () => {
  const existing = [
    { id: 'i1', comboId: 'c1', productId: 'fernet', quantity: 1 },
    { id: 'i2', comboId: 'c1', productId: 'coca', quantity: 1 },
  ]

  it('keeps unchanged items and replaces the ones whose quantity changed', () => {
    const next = [{ productId: 'fernet', quantity: 1 }, { productId: 'coca', quantity: 2 }]
    expect(diffComponents(existing, next)).toEqual({
      toDelete: ['i2'],
      toAdd: [{ productId: 'coca', quantity: 2 }],
    })
  })

  it('deletes removed items and adds new ones', () => {
    const next = [{ productId: 'hielo', quantity: 1 }]
    expect(diffComponents(existing, next)).toEqual({
      toDelete: ['i1', 'i2'],
      toAdd: [{ productId: 'hielo', quantity: 1 }],
    })
  })
})
