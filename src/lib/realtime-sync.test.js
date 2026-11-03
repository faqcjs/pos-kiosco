import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}))

import { applyRealtimeChange, REALTIME_TABLES } from './realtime-sync'

const rows = [
  { id: 'a', name: 'Alfajor', stock: 1 },
  { id: 'c', name: 'Chicle', stock: 3 },
]

describe('applyRealtimeChange', () => {
  it('INSERT appends a new row', () => {
    const result = applyRealtimeChange(rows, { eventType: 'INSERT', new: { id: 'z', name: 'Zz' } })
    expect(result.map((r) => r.id)).toEqual(['a', 'c', 'z'])
    expect(rows).toHaveLength(2)
  })

  it('INSERT keeps the same array when the row already exists', () => {
    const result = applyRealtimeChange(rows, { eventType: 'INSERT', new: { id: 'a', name: 'Otro' } })
    expect(result).toBe(rows)
  })

  it('UPDATE merges the row with the same id', () => {
    const result = applyRealtimeChange(rows, { eventType: 'UPDATE', new: { id: 'c', stock: 9 } })
    expect(result).toEqual([rows[0], { id: 'c', name: 'Chicle', stock: 9 }])
    expect(rows[1].stock).toBe(3)
  })

  it('UPDATE ignores unknown rows when not upserting', () => {
    const result = applyRealtimeChange(rows, { eventType: 'UPDATE', new: { id: 'x', stock: 9 } })
    expect(result).toEqual(rows)
  })

  it('DELETE removes by old id, falling back to new id', () => {
    expect(applyRealtimeChange(rows, { eventType: 'DELETE', old: { id: 'a' } }).map((r) => r.id)).toEqual(['c'])
    expect(applyRealtimeChange(rows, { eventType: 'DELETE', old: {}, new: { id: 'c' } }).map((r) => r.id)).toEqual(['a'])
  })

  it('defaults a missing cache to an empty array', () => {
    expect(applyRealtimeChange(undefined, { eventType: 'INSERT', new: { id: 'a' } })).toEqual([{ id: 'a' }])
  })

  it('sorts by name after an INSERT when a sort is given', () => {
    const result = applyRealtimeChange(rows, { eventType: 'INSERT', new: { id: 'b', name: 'Bon o Bon' } }, REALTIME_TABLES.products)
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not sort on UPDATE', () => {
    const unsorted = [{ id: 'c', name: 'C' }, { id: 'a', name: 'A' }]
    const result = applyRealtimeChange(unsorted, { eventType: 'UPDATE', new: { id: 'a', name: 'A2' } }, REALTIME_TABLES.products)
    expect(result.map((r) => r.id)).toEqual(['c', 'a'])
  })

  it('prepends on INSERT when insertAt is start (sales, shifts)', () => {
    const result = applyRealtimeChange(rows, { eventType: 'INSERT', new: { id: 'n' } }, REALTIME_TABLES.shifts)
    expect(result.map((r) => r.id)).toEqual(['n', 'a', 'c'])
  })

  it('upserts on INSERT and UPDATE when upsert is set (batches, combos, promotions)', () => {
    const opts = REALTIME_TABLES.product_batches
    expect(applyRealtimeChange(rows, { eventType: 'UPDATE', new: { id: 'x' } }, opts).map((r) => r.id)).toEqual(['a', 'c', 'x'])
    expect(applyRealtimeChange(rows, { eventType: 'INSERT', new: { id: 'a', stock: 7 } }, opts)[0]).toEqual({ id: 'a', name: 'Alfajor', stock: 7 })
  })

  it('leaves non-array caches untouched for date-ranged queries (sales)', () => {
    const opts = REALTIME_TABLES.sales
    expect(opts.ranged).toBe(true)
    const cached = { pages: [] }
    expect(applyRealtimeChange(cached, { eventType: 'INSERT', new: { id: 'n' } }, opts)).toBe(cached)
  })

  it('returns the cache unchanged for unknown events', () => {
    expect(applyRealtimeChange(rows, { eventType: 'TRUNCATE' })).toBe(rows)
  })
})

describe('REALTIME_TABLES', () => {
  it('keeps the per-table semantics of the realtime channel', () => {
    expect(Object.keys(REALTIME_TABLES).sort()).toEqual(
      ['combo_items', 'customers', 'product_batches', 'products', 'promotions', 'sales', 'shifts', 'suppliers', 'users'],
    )
    expect(REALTIME_TABLES.customers.sort).toBeTypeOf('function')
    expect(REALTIME_TABLES.suppliers.sort).toBeTypeOf('function')
    expect(REALTIME_TABLES.users.sort).toBeUndefined()
    expect(REALTIME_TABLES.combo_items.upsert).toBe(true)
    expect(REALTIME_TABLES.promotions.upsert).toBe(true)
    expect(REALTIME_TABLES.sales.insertAt).toBe('start')
  })
})
