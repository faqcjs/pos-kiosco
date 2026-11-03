import { describe, it, expect } from 'vitest'
import { money } from '@/lib/format'
import {
  addProductToDraft,
  buildPurchasePayload,
  getDraftTotal,
  removeDraftItem,
  resolveEditingSupplierId,
  updateDraftItemQty,
  updateDraftItemUnitCost,
} from './purchase-draft'

const product = { id: 'p1', name: 'Coca 500', cost: '850', unidad: 6 }

const line = (overrides = {}) => ({
  id: 'l1',
  productId: 'p1',
  name: 'Coca 500',
  qty: 1,
  totalUnits: 6,
  unitCost: null,
  previousCost: 850,
  cost: 0,
  isCustom: false,
  unitSize: 6,
  ...overrides,
})

describe('addProductToDraft', () => {
  it('adds a new line with an empty unit cost and the catalog cost as reference', () => {
    const result = addProductToDraft([], product, 'l1')
    expect(result.incremented).toBe(false)
    expect(result.items).toEqual([line()])
  })

  it('defaults the unit size to 1 and previous cost to 0 when the product lacks them', () => {
    const { items } = addProductToDraft([], { id: 'p2', name: 'Chicle' }, 'l2')
    expect(items[0]).toMatchObject({ totalUnits: 1, unitSize: 1, previousCost: 0, unitCost: null, cost: 0 })
  })

  it('increments an existing line and recomputes units and cost', () => {
    const existing = [line({ qty: 2, totalUnits: 12, unitCost: 100, cost: 1200 })]
    const result = addProductToDraft(existing, product, 'ignored')
    expect(result.incremented).toBe(true)
    expect(result.items).toEqual([line({ qty: 3, totalUnits: 18, unitCost: 100, cost: 1800 })])
  })

  it('increments an existing line without unit cost to a zero cost', () => {
    const { items } = addProductToDraft([line()], product, 'ignored')
    expect(items).toEqual([line({ qty: 2, totalUnits: 12, cost: 0 })])
  })

  it('does not mutate the input items', () => {
    const existing = [line()]
    addProductToDraft(existing, product, 'x')
    expect(existing).toEqual([line()])
  })
})

describe('updateDraftItemQty', () => {
  it('sets the qty and recomputes units and cost', () => {
    const items = updateDraftItemQty([line({ unitCost: 100 })], 'l1', '4')
    expect(items).toEqual([line({ qty: 4, totalUnits: 24, unitCost: 100, cost: 2400 })])
  })

  it('clamps invalid or lower quantities to 1', () => {
    expect(updateDraftItemQty([line()], 'l1', '')[0].qty).toBe(1)
    expect(updateDraftItemQty([line()], 'l1', '-3')[0].qty).toBe(1)
  })

  it('leaves other lines untouched', () => {
    const other = line({ id: 'l2' })
    expect(updateDraftItemQty([line(), other], 'l1', 2)[1]).toBe(other)
  })
})

describe('updateDraftItemUnitCost', () => {
  it('sets the unit cost and recomputes the line cost', () => {
    const items = updateDraftItemUnitCost([line()], 'l1', '120.5')
    expect(items).toEqual([line({ unitCost: 120.5, cost: 723 })])
  })

  it('maps an empty input to null and a zero cost', () => {
    const items = updateDraftItemUnitCost([line({ unitCost: 100, cost: 600 })], 'l1', '')
    expect(items).toEqual([line({ unitCost: null, cost: 0 })])
  })

  it('clamps negative or invalid unit costs to 0', () => {
    expect(updateDraftItemUnitCost([line()], 'l1', '-5')[0].unitCost).toBe(0)
    expect(updateDraftItemUnitCost([line()], 'l1', 'abc')[0].unitCost).toBe(0)
  })
})

describe('removeDraftItem / getDraftTotal', () => {
  it('removes a line by id', () => {
    expect(removeDraftItem([line(), line({ id: 'l2' })], 'l1')).toEqual([line({ id: 'l2' })])
  })

  it('sums the line costs, ignoring non numeric values', () => {
    expect(getDraftTotal([line({ cost: 100 }), line({ cost: '50' }), line({ cost: undefined })])).toBe(150)
    expect(getDraftTotal([])).toBe(0)
  })
})

describe('resolveEditingSupplierId', () => {
  it('maps the direct purchase supplier to an empty selection', () => {
    expect(resolveEditingSupplierId({ supplierId: 'compra_directa' })).toBe('')
    expect(resolveEditingSupplierId({ supplierId: 's9', supplierName: 'Compra Directa' })).toBe('')
  })

  it('keeps a regular supplier id', () => {
    expect(resolveEditingSupplierId({ supplierId: 's1', supplierName: 'Arcor' })).toBe('s1')
    expect(resolveEditingSupplierId({})).toBe('')
  })
})

describe('buildPurchasePayload', () => {
  const items = [line({ unitCost: 100, cost: 600, extra: 'dropped' }), line({ id: 'l2', productId: undefined, name: 'Libre', qty: 2, totalUnits: 2, unitCost: 50, cost: 100, isCustom: true, unitSize: 1 })]

  it('builds the onReceive arguments for a new purchase', () => {
    const payload = buildPurchasePayload({ items, supplierId: 's1', invoiceDate: null, now: '2026-11-03T10:00:00.000Z' })
    expect(payload.supplierId).toBe('s1')
    expect(payload.total).toBe(700)
    expect(JSON.parse(payload.detail)).toEqual({
      text: `Coca 500 (x6 un. a ${money(100)}), Libre (x2 un. a ${money(50)})`,
      invoiceDate: '2026-11-03T10:00:00.000Z',
    })
    expect(payload.items).toEqual([
      { productId: 'p1', name: 'Coca 500', qty: 1, totalUnits: 6, cost: 600, unitCost: 100, isCustom: false, unitSize: 6 },
      { productId: null, name: 'Libre', qty: 2, totalUnits: 2, cost: 100, unitCost: 50, isCustom: true, unitSize: 1 },
    ])
  })

  it('falls back to the direct purchase supplier and keeps the edited purchase date', () => {
    const payload = buildPurchasePayload({ items, supplierId: '', invoiceDate: '2026-01-01T00:00:00.000Z', now: 'later' })
    expect(payload.supplierId).toBe('compra_directa')
    expect(JSON.parse(payload.detail).invoiceDate).toBe('2026-01-01T00:00:00.000Z')
  })
})
