/* eslint-disable no-undef */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock react-query
const mockInvalidateQueries = vi.fn()
const mockSetQueryData = vi.fn()

vi.mock('@tanstack/react-query', () => {
  return {
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueryData: mockSetQueryData,
    }),
    useQuery: vi.fn(() => ({ data: [], isLoading: false })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
    QueryClient: vi.fn(),
    QueryClientProvider: ({ children }) => children,
  }
})

// Mock react
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useState: (val) => [val, vi.fn()],
    useEffect: vi.fn(),
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (val) => ({ current: val }),
  }
})

// Mock zustand to avoid React hook issues and localStorage persistence issues during test runs
vi.mock('zustand', () => {
  const createStore = (creator) => {
    let state = {}
    const listeners = new Set()
    const get = () => state
    const set = (updater) => {
      const nextState = typeof updater === 'function' ? updater(state) : updater
      state = { ...state, ...nextState }
      listeners.forEach((l) => l(state))
    }
    const api = {
      getState: get,
      setState: (s) => set(s),
      subscribe: (l) => {
        listeners.add(l)
        return () => listeners.delete(l)
      },
    }
    state = creator(set, get, api)
    const storeHook = (selector) => {
      return selector ? selector(state) : state
    }
    Object.assign(storeHook, api)
    return storeHook
  }

  const create = (creator) => {
    if (creator) return createStore(creator)
    return (c) => createStore(c)
  }

  return { create }
})

// Mock zustand/middleware to bypass persistence during tests
vi.mock('zustand/middleware', () => {
  return {
    persist: (creator) => creator,
  }
})

// Mock supabase to prevent initialization error
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
    isMockMode: false,
  }
})

// Now we can safely import store and selectors
import {
  useUIStore,
  useStore,
  customerBalance,
  supplierBalance,
  shiftTheoretical,
  shiftTotals,
} from './store'

describe('Kiosko POS Store selectors', () => {
  it('calculates customerBalance correctly', () => {
    const customer = {
      entries: [
        { type: 'compra', amount: 500 },
        { type: 'pago', amount: 200 },
        { type: 'compra', amount: 100 },
      ],
    }
    // balance = 500 - 200 + 100 = 400
    expect(customerBalance(customer)).toBe(400)
    expect(customerBalance(null)).toBe(0)
  })

  it('calculates supplierBalance correctly', () => {
    const supplier = {
      entries: [
        { type: 'factura', amount: 1000 },
        { type: 'pago', amount: 400 },
      ],
    }
    // balance = 1000 - 400 = 600
    expect(supplierBalance(supplier)).toBe(600)
    expect(supplierBalance(null)).toBe(0)
  })

  it('calculates shiftTheoretical correctly', () => {
    const shift = {
      openingAmount: 1500,
      movements: [
        { type: 'venta', amount: 300 },
        { type: 'egreso', amount: -200 },
      ],
    }
    // theoretical = 1500 + 300 - 200 = 1600
    expect(shiftTheoretical(shift)).toBe(1600)
    expect(shiftTheoretical(null)).toBe(0)
  })

  it('calculates shiftTotals correctly', () => {
    const shift = {
      openingAmount: 1500,
      movements: [
        { type: 'venta', amount: 500 },
        { type: 'venta_qr', amount: 300 },
        { type: 'ingreso', amount: 100 },
        { type: 'egreso', amount: -50 },
      ],
    }
    const totals = shiftTotals(shift, [])
    expect(totals.cashSales).toBe(500)
    expect(totals.qrSales).toBe(300)
    expect(totals.manualIn).toBe(100)
    expect(totals.manualOut).toBe(-50)
  })
})

describe('Zustand UI Store business logic', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useUIStore.setState({
      theme: 'light',
      currentUser: null,
      offlineSalesQueue: [],
      productsCache: [],
      currentShiftCache: null,
      offlineActionsQueue: [],
      failedSalesQueue: [],
      failedActionsQueue: [],
      cart: [],
    })
  })

  it('toggles theme correctly', () => {
    const store = useUIStore.getState()
    expect(store.theme).toBe('light')
    store.toggleTheme()
    expect(useUIStore.getState().theme).toBe('dark')
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('light')
  })

  it('manages cart correctly', () => {
    const { setCart } = useUIStore.getState()

    // Add item to cart
    setCart([{ id: 1, name: 'Alfajor', qty: 2, price: 150 }])
    expect(useUIStore.getState().cart).toEqual([{ id: 1, name: 'Alfajor', qty: 2, price: 150 }])

    // Update cart
    setCart((prev) => prev.map((item) => ({ ...item, qty: 3 })))
    expect(useUIStore.getState().cart[0].qty).toBe(3)

    // Clear cart
    setCart([])
    expect(useUIStore.getState().cart).toEqual([])
  })

  it('manages offline sales queue operations', () => {
    const { enqueueOfflineSale, dequeueOfflineSale } = useUIStore.getState()
    const sale = { id: 'sale-1', total: 450, items: [] }

    enqueueOfflineSale(sale)
    expect(useUIStore.getState().offlineSalesQueue).toContainEqual(sale)

    dequeueOfflineSale('sale-1')
    expect(useUIStore.getState().offlineSalesQueue).not.toContainEqual(sale)
  })

  it('manages failed queues', () => {
    const { enqueueFailedSale, dequeueFailedSale, clearFailedSalesQueue } = useUIStore.getState()
    const failedSale = { id: 'fail-1', error: 'Database error' }

    enqueueFailedSale(failedSale)
    expect(useUIStore.getState().failedSalesQueue).toContainEqual(failedSale)

    dequeueFailedSale('fail-1')
    expect(useUIStore.getState().failedSalesQueue).not.toContainEqual(failedSale)

    enqueueFailedSale(failedSale)
    clearFailedSalesQueue()
    expect(useUIStore.getState().failedSalesQueue).toEqual([])
  })
})

describe('useStore hook discard actions & query invalidation', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear()
    mockSetQueryData.mockClear()
    useUIStore.setState({
      failedSalesQueue: [{ id: 'fail-sale-id', error: 'Sync failed' }],
      failedActionsQueue: [{ id: 'fail-action-id', error: 'Sync failed' }],
    })
  })

  it('calls qc.invalidateQueries when discardFailedSale is executed', () => {
    const store = useStore()
    expect(useUIStore.getState().failedSalesQueue.length).toBe(1)

    store.discardFailedSale('fail-sale-id')

    // Check that it dequeued the failed sale
    expect(useUIStore.getState().failedSalesQueue.length).toBe(0)
    // Check that it invalidated the query cache
    expect(mockInvalidateQueries).toHaveBeenCalled()
  })

  it('calls qc.invalidateQueries when discardFailedAction is executed', () => {
    const store = useStore()
    expect(useUIStore.getState().failedActionsQueue.length).toBe(1)

    store.discardFailedAction('fail-action-id')

    // Check that it dequeued the failed action
    expect(useUIStore.getState().failedActionsQueue.length).toBe(0)
    // Check that it invalidated the query cache
    expect(mockInvalidateQueries).toHaveBeenCalled()
  })
})
