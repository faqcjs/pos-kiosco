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
const mockGetQueryData = vi.fn()

let isOnlineValue = false
if (!global.navigator) {
  global.navigator = {}
}
Object.defineProperty(global.navigator, 'onLine', {
  get: () => isOnlineValue,
  configurable: true
})

vi.mock('@tanstack/react-query', () => {
  return {
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueryData: mockSetQueryData,
      getQueryData: mockGetQueryData,
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
    useState: (val) => {
      const initialVal = typeof val === 'function' ? val() : val
      return [initialVal, vi.fn()]
    },
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

describe('completeSale offline FEFO batch deductions', () => {
  let localQueryCache = {}

  beforeEach(() => {
    mockInvalidateQueries.mockClear()
    mockSetQueryData.mockClear()
    mockGetQueryData.mockClear()

    isOnlineValue = false
    localQueryCache = {}

    mockSetQueryData.mockImplementation((key, updater) => {
      const k = JSON.stringify(key)
      const oldVal = localQueryCache[k]
      const newVal = typeof updater === 'function' ? updater(oldVal) : updater
      localQueryCache[k] = newVal
    })

    mockGetQueryData.mockImplementation((key) => {
      const k = JSON.stringify(key)
      return localQueryCache[k]
    })

    // Setup initial cache data
    localQueryCache[JSON.stringify(['products'])] = [
      { id: 'p1', name: 'Product 1', price: 100, cost: 50, stock: 5, controlLotes: true },
      { id: 'p2', name: 'Product 2', price: 200, cost: 100, stock: 10, controlLotes: false },
    ]

    localQueryCache[JSON.stringify(['product_batches'])] = [
      { id: 'b1', productId: 'p1', batchCode: 'L1', expirationDate: '2026-08-01T00:00:00.000Z', stock: 2, created_at: '2026-07-01T00:00:00.000Z' },
      { id: 'b2', productId: 'p1', batchCode: 'L2', expirationDate: '2026-09-01T00:00:00.000Z', stock: 3, created_at: '2026-07-02T00:00:00.000Z' }
    ]

    useUIStore.setState({
      productsCache: localQueryCache[JSON.stringify(['products'])],
      batchesCache: localQueryCache[JSON.stringify(['product_batches'])],
      currentShiftCache: { id: 'shift-1' },
      offlineSalesQueue: [],
      offlineActionsQueue: [],
    })
  })

  it('fails to complete sale if total batch stock is insufficient', () => {
    const store = useStore()
    const saleArgs = {
      items: [{ productId: 'p1', name: 'Product 1', price: 100, qty: 6 }],
      method: 'efectivo',
    }

    expect(() => store.completeSale(saleArgs)).toThrowError(
      'Stock insuficiente en los lotes para el producto: Product 1'
    )
  })

  it('deducts from earliest-expiring active batches cascadingly (FEFO)', () => {
    const store = useStore()
    const saleArgs = {
      items: [{ productId: 'p1', name: 'Product 1', price: 100, qty: 3 }],
      method: 'efectivo',
    }

    store.completeSale(saleArgs)

    const updatedBatches = localQueryCache[JSON.stringify(['product_batches'])]
    const b1 = updatedBatches.find((b) => b.id === 'b1')
    const b2 = updatedBatches.find((b) => b.id === 'b2')

    // FEFO: 2 units from b1 (expires Aug), 1 unit from b2 (expires Sep)
    expect(b1.stock).toBe(0)
    expect(b2.stock).toBe(2)

    // Sync product stock
    const updatedProducts = localQueryCache[JSON.stringify(['products'])]
    const p1 = updatedProducts.find((p) => p.id === 'p1')
    expect(p1.stock).toBe(2)
  })

  it('triangulates: handles equal expiration dates sorting by created_at', () => {
    // Re-setup cache with same expiration date but different created_at
    localQueryCache[JSON.stringify(['product_batches'])] = [
      { id: 'b3', productId: 'p1', batchCode: 'L3', expirationDate: '2026-08-01T00:00:00.000Z', stock: 2, created_at: '2026-07-05T00:00:00.000Z' },
      { id: 'b4', productId: 'p1', batchCode: 'L4', expirationDate: '2026-08-01T00:00:00.000Z', stock: 2, created_at: '2026-07-03T00:00:00.000Z' }
    ]
    useUIStore.setState({
      batchesCache: localQueryCache[JSON.stringify(['product_batches'])]
    })

    const store = useStore()
    const saleArgs = {
      items: [{ productId: 'p1', name: 'Product 1', price: 100, qty: 3 }],
      method: 'efectivo',
    }

    store.completeSale(saleArgs)

    const updatedBatches = localQueryCache[JSON.stringify(['product_batches'])]
    const b3 = updatedBatches.find((b) => b.id === 'b3')
    const b4 = updatedBatches.find((b) => b.id === 'b4')

    // Earliest created_at is b4 (July 3), so it should deduct 2 from b4 and 1 from b3 (July 5)
    expect(b4.stock).toBe(0)
    expect(b3.stock).toBe(1)
  })
})
