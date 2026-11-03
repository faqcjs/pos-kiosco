import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

const REALTIME_CHANNEL = 'pos-realtime'
const REALTIME_EVENTS = ['INSERT', 'UPDATE', 'DELETE']

const byName = (a, b) => a.name.localeCompare(b.name)

// Cache semantics per table:
// - insertAt: where a new row goes on INSERT ('end' or 'start')
// - sort: applied after an INSERT only
// - upsert: INSERT and UPDATE both merge-or-append
// - ranged: the table has several date-ranged queries under the same key prefix
export const REALTIME_TABLES = {
  products: { queryKey: ['products'], insertAt: 'end', sort: byName },
  product_batches: { queryKey: ['product_batches'], upsert: true },
  combo_items: { queryKey: ['combo_items'], upsert: true },
  promotions: { queryKey: ['promotions'], upsert: true },
  expenses: { queryKey: ['expenses'], insertAt: 'start' },
  sales: { queryKey: ['sales'], insertAt: 'start', ranged: true },
  shifts: { queryKey: ['shifts'], insertAt: 'start' },
  customers: { queryKey: ['customers'], insertAt: 'end', sort: byName },
  suppliers: { queryKey: ['suppliers'], insertAt: 'end', sort: byName },
  users: { queryKey: ['users'], insertAt: 'end' },
}

const mergeById = (rows, row) => rows.map((r) => (r.id === row.id ? { ...r, ...row } : r))

// Pure: returns the next cached rows for one postgres_changes payload.
export function applyRealtimeChange(rows = [], payload, options = {}) {
  const { eventType, new: newRow, old: oldRow } = payload
  const { insertAt = 'end', sort, upsert = false, ranged = false } = options

  if (ranged && !Array.isArray(rows)) return rows

  if (eventType === 'DELETE') {
    const targetId = oldRow?.id ?? newRow?.id
    return rows.filter((r) => r.id !== targetId)
  }

  if (upsert && (eventType === 'INSERT' || eventType === 'UPDATE')) {
    const exists = rows.some((r) => r.id === newRow.id)
    return exists ? mergeById(rows, newRow) : [...rows, newRow]
  }

  if (eventType === 'INSERT') {
    if (rows.some((r) => r.id === newRow.id)) return rows
    const inserted = insertAt === 'start' ? [newRow, ...rows] : [...rows, newRow]
    return sort ? inserted.sort(sort) : inserted
  }

  if (eventType === 'UPDATE') return mergeById(rows, newRow)

  return rows
}

export function RealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(REALTIME_CHANNEL)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const options = REALTIME_TABLES[payload.table]
        if (!options || !REALTIME_EVENTS.includes(payload.eventType)) return

        const updater = (old) => applyRealtimeChange(old, payload, options)
        if (options.ranged) {
          qc.setQueriesData({ queryKey: options.queryKey }, updater)
        } else {
          qc.setQueryData(options.queryKey, updater)
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
  return null
}
