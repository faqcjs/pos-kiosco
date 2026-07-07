import { createClient } from '@supabase/supabase-js'
import { SEED_PRODUCTS, SEED_CUSTOMERS, SEED_SUPPLIERS, generateMockSales } from './seed'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If env variables are not present, we switch to Mock mode
const isMock = !supabaseUrl || !supabaseAnonKey

const MOCK_STORAGE_KEY = 'kiosko-pos-supabase-mock-v1'

function getMockDB() {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    // Ignore
  }

  const initial = {
    products: SEED_PRODUCTS,
    sales: generateMockSales(),
    customers: SEED_CUSTOMERS,
    suppliers: SEED_SUPPLIERS,
    shifts: [],
  }
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial))
  return initial
}

function saveMockDB(db) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db))
  } catch (e) {
    // Ignore
  }
}

class MockQueryBuilder {
  constructor(table) {
    this.table = table
    this.action = 'select'
    this.payload = null
    this.filters = []
    this.sort = null
  }

  select(columns = '*') {
    this.action = 'select'
    return this
  }

  insert(values) {
    this.action = 'insert'
    this.payload = values
    return this
  }

  update(values) {
    this.action = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column, value) {
    this.filters.push({ column, value })
    return this
  }

  order(column, { ascending = true } = {}) {
    this.sort = { column, ascending }
    return this
  }

  async then(onfulfilled, onrejected) {
    try {
      const db = getMockDB()
      let rows = db[this.table] || []

      if (this.action === 'select') {
        // Apply filters
        for (const filter of this.filters) {
          rows = rows.filter((row) => row[filter.column] === filter.value)
        }
        // Apply sorting
        if (this.sort) {
          rows.sort((a, b) => {
            const valA = a[this.sort.column]
            const valB = b[this.sort.column]
            if (valA < valB) return this.sort.ascending ? -1 : 1
            if (valA > valB) return this.sort.ascending ? 1 : -1
            return 0
          })
        }
        return onfulfilled({ data: JSON.parse(JSON.stringify(rows)), error: null })
      }

      if (this.action === 'insert') {
        const newRows = Array.isArray(this.payload) ? this.payload : [this.payload]
        const created = newRows.map((row) => ({
          ...row,
          id: row.id || Math.random().toString(36).substr(2, 9),
        }))
        db[this.table] = [...rows, ...created]
        saveMockDB(db)
        return onfulfilled({ data: JSON.parse(JSON.stringify(created)), error: null })
      }

      if (this.action === 'update') {
        const updatedRows = []
        db[this.table] = rows.map((row) => {
          const matches = this.filters.every((filter) => row[filter.column] === filter.value)
          if (matches) {
            const updated = { ...row, ...this.payload }
            updatedRows.push(updated)
            return updated
          }
          return row
        })
        saveMockDB(db)
        return onfulfilled({ data: JSON.parse(JSON.stringify(updatedRows)), error: null })
      }

      if (this.action === 'delete') {
        if (this.filters.length === 0 || this.filters.some((f) => f.column === '1' && f.value === '1')) {
          db[this.table] = []
        } else {
          db[this.table] = rows.filter((row) => {
            const matches = this.filters.every((filter) => row[filter.column] === filter.value)
            return !matches
          })
        }
        saveMockDB(db)
        return onfulfilled({ data: [], error: null })
      }

      return onfulfilled({ data: [], error: null })
    } catch (err) {
      if (onrejected) return onrejected(err)
      return onfulfilled({ data: null, error: err })
    }
  }
}

// Emulated Supabase JS client
const mockSupabase = {
  from(table) {
    return new MockQueryBuilder(table)
  },
}

export const supabase = isMock
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey)

export const isMockMode = isMock
