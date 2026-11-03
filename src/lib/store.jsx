import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'
import { uid } from './format'
import { SEED_PRODUCTS, SEED_CUSTOMERS, SEED_SUPPLIERS, generateMockSales } from './seed'
import { calculateComboMetrics } from './promotions'
import { freezeItemCosts, sumItemsCost } from './sale-cost'
import { applyPurchaseItems } from './purchase-cost'
import { RealtimeSync } from './realtime-sync'
import { MANUAL_IN_MOVEMENT_TYPES, MANUAL_OUT_MOVEMENT_TYPES, signMovementAmount } from './cash-movements'
import { SHIFT_ORIGIN, buildExpenseMovement, buildExpenseRpcArgs, validateExpense } from './expenses'
import {
  DIRECT_PURCHASE_SUPPLIER_ID,
  DIRECT_PURCHASE_SUPPLIER_NAME,
  DIRECT_PURCHASES_STORAGE_KEY,
  SUPABASE_PAGE_SIZE,
  DIRECT_PURCHASE_SUPPLIER_CATEGORY,
  ROLES,
  UI_STATE_STORAGE_KEY,
  AUTH_EMAIL_DOMAIN,
  PGRST_TABLE_NOT_FOUND,
  DEFAULT_CATEGORY,
  DEFAULT_SELLER_USERNAME,
  OFFLINE_SALE_ID_PREFIX,
  OFFLINE_SYNC_COMPLETED_EVENT,
  OFFLINE_SALE_REGISTERED_EVENT,
} from './constants'

// Max distance between a supplier entry and its cash movement to consider them the same event
const MOVEMENT_MATCH_TOLERANCE_MS = 5000
// Number of closed shifts loaded in the history
const SHIFT_HISTORY_LIMIT = 100
// Characters of the sale id shown in shift movements ("Venta #abc123")
const SALE_ID_SUFFIX_LENGTH = 6
// Id that never exists: used with .neq() to delete every row on data reset
const RESET_SENTINEL_ID = '_none_'

const QUERY_STALE_TIME_MS = 1000 * 60 * 30 // 30 minutes
const QUERY_GC_TIME_MS = 1000 * 60 * 60 * 24 // 24 hours

// Returns a copy of obj without the given keys
const omitKeys = (obj, keys) => Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)))

const isDirectPurchaseSupplier = (s) =>
  s.id === DIRECT_PURCHASE_SUPPLIER_ID || s.name === DIRECT_PURCHASE_SUPPLIER_NAME

const persistDirectPurchases = (entries) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DIRECT_PURCHASES_STORAGE_KEY, JSON.stringify(entries))
  }
}

// Fetches every page of a Supabase query; buildQuery(from, to) returns the ranged query
async function fetchAllPages(buildQuery) {
  let rows = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await buildQuery(page * SUPABASE_PAGE_SIZE, (page + 1) * SUPABASE_PAGE_SIZE - 1)
    if (error) throw error

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      rows = [...rows, ...data]
      if (data.length < SUPABASE_PAGE_SIZE) {
        hasMore = false
      } else {
        page += 1
      }
    }
  }

  return rows
}

function sanitizeProduct(p) {
  return {
    id: p.id,
    barcode: p.barcode || '',
    name: p.name || '',
    category: p.category || DEFAULT_CATEGORY,
    cost: Number(p.cost) || 0,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    minStock: Number(p.minStock) || 0,
    isMostSold: !!p.isMostSold,
    unidad: Number(p.unidad) || 1,
    controlLotes: !!p.controlLotes,
    isCombo: !!p.isCombo
  }
}

// --- selectors ---
export function customerBalance(c) {
  if (!c || !c.entries) return 0
  return c.entries.reduce((sum, e) => sum + (e.type === 'compra' ? e.amount : -e.amount), 0)
}

export function supplierBalance(s) {
  if (!s || !s.entries) return 0
  return s.entries.reduce((sum, e) => sum + (e.type === 'factura' ? e.amount : -e.amount), 0)
}

export function shiftTheoretical(shift) {
  if (!shift) return 0
  return shift.openingAmount + (shift.movements || []).reduce((sum, m) => sum + m.amount, 0)
}

export function shiftTotals(shift, sales) {
  let cashSales = 0
  let manualIn = 0
  let manualOut = 0
  let qrSales = 0
  
  if (!shift) return { cashSales, manualIn, manualOut, qrSales: 0 }
  
  const movements = shift.movements || []
  let hasQrMovements = false
  for (const m of movements) {
    if (m.type === 'venta') cashSales += m.amount
    else if (m.type === 'venta_qr') {
      qrSales += m.amount
      hasQrMovements = true
    }
    else if (MANUAL_IN_MOVEMENT_TYPES.includes(m.type)) manualIn += m.amount
    else if (MANUAL_OUT_MOVEMENT_TYPES.includes(m.type)) manualOut += m.amount
  }

  if (!hasQrMovements) {
    const start = new Date(shift.openedAt).getTime()
    const end = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now()
    qrSales = (sales || [])
      .filter((s) => {
        const t = new Date(s.date).getTime()
        return s.method === 'qr' && t >= start && t <= end
      })
      .reduce((sum, s) => sum + s.total, 0)
  }

  return { cashSales, manualIn, manualOut, qrSales }
}

// --- Zustand UI Store ---
export const useUIStore = create()(
  persist(
    (set) => ({
      theme: 'light',
      currentUser: null,
      offlineSalesQueue: [],
      productsCache: [],
      batchesCache: [],
      currentShiftCache: null,
      offlineActionsQueue: [],
      failedSalesQueue: [],
      failedActionsQueue: [],
      cart: [],
      
      toggleTheme: () => set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
        return { theme: nextTheme }
      }),
      setCurrentUser: (user) => set({ currentUser: user }),
      enqueueOfflineSale: (sale) => set((state) => ({
        offlineSalesQueue: [...state.offlineSalesQueue, sale]
      })),
      dequeueOfflineSale: (saleId) => set((state) => ({
        offlineSalesQueue: state.offlineSalesQueue.filter(s => s.id !== saleId)
      })),
      setProductsCache: (products) => set({ productsCache: products }),
      setBatchesCache: (batches) => set({ batchesCache: batches }),
      setCurrentShiftCache: (shift) => set({ currentShiftCache: shift }),
      enqueueOfflineAction: (action) => set((state) => ({
        offlineActionsQueue: [...state.offlineActionsQueue, action]
      })),
      dequeueOfflineAction: (actionId) => set((state) => ({
        offlineActionsQueue: state.offlineActionsQueue.filter(a => a.id !== actionId)
      })),
      enqueueFailedSale: (sale) => set((state) => ({
        failedSalesQueue: [...state.failedSalesQueue, sale]
      })),
      dequeueFailedSale: (saleId) => set((state) => ({
        failedSalesQueue: state.failedSalesQueue.filter(s => s.id !== saleId)
      })),
      clearFailedSalesQueue: () => set({ failedSalesQueue: [] }),
      enqueueFailedAction: (action) => set((state) => ({
        failedActionsQueue: [...state.failedActionsQueue, action]
      })),
      dequeueFailedAction: (actionId) => set((state) => ({
        failedActionsQueue: state.failedActionsQueue.filter(a => a.id !== actionId)
      })),
      clearFailedActionsQueue: () => set({ failedActionsQueue: [] }),
      setCart: (updater) => set((state) => {
        const nextCart = typeof updater === 'function' ? updater(state.cart) : updater
        return { cart: nextCart }
      }),
    }),
    {
      name: UI_STATE_STORAGE_KEY,
    }
  )
)

// --- Query Client ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: QUERY_STALE_TIME_MS, // Realtime handles live updates
      gcTime: QUERY_GC_TIME_MS,
    },
  },
})

export function StoreProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

// --- Hook for date-range filtered sales queries (e.g. Admin reports) ---
export function useSalesQuery({ dateFrom, dateTo, enabled = true } = {}) {
  return useQuery({
    queryKey: ['sales', dateFrom || 'all-from', dateTo || 'all-to'],
    queryFn: () =>
      fetchAllPages((from, to) => {
        let query = supabase
          .from('sales')
          .select('*')
          .order('date', { ascending: false })
          .range(from, to)

        if (dateFrom) {
          const startIso = new Date(`${dateFrom}T00:00:00`).toISOString()
          query = query.gte('date', startIso)
        }
        if (dateTo) {
          const endIso = new Date(`${dateTo}T23:59:59.999`).toISOString()
          query = query.lte('date', endIso)
        }

        return query
      }),
    enabled,
  })
}

// --- useStore Unified Hook ---
export function useStore() {
  const qc = useQueryClient()
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const [isSyncing, setIsSyncing] = useState(false)
  const syncingSalesRef = useRef(false)
  const syncingActionsRef = useRef(false)
  
  // Zustand Local UI state
  const uiTheme = useUIStore((s) => s.theme)
  const currentUser = useUIStore((s) => s.currentUser)
  const productsCache = useUIStore((s) => s.productsCache)
  const batchesCache = useUIStore((s) => s.batchesCache)
  const currentShiftCache = useUIStore((s) => s.currentShiftCache)
  const failedSalesQueue = useUIStore((s) => s.failedSalesQueue)
  const failedActionsQueue = useUIStore((s) => s.failedActionsQueue)
  const offlineSalesQueue = useUIStore((s) => s.offlineSalesQueue)
  const offlineActionsQueue = useUIStore((s) => s.offlineActionsQueue)
  const cart = useUIStore((s) => s.cart)
  
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const setCurrentUser = useUIStore((s) => s.setCurrentUser)
  const enqueueOfflineSale = useUIStore((s) => s.enqueueOfflineSale)
  const dequeueOfflineSale = useUIStore((s) => s.dequeueOfflineSale)
  const setProductsCache = useUIStore((s) => s.setProductsCache)
  const setBatchesCache = useUIStore((s) => s.setBatchesCache)
  const setCurrentShiftCache = useUIStore((s) => s.setCurrentShiftCache)
  const enqueueOfflineAction = useUIStore((s) => s.enqueueOfflineAction)
  const dequeueOfflineAction = useUIStore((s) => s.dequeueOfflineAction)
  const dequeueFailedSale = useUIStore((s) => s.dequeueFailedSale)
  const clearFailedSalesQueue = useUIStore((s) => s.clearFailedSalesQueue)
  const dequeueFailedAction = useUIStore((s) => s.dequeueFailedAction)
  const clearFailedActionsQueue = useUIStore((s) => s.clearFailedActionsQueue)
  const setCart = useUIStore((s) => s.setCart)

  // Apply theme class side effect
  useEffect(() => {
    const root = document.documentElement
    if (uiTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [uiTheme])

  // Sync Supabase auth state with Zustand's currentUser
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      } else if (session?.user) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (!error && data) {
            setCurrentUser(data)
          }
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [setCurrentUser])

  // React Query server state queries
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      fetchAllPages((from, to) => supabase.from('products').select('*').order('name').range(from, to)),
  })

  const isAdmin = currentUser?.role === ROLES.ADMIN

  const salesQueryStartDate = useMemo(() => {
    const now = new Date()
    if (isAdmin) {
      // First day of current month at 00:00:00 local time
      return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString()
    }
    // Start of today at 00:00:00 local time
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
  }, [isAdmin])

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales', isAdmin ? 'admin-month' : 'cajero-today'],
    queryFn: () =>
      fetchAllPages((from, to) =>
        supabase
          .from('sales')
          .select('*')
          .gte('date', salesQueryStartDate)
          .order('date', { ascending: false })
          .range(from, to),
      ),
  })

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name')
      if (error) throw error
      return data || []
    },
  })

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name')
      if (error) throw error
      const list = data ?? []

      const storedDirect = typeof window !== 'undefined' ? localStorage.getItem(DIRECT_PURCHASES_STORAGE_KEY) : null
      if (storedDirect) {
        try {
          const directEntries = JSON.parse(storedDirect)
          const existingDirectIdx = list.findIndex(isDirectPurchaseSupplier)
          if (existingDirectIdx !== -1) {
            return list.map((s, idx) => (idx === existingDirectIdx ? { ...s, entries: directEntries } : s))
          }
          return [
            ...list,
            {
              id: DIRECT_PURCHASE_SUPPLIER_ID,
              name: DIRECT_PURCHASE_SUPPLIER_NAME,
              category: DIRECT_PURCHASE_SUPPLIER_CATEGORY,
              entries: directEntries,
            },
          ]
        } catch (e) {
          console.error(e)
        }
      }
      return list
    },
  })

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('openedAt', { ascending: false })
        .limit(SHIFT_HISTORY_LIMIT)

      if (error) throw error
      return data || []
    },
  })

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').order('name')
      if (error) throw error
      return data || []
    },
    enabled: currentUser?.role === ROLES.ADMIN,
  })

  const { data: productBatches = [], isLoading: loadingProductBatches } = useQuery({
    queryKey: ['product_batches'],
    queryFn: () =>
      fetchAllPages((from, to) =>
        supabase.from('product_batches').select('*').order('expirationDate').range(from, to),
      ),
  })

  const { data: comboItems = [] } = useQuery({
    queryKey: ['combo_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('combo_items').select('*')
      if (error) {
        if (error.code !== PGRST_TABLE_NOT_FOUND) console.warn('Error fetching combo_items:', error)
        return []
      }
      return data || []
    },
  })

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('promotions').select('*')
      if (error) {
        if (error.code !== PGRST_TABLE_NOT_FOUND) console.warn('Error fetching promotions:', error)
        return []
      }
      return data || []
    },
  })

  // Operating expenses: only administrators can read them (RLS)
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      try {
        return await fetchAllPages((from, to) =>
          supabase.from('expenses').select('*').order('paidAt', { ascending: false }).range(from, to),
        )
      } catch (error) {
        // The table exists only after supabase_patch_gastos.sql is applied
        if (error?.code !== PGRST_TABLE_NOT_FOUND) console.warn('Error fetching expenses:', error)
        return []
      }
    },
    enabled: isAdmin,
  })

  // Sync product batches query results with batchesCache
  useEffect(() => {
    if (productBatches && productBatches.length > 0) {
      setBatchesCache(productBatches)
    }
  }, [productBatches, setBatchesCache])

  const displayedProductBatches = useMemo(() => {
    if (!productBatches || productBatches.length === 0) {
      return batchesCache || []
    }
    return productBatches
  }, [productBatches, batchesCache])

  // Sync products query results with productsCache
  useEffect(() => {
    if (products && products.length > 0) {
      setProductsCache(products)
    }
  }, [products, setProductsCache])

  const displayedProducts = useMemo(() => {
    const raw = !products || products.length === 0 ? productsCache || [] : products
    if (!comboItems || comboItems.length === 0) return raw

    return raw.map((p) => {
      if (!p.isCombo) return p
      const metrics = calculateComboMetrics(p.id, comboItems, raw)
      return {
        ...p,
        stock: metrics.virtualStock,
        // Unknown cost when any component has no cost loaded
        cost: metrics.hasMissingCost ? 0 : metrics.unitCost > 0 ? metrics.unitCost : p.cost,
      }
    })
  }, [products, productsCache, comboItems])

  // Background offline sales synchronization function
  const syncOfflineSales = useCallback(async () => {
    const queue = useUIStore.getState().offlineSalesQueue
    if (queue.length === 0 || syncingSalesRef.current) return
    syncingSalesRef.current = true

    console.log(`Syncing ${queue.length} offline sales...`)
    const queueToProcess = [...queue]

    for (const sale of queueToProcess) {
      try {
        const { error } = await supabase.rpc('complete_sale_rpc', {
          p_sale_id: sale.id,
          p_items: sale.items,
          p_method: sale.method,
          p_customer_id: sale.customerId || null,
          p_cash_received: sale.cashReceived || 0,
          p_change: sale.change || 0,
          p_cost: sale.cost || 0,
          p_sold_by: sale.soldBy,
          p_date: sale.date,
          p_shift_id: sale.shiftId,
          p_discount: sale.discount || 0,
        })
        if (error) throw error

        // Remove successfully synced sale from queue
        dequeueOfflineSale(sale.id)
        console.log(`Synced offline sale: ${sale.id}`)
      } catch (err) {
        console.error(`Failed to sync sale ${sale.id}:`, err)
        dequeueOfflineSale(sale.id)
        useUIStore.getState().enqueueFailedSale({
          ...sale,
          failedAt: new Date().toISOString(),
          error: err.message || String(err)
        })
      }
    }
    qc.invalidateQueries({ queryKey: ['sales'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['product_batches'] })
    qc.invalidateQueries({ queryKey: ['shifts'] })
    qc.invalidateQueries({ queryKey: ['customers'] })
    syncingSalesRef.current = false

    // Check if everything is synced to notify UI
    const remainingSales = useUIStore.getState().offlineSalesQueue.length
    const remainingActions = useUIStore.getState().offlineActionsQueue.length
    if (remainingSales === 0 && remainingActions === 0) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT))
      }
    }
  }, [dequeueOfflineSale, qc])

  // Background offline actions (customers/suppliers) synchronization function
  const syncOfflineActions = useCallback(async () => {
    const queue = useUIStore.getState().offlineActionsQueue
    if (queue.length === 0 || syncingActionsRef.current) return
    syncingActionsRef.current = true

    console.log(`Syncing ${queue.length} offline actions...`)
    const queueToProcess = [...queue]

    for (const action of queueToProcess) {
      try {
        switch (action.type) {
          case 'ADD_CUSTOMER': {
            const { error } = await supabase.from('customers').insert([action.payload])
            if (error) throw error
            break
          }
          case 'REGISTER_CUSTOMER_PAYMENT': {
            const { customerId, amount, date, shiftId } = action.payload
            const { error } = await supabase.rpc('register_customer_payment_rpc', {
              p_customer_id: customerId,
              p_amount: amount,
              p_date: date,
              p_shift_id: shiftId,
            })
            if (error) throw error
            break
          }
          case 'ADD_SUPPLIER': {
            const { error } = await supabase.from('suppliers').insert([action.payload])
            if (error) throw error
            break
          }
          case 'UPDATE_SUPPLIER': {
            const { error } = await supabase.from('suppliers').update(action.payload).eq('id', action.payload.id)
            if (error) throw error
            break
          }
          case 'ADD_PRODUCT': {
            const { error } = await supabase.from('products').insert([action.payload])
            if (error) throw error
            break
          }
          case 'UPDATE_PRODUCT': {
            const { error } = await supabase.from('products').update(action.payload).eq('id', action.payload.id)
            if (error) throw error
            break
          }
          case 'UPDATE_BATCH': {
            const { error } = await supabase.from('product_batches').upsert(action.payload)
            if (error) throw error
            break
          }
          case 'RECEIVE_GOODS': {
            const { supplierId, amount, detail, paidCash, date, shiftId, items } = action.payload
            const { error } = await supabase.rpc('receive_goods_rpc', {
              p_supplier_id: supplierId,
              p_amount: amount,
              p_detail: detail,
              p_paid_cash: paidCash,
              p_date: date,
              p_shift_id: shiftId,
              p_items: items || [],
            })
            if (error) throw error
            break
          }
          case 'REGISTER_SUPPLIER_PAYMENT': {
            const { supplierId, amount, fromCash, date, shiftId } = action.payload
            const { error } = await supabase.rpc('register_supplier_payment_rpc', {
              p_supplier_id: supplierId,
              p_amount: amount,
              p_from_cash: fromCash,
              p_date: date,
              p_shift_id: shiftId,
            })
            if (error) throw error
            break
          }
          case 'REGISTER_EXPENSE': {
            // register_expense_rpc is idempotent on the expense id
            const { error } = await supabase.rpc('register_expense_rpc', buildExpenseRpcArgs(action.payload))
            if (error) throw error
            break
          }
          case 'ADD_MOVEMENT': {
            const { type, amount, reason, date, shiftId } = action.payload
            const { data: shiftData, error: fetchError } = await supabase.from('shifts').select('*').eq('id', shiftId).single()
            if (fetchError) throw fetchError
            const signed = signMovementAmount(type, amount)
            const mov = { id: action.id, date, type, amount: signed, reason }
            const updated = {
              ...shiftData,
              movements: [...(shiftData.movements || []), mov]
            }
            const { error: updateError } = await supabase.from('shifts').update(updated).eq('id', shiftId)
            if (updateError) throw updateError
            break
          }
          case 'OPEN_SHIFT': {
            // Use upsert so that if the shift was already inserted online
            // (e.g. mutation succeeded before connection dropped), this is a no-op
            const { error } = await supabase
              .from('shifts')
              .upsert([action.payload], { onConflict: 'id', ignoreDuplicates: true })
            if (error) throw error
            break
          }
          case 'CLOSE_SHIFT': {
            const { shiftId, closedAt, closingCounted, closingTheoretical, difference, status, closedBy } = action.payload
            const { data: shiftData, error: fetchError } = await supabase.from('shifts').select('*').eq('id', shiftId).single()
            if (fetchError) throw fetchError
            // If the shift is already closed, skip to avoid overwriting a manual close
            if (shiftData?.status === 'closed') break
            const updated = {
              ...shiftData,
              closedAt,
              closingCounted,
              closingTheoretical,
              difference,
              status,
              closedBy,
            }
            const { error: updateError } = await supabase.from('shifts').update(updated).eq('id', shiftId)
            if (updateError) throw updateError
            break
          }
          case 'UPDATE_SHIFT_MOVEMENTS': {
            const { shiftId, movements } = action.payload
            const { error } = await supabase.from('shifts').update({ movements }).eq('id', shiftId)
            if (error) throw error
            break
          }
          default:
            console.warn(`Unknown action type: ${action.type}`)
        }

        // Dequeue successfully synced action
        dequeueOfflineAction(action.id)
        console.log(`Synced offline action: ${action.type} (${action.id})`)
      } catch (err) {
        console.error(`Failed to sync action ${action.id}:`, err)
        dequeueOfflineAction(action.id)
        useUIStore.getState().enqueueFailedAction({
          ...action,
          failedAt: new Date().toISOString(),
          error: err.message || String(err)
        })
      }
    }
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['suppliers'] })
    qc.invalidateQueries({ queryKey: ['shifts'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['product_batches'] })
    syncingActionsRef.current = false

    // Check if everything is synced to notify UI
    const remainingSales = useUIStore.getState().offlineSalesQueue.length
    const remainingActions = useUIStore.getState().offlineActionsQueue.length
    if (remainingSales === 0 && remainingActions === 0) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED_EVENT))
      }
    }
  }, [dequeueOfflineAction, qc])

  const syncAllOfflineData = useCallback(async () => {
    await syncOfflineActions()
    await syncOfflineSales()
  }, [syncOfflineActions, syncOfflineSales])

  // Sincronización manual de datos sin efectos automáticos al recuperar conexión

  // Sync shifts query results with currentShiftCache
  useEffect(() => {
    if (shifts && shifts.length > 0) {
      const openShift = shifts.find((s) => s.status === 'open') || null
      setCurrentShiftCache(openShift)
    } else if (shifts && shifts.length === 0 && isOnline) {
      setCurrentShiftCache(null)
    }
  }, [shifts, setCurrentShiftCache, isOnline])

  // Compute shifts states
  const currentShift = useMemo(() => {
    const queryOpenShift = shifts.find((s) => s.status === 'open') || null
    if (!isOnline || !queryOpenShift) {
      return currentShiftCache
    }
    return queryOpenShift
  }, [shifts, currentShiftCache, isOnline])

  const shiftHistory = useMemo(() => {
    return shifts.filter((s) => s.status === 'closed')
  }, [shifts])

  const hydrated = !isOnline || (!loadingProducts && !loadingSales && !loadingCustomers && !loadingSuppliers && !loadingShifts && !loadingProductBatches && (currentUser?.role === ROLES.ADMIN ? !loadingUsers : true))

  // Mutations
  const addProductMutation = useMutation({
    mutationFn: async (p) => {
      const sanitized = sanitizeProduct(p)
      const { data, error } = await supabase.from('products').insert([sanitized]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (newProd) => {
      if (newProd) {
        qc.setQueryData(['products'], (old = []) => {
          if (old.some((p) => p.id === newProd.id)) return old
          return [...old, newProd].sort((a, b) => a.name.localeCompare(b.name))
        })
      }
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: async (p) => {
      const sanitized = omitKeys(sanitizeProduct(p), ['id'])
      const { data, error } = await supabase.from('products').update(sanitized).eq('id', p.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedProd) => {
      if (updatedProd) {
        qc.setQueryData(['products'], (old = []) =>
          old.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
        )
      }
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['products'], (old = []) => old.filter((p) => p.id !== deletedId))
    },
  })

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, delta }) => {
      const prod = products.find((x) => x.id === id)
      if (!prod) throw new Error('Product not found')
      const newStock = Math.max(0, prod.stock + delta)
      const { data, error } = await supabase.from('products').update({ stock: newStock }).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedProd) => {
      if (updatedProd) {
        qc.setQueryData(['products'], (old = []) =>
          old.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
        )
      }
    },
  })

  const toggleMostSoldMutation = useMutation({
    mutationFn: async ({ id, isMostSold }) => {
      const { data, error } = await supabase.from('products').update({ isMostSold }).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedProd) => {
      if (updatedProd) {
        qc.setQueryData(['products'], (old = []) =>
          old.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
        )
      }
    },
    onError: (err) => console.error('toggleMostSold error:', err),
  })

  const updateProductBatchMutation = useMutation({
    mutationFn: async (batch) => {
      const { data, error } = await supabase.from('product_batches').upsert(batch).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (batch) => {
      if (batch) {
        qc.setQueryData(['product_batches'], (old = []) => {
          const exists = old.some((b) => b.id === batch.id)
          return exists ? old.map((b) => (b.id === batch.id ? { ...b, ...batch } : b)) : [...old, batch]
        })
      }
    },
  })

  const openShiftMutation = useMutation({
    mutationFn: async ({ id, openingAmount, openedBy }) => {
      const shift = {
        id,
        openedAt: new Date().toISOString(),
        openingAmount,
        movements: [],
        status: 'open',
        openedBy,
      }
      const { data, error } = await supabase.from('shifts').insert([shift]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (serverShift) => {
      // Replace the optimistic entry with the confirmed server data
      qc.setQueryData(['shifts'], (old = []) =>
        old.map((s) => (s.id === serverShift?.id ? serverShift : s))
      )
    },
  })

  const closeShiftMutation = useMutation({
    mutationFn: async ({ shiftId, counted, closedBy, theoretical }) => {
      const closed = {
        closedAt: new Date().toISOString(),
        closingCounted: counted,
        closingTheoretical: theoretical,
        difference: counted - Math.abs(theoretical),
        status: 'closed',
        closedBy,
      }
      const { data, error } = await supabase.from('shifts').update(closed).eq('id', shiftId).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (closedShift) => {
      if (closedShift) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => (s.id === closedShift.id ? closedShift : s))
        )
      }
    },
  })

  const addMovementMutation = useMutation({
    mutationFn: async ({ shiftId, currentMovements, type, amount, reason }) => {
      const signed = signMovementAmount(type, amount)
      const mov = { id: uid(), date: new Date().toISOString(), type, amount: signed, reason }
      const { data, error } = await supabase
        .from('shifts')
        .update({ movements: [...(currentMovements || []), mov] })
        .eq('id', shiftId)
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedShift) => {
      if (updatedShift) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => (s.id === updatedShift.id ? updatedShift : s))
        )
      }
    },
  })

  const addCustomerMutation = useMutation({
    mutationFn: async (cust) => {
      const { data, error } = await supabase.from('customers').insert([cust]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (newCust) => {
      if (newCust) {
        qc.setQueryData(['customers'], (old = []) => {
          if (old.some((c) => c.id === newCust.id)) return old
          return [...old, newCust].sort((a, b) => a.name.localeCompare(b.name))
        })
      }
    },
  })

  const registerCustomerPaymentMutation = useMutation({
    mutationFn: async ({ customerId, amount, shiftId }) => {
      const date = new Date().toISOString()
      const { error } = await supabase.rpc('register_customer_payment_rpc', {
        p_customer_id: customerId,
        p_amount: amount,
        p_date: date,
        p_shift_id: shiftId,
      })
      if (error) throw error
      return { customerId, amount, date, shiftId }
    },
    onSuccess: (res) => {
      if (res?.shiftId) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => {
            if (s.id === res.shiftId) {
              const mov = {
                id: uid(),
                date: res.date,
                type: 'ingreso',
                amount: Math.abs(res.amount),
                reason: 'Pago de cuenta corriente',
              }
              return { ...s, movements: [...(s.movements || []), mov] }
            }
            return s
          })
        )
      }
    },
  })

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['customers'], (old = []) => old.filter((c) => c.id !== deletedId))
    },
  })


  const addSupplierMutation = useMutation({
    mutationFn: async (sup) => {
      const { data, error } = await supabase.from('suppliers').insert([sup]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (newSup) => {
      if (newSup) {
        qc.setQueryData(['suppliers'], (old = []) => {
          if (old.some((s) => s.id === newSup.id)) return old
          return [...old, newSup].sort((a, b) => a.name.localeCompare(b.name))
        })
      }
    },
  })

  const updateSupplierMutation = useMutation({
    mutationFn: async (sup) => {
      const { data, error } = await supabase.from('suppliers').update(sup).eq('id', sup.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedSup) => {
      if (updatedSup) {
        qc.setQueryData(['suppliers'], (old = []) =>
          old.map((s) => (s.id === updatedSup.id ? { ...s, ...updatedSup } : s))
        )
      }
    },
  })

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['suppliers'], (old = []) => old.filter((s) => s.id !== deletedId))
    },
  })

  const receiveGoodsMutation = useMutation({
    mutationFn: async ({ supplierId, amount, detail, paidCash, shiftId, items = [] }) => {
      const date = new Date().toISOString()
      const dbSupplierId = supplierId === DIRECT_PURCHASE_SUPPLIER_ID || !supplierId ? null : supplierId

      if (!dbSupplierId) {
        // Direct purchase without a supplier: update products directly in Supabase to bypass RPC supplier validation.
        // One update per product, applying all of its lines in order (same as the local cache in onSuccess).
        const currentProducts = qc.getQueryData(['products']) || []
        const purchasedIds = [...new Set(items.map((item) => item.productId).filter(Boolean))]
        for (const productId of purchasedIds) {
          const prod = currentProducts.find((p) => p.id === productId)
          if (!prod) continue
          const { error } = await supabase
            .from('products')
            .update(applyPurchaseItems(prod, items))
            .eq('id', productId)
          if (error) throw error
        }
      } else {
        const { error } = await supabase.rpc('receive_goods_rpc', {
          p_supplier_id: dbSupplierId,
          p_amount: amount,
          p_detail: detail,
          p_paid_cash: paidCash,
          p_date: date,
          p_shift_id: shiftId,
          p_items: items,
        })
        if (error) throw error
      }
      return { supplierId: supplierId || DIRECT_PURCHASE_SUPPLIER_ID, amount, detail, paidCash, date, shiftId, items }
    },
    onSuccess: (result) => {
      if (!result.supplierId || result.supplierId === DIRECT_PURCHASE_SUPPLIER_ID) {
        const newEntry = {
          id: uid(),
          date: result.date,
          type: 'factura',
          amount: result.amount,
          detail: result.detail,
          paidCash: result.paidCash,
          items: result.items,
        }
        qc.setQueryData(['suppliers'], (old = []) => {
          const exists = old.some(isDirectPurchaseSupplier)
          const updated = exists
            ? old.map((s) => (isDirectPurchaseSupplier(s) ? { ...s, entries: [...(s.entries || []), newEntry] } : s))
            : [
                ...old,
                {
                  id: DIRECT_PURCHASE_SUPPLIER_ID,
                  name: DIRECT_PURCHASE_SUPPLIER_NAME,
                  category: DIRECT_PURCHASE_SUPPLIER_CATEGORY,
                  entries: [newEntry],
                },
              ]
          const directSup = updated.find(isDirectPurchaseSupplier)
          if (directSup) {
            persistDirectPurchases(directSup.entries || [])
          }
          return updated
        })
      }

      // Surgical update for received product stock and costs
      if (result.items && result.items.length > 0) {
        const purchasedIds = new Set(result.items.map((item) => item.productId).filter(Boolean))
        qc.setQueryData(['products'], (old = []) =>
          old.map((p) => (purchasedIds.has(p.id) ? { ...p, ...applyPurchaseItems(p, result.items) } : p))
        )
      }

      // Surgical update for shift movements if cash purchase
      if (result.paidCash && result.shiftId) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => {
            if (s.id === result.shiftId) {
              const mov = {
                id: uid(),
                date: result.date,
                type: 'pago_proveedor',
                amount: -Math.abs(result.amount),
                reason: `Pago mercadería: ${result.detail || 'Factura'}`,
              }
              return { ...s, movements: [...(s.movements || []), mov] }
            }
            return s
          })
        )
      }
    },
  })

  const registerSupplierPaymentMutation = useMutation({
    mutationFn: async ({ supplierId, amount, fromCash, shiftId }) => {
      const date = new Date().toISOString()
      const { error } = await supabase.rpc('register_supplier_payment_rpc', {
        p_supplier_id: supplierId,
        p_amount: amount,
        p_from_cash: fromCash,
        p_date: date,
        p_shift_id: shiftId,
      })
      if (error) throw error
      return { supplierId, amount, fromCash, date, shiftId }
    },
    onSuccess: (res) => {
      if (res?.fromCash && res?.shiftId) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => {
            if (s.id === res.shiftId) {
              const mov = {
                id: uid(),
                date: res.date,
                type: 'pago_proveedor',
                amount: -Math.abs(res.amount),
                reason: 'Pago a proveedor',
              }
              return { ...s, movements: [...(s.movements || []), mov] }
            }
            return s
          })
        )
      }
    },
  })

  const completeSaleMutation = useMutation({
    mutationFn: async (args) => {
      if (!currentShift) throw new Error('No hay una caja abierta')

      const date = new Date().toISOString()
      
      const itemsWithCost = freezeItemCosts(args.items, products, comboItems)
      const cost = sumItemsCost(itemsWithCost)
      const discount = Math.max(0, Number(args.discount) || 0)

      const saleId = uid()
      const { error } = await supabase.rpc('complete_sale_rpc', {
        p_sale_id: saleId,
        p_items: itemsWithCost,
        p_method: args.method,
        p_customer_id: args.customerId || null,
        p_cash_received: args.cashReceived || 0,
        p_change: args.change || 0,
        p_cost: cost,
        p_sold_by: currentUser?.username || DEFAULT_SELLER_USERNAME,
        p_date: date,
        p_shift_id: currentShift.id,
        p_discount: discount,
      })
      if (error) throw error

      const subtotal = itemsWithCost.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
      const total = Math.max(0, subtotal - discount)
      return {
        id: saleId,
        date,
        items: itemsWithCost,
        total,
        discount,
        method: args.method,
        customerId: args.customerId || null,
        cashReceived: args.cashReceived || 0,
        change: args.change || 0,
        cost,
        soldBy: currentUser?.username || DEFAULT_SELLER_USERNAME,
        shiftId: currentShift.id,
      }
    },
    onSuccess: (newSale) => {
      // 1. Prepend sale to local sales queries
      qc.setQueriesData({ queryKey: ['sales'] }, (old = []) => {
        if (!Array.isArray(old)) return old
        if (old.some((s) => s.id === newSale.id)) return old
        return [newSale, ...old]
      })

      // 2. Subtract sold stock from local products (handling combo components)
      if (newSale?.items && newSale.items.length > 0) {
        const itemDeltas = new Map()
        for (const it of newSale.items) {
          if (it.productId) {
            const prod = products.find((p) => p.id === it.productId)
            if (prod?.isCombo) {
              const comps = comboItems.filter((ci) => ci.comboId === it.productId)
              for (const c of comps) {
                const delta = (it.qty || 1) * (Number(c.quantity) || 1)
                itemDeltas.set(c.productId, (itemDeltas.get(c.productId) || 0) + delta)
              }
            } else {
              itemDeltas.set(it.productId, (itemDeltas.get(it.productId) || 0) + (it.qty || 1))
            }
          }
        }
        qc.setQueryData(['products'], (old = []) =>
          old.map((p) => {
            const qtySold = itemDeltas.get(p.id)
            if (qtySold) {
              return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - qtySold) }
            }
            return p
          })
        )
      }

      // 3. If cash sale, add shift movement
      if (newSale?.method === 'efectivo' && newSale?.shiftId) {
        qc.setQueryData(['shifts'], (old = []) =>
          old.map((s) => {
            if (s.id === newSale.shiftId) {
              const mov = {
                id: uid(),
                date: newSale.date,
                type: 'venta',
                amount: newSale.total,
                reason: `Venta #${newSale.id.slice(-SALE_ID_SUFFIX_LENGTH)}`,
              }
              return { ...s, movements: [...(s.movements || []), mov] }
            }
            return s
          })
        )
      }
    },
  })

  const resetDataMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('products').delete().neq('id', RESET_SENTINEL_ID)
      await supabase.from('sales').delete().neq('id', RESET_SENTINEL_ID)
      await supabase.from('customers').delete().neq('id', RESET_SENTINEL_ID)
      await supabase.from('suppliers').delete().neq('id', RESET_SENTINEL_ID)
      await supabase.from('expenses').delete().neq('id', RESET_SENTINEL_ID)
      await supabase.from('shifts').delete().neq('id', RESET_SENTINEL_ID)

      await supabase.from('products').insert(SEED_PRODUCTS)
      await supabase.from('sales').insert(generateMockSales())
      await supabase.from('customers').insert(SEED_CUSTOMERS)
      await supabase.from('suppliers').insert(SEED_SUPPLIERS)
    },
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })

  const addUserMutation = useMutation({
    mutationFn: async ({ username, password, name, role }) => {
      const { data, error } = await supabase.rpc('create_user', {
        p_username: username.toLowerCase().trim(),
        p_password: password,
        p_name: name,
        p_role: role || ROLES.CASHIER,
      })
      if (error) throw error
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data)
        .single()
      if (profileError) throw profileError
      return profile
    },
    onSuccess: (newUser) => {
      if (newUser) {
        qc.setQueryData(['users'], (old = []) => {
          if (old.some((u) => u.id === newUser.id)) return old
          return [...old, newUser]
        })
      }
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('delete_user', { user_id: id })
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['users'], (old = []) => old.filter((u) => u.id !== deletedId))
    },
  })

  const addComboItemMutation = useMutation({
    mutationFn: async (comboItem) => {
      const { data, error } = await supabase.from('combo_items').insert([comboItem]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (newItem) => {
      if (newItem) {
        qc.setQueryData(['combo_items'], (old = []) => [...old, newItem])
      }
    },
  })

  const deleteComboItemMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('combo_items').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['combo_items'], (old = []) => old.filter((ci) => ci.id !== deletedId))
    },
  })

  const addPromotionMutation = useMutation({
    mutationFn: async (promo) => {
      const { data, error } = await supabase.from('promotions').insert([promo]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (newPromo) => {
      if (newPromo) {
        qc.setQueryData(['promotions'], (old = []) => [...old, newPromo])
      }
    },
  })

  const updatePromotionMutation = useMutation({
    mutationFn: async (promo) => {
      const { data, error } = await supabase.from('promotions').update(promo).eq('id', promo.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: (updatedPromo) => {
      if (updatedPromo) {
        qc.setQueryData(['promotions'], (old = []) =>
          old.map((p) => (p.id === updatedPromo.id ? { ...p, ...updatedPromo } : p))
        )
      }
    },
  })

  const deletePromotionMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(['promotions'], (old = []) => old.filter((p) => p.id !== deletedId))
    },
  })

  // Callback wrapper definitions to preserve component APIs
  const addProduct = useCallback(async (p, options) => {
    const newProduct = { ...p, id: p.id || uid() }
    if (!isOnline) {
      const sanitized = sanitizeProduct(newProduct)
      enqueueOfflineAction({ id: uid(), type: 'ADD_PRODUCT', payload: sanitized })
      qc.setQueryData(['products'], (old = []) => [...old, sanitized])
      return sanitized
    } else {
      return await addProductMutation.mutateAsync(newProduct, options)
    }
  }, [addProductMutation, isOnline, enqueueOfflineAction, qc])

  const updateProduct = useCallback((p, options) => {
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'UPDATE_PRODUCT', payload: p })
      qc.setQueryData(['products'], (old = []) => old.map((x) => x.id === p.id ? { ...x, ...p } : x))
      return Promise.resolve(p)
    } else {
      return updateProductMutation.mutateAsync(p, options)
    }
  }, [updateProductMutation, isOnline, enqueueOfflineAction, qc])

  const deleteProduct = useCallback((id) => {
    deleteProductMutation.mutate(id)
  }, [deleteProductMutation])

  const adjustStock = useCallback((id, delta) => {
    adjustStockMutation.mutate({ id, delta })
  }, [adjustStockMutation])

  const updateProductBatch = useCallback((batch) => {
    if (!isOnline) {
      qc.setQueryData(['product_batches'], (old = []) => {
        const existing = old.find((b) => b.id === batch.id)
        if (existing) {
          return old.map((b) => b.id === batch.id ? { ...b, ...batch } : b)
        } else {
          return [...old, batch]
        }
      })
      qc.setQueryData(['products'], (oldProds = []) => {
        return oldProds.map((p) => {
          if (p.id === batch.productId) {
            const latestBatches = qc.getQueryData(['product_batches']) || []
            const totalStock = latestBatches
              .filter((b) => b.productId === p.id)
              .reduce((sum, b) => sum + b.stock, 0)
            return { ...p, stock: totalStock }
          }
          return p
        })
      })
      enqueueOfflineAction({ id: uid(), type: 'UPDATE_BATCH', payload: batch })
      return Promise.resolve(batch)
    } else {
      return updateProductBatchMutation.mutateAsync(batch)
    }
  }, [updateProductBatchMutation, isOnline, enqueueOfflineAction, qc])

  const toggleMostSold = useCallback((id, isMostSold) => {
    toggleMostSoldMutation.mutate({ id, isMostSold })
  }, [toggleMostSoldMutation])

  const openShift = useCallback((openingAmount, openedBy) => {
    // Build shift object once so both paths share the same ID
    const newShift = {
      id: uid(),
      openedAt: new Date().toISOString(),
      openingAmount,
      movements: [],
      status: 'open',
      openedBy,
    }
    // Optimistically update the cache immediately (both online and offline)
    qc.setQueryData(['shifts'], (old = []) => [newShift, ...old])
    setCurrentShiftCache(newShift)
    if (!isOnline) {
      enqueueOfflineAction({
        id: uid(),
        type: 'OPEN_SHIFT',
        payload: newShift
      })
    } else {
      openShiftMutation.mutate(
        { id: newShift.id, openingAmount, openedBy },
        {
          onError: () => {
            // Roll back optimistic update on error
            qc.setQueryData(['shifts'], (old = []) => old.filter((s) => s.id !== newShift.id))
            setCurrentShiftCache(null)
          },
        }
      )
    }
  }, [openShiftMutation, isOnline, enqueueOfflineAction, setCurrentShiftCache, qc])

  const closeShift = useCallback((counted, closedBy) => {
    if (!currentShift) return
    const theoretical = shiftTheoretical(currentShift)
    // Optimistically close the shift in the cache immediately (both online and offline)
    const closedAt = new Date().toISOString()
    const difference = counted - Math.abs(theoretical)
    qc.setQueryData(['shifts'], (old = []) => {
      return old.map((s) => {
        if (s.id === currentShift.id) {
          return {
            ...s,
            closedAt,
            closingCounted: counted,
            closingTheoretical: theoretical,
            difference,
            status: 'closed',
            closedBy,
          }
        }
        return s
      })
    })
    setCurrentShiftCache(null)
    if (!isOnline) {
      enqueueOfflineAction({
        id: uid(),
        type: 'CLOSE_SHIFT',
        payload: {
          shiftId: currentShift.id,
          closedAt,
          closingCounted: counted,
          closingTheoretical: theoretical,
          difference,
          status: 'closed',
          closedBy,
        }
      })
      return Promise.resolve(null)
    } else {
      return closeShiftMutation.mutateAsync({
        shiftId: currentShift.id,
        counted,
        closedBy,
        theoretical
      })
    }
  }, [closeShiftMutation, isOnline, currentShift, enqueueOfflineAction, setCurrentShiftCache, qc])

  const addMovement = useCallback((type, amount, reason) => {
    if (!isOnline) {
      enqueueOfflineAction({
        id: uid(),
        type: 'ADD_MOVEMENT',
        payload: { type, amount, reason, date: new Date().toISOString(), shiftId: currentShift?.id }
      })
      const signed = signMovementAmount(type, amount)
      const mov = { id: uid(), date: new Date().toISOString(), type, amount: signed, reason }
      qc.setQueryData(['shifts'], (oldShifts = []) => {
        return oldShifts.map((s) => {
          if (s.id === currentShift?.id) {
            return {
              ...s,
              movements: [...(s.movements || []), mov]
            }
          }
          return s
        })
      })
    } else {
      addMovementMutation.mutate({
        shiftId: currentShift.id,
        currentMovements: currentShift.movements,
        type,
        amount,
        reason
      })
    }
  }, [addMovementMutation, isOnline, enqueueOfflineAction, currentShift, qc])

  const addCustomer = useCallback(async (name, phone) => {
    const cust = { id: uid(), name, phone, entries: [] }
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'ADD_CUSTOMER', payload: cust })
      qc.setQueryData(['customers'], (old = []) => [...old, cust])
    } else {
      await addCustomerMutation.mutateAsync(cust)
    }
    return cust
  }, [addCustomerMutation, isOnline, enqueueOfflineAction, qc])

  const deleteCustomer = useCallback((id) => {
    if (!isOnline) {
      qc.setQueryData(['customers'], (old = []) => old.filter((c) => c.id !== id))
    } else {
      deleteCustomerMutation.mutate(id)
    }
  }, [deleteCustomerMutation, isOnline, qc])


  const registerCustomerPayment = useCallback((customerId, amount) => {
    if (currentUser?.role !== ROLES.ADMIN && currentUser?.role !== ROLES.CASHIER) return Promise.resolve(null)
    const shiftId = currentShift?.id || null
    if (!isOnline) {
      const date = new Date().toISOString()
      const payment = { customerId, amount, date, shiftId }
      enqueueOfflineAction({
        id: uid(),
        type: 'REGISTER_CUSTOMER_PAYMENT',
        payload: payment
      })

      // Update customers local cache
      qc.setQueryData(['customers'], (old = []) => {
        return old.map((c) => {
          if (c.id === customerId) {
            return {
              ...c,
              entries: [...(c.entries || []), { id: uid(), date, type: 'pago', amount, detail: 'Pago de deuda' }]
            }
          }
          return c
        })
      })

      // Update shift movement local cache
      if (currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'cobro_fiado',
          amount: Math.abs(amount),
          reason: `Cobro de fiado - Clientes`
        }
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => {
            if (s.id === currentShift.id) {
              const updatedShift = {
                ...s,
                movements: [...(s.movements || []), mov]
              }
              setCurrentShiftCache(updatedShift)
              return updatedShift
            }
            return s
          })
        })
      }
      return Promise.resolve(payment)
    } else {
      return registerCustomerPaymentMutation.mutateAsync({ customerId, amount, shiftId })
    }
  }, [registerCustomerPaymentMutation, currentUser, isOnline, enqueueOfflineAction, currentShift, qc, setCurrentShiftCache])

  const addSupplier = useCallback((name, phone = '', contactName = '', category = DEFAULT_CATEGORY, deliveryDays = []) => {
    const sup = {
      id: uid(),
      name,
      phone,
      contact_name: contactName,
      category,
      delivery_days: deliveryDays,
      entries: []
    }
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'ADD_SUPPLIER', payload: sup })
      qc.setQueryData(['suppliers'], (old = []) => [...old, sup])
    } else {
      addSupplierMutation.mutate(sup)
    }
    return sup
  }, [addSupplierMutation, isOnline, enqueueOfflineAction, qc])

  const updateSupplier = useCallback((sup) => {
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'UPDATE_SUPPLIER', payload: sup })
      qc.setQueryData(['suppliers'], (old = []) => old.map((s) => s.id === sup.id ? { ...s, ...sup } : s))
    } else {
      updateSupplierMutation.mutate(sup)
    }
  }, [updateSupplierMutation, isOnline, enqueueOfflineAction, qc])

  const deleteSupplier = useCallback((id) => {
    if (!isOnline) {
      qc.setQueryData(['suppliers'], (old = []) => old.filter((s) => s.id !== id))
    } else {
      deleteSupplierMutation.mutate(id)
    }
  }, [deleteSupplierMutation, isOnline, qc])

  const deleteSupplierEntry = useCallback(async (supplierId, entryId) => {
    const suppliers = qc.getQueryData(['suppliers']) || []
    const supplier = suppliers.find((s) => s.id === supplierId)
    if (!supplier) return

    const oldEntries = supplier.entries || []
    const deletedEntry = oldEntries.find((e) => e.id === entryId)
    if (!deletedEntry) return

    // Revert product stock for items in deleted purchase entry
    if (deletedEntry.type === 'factura' && deletedEntry.items && Array.isArray(deletedEntry.items)) {
      const currentProducts = qc.getQueryData(['products']) || []
      const updatedProducts = currentProducts.map((p) => {
        const item = deletedEntry.items.find((it) => it.productId === p.id)
        if (item) {
          const nextStock = Math.max(0, (Number(p.stock) || 0) - (Number(item.totalUnits) || 0))
          return { ...p, stock: nextStock }
        }
        return p
      })

      qc.setQueryData(['products'], updatedProducts)
      setProductsCache(updatedProducts)

      if (isOnline) {
        for (const item of deletedEntry.items) {
          if (item.productId) {
            const prod = currentProducts.find((p) => p.id === item.productId)
            if (prod) {
              const newStock = Math.max(0, (Number(prod.stock) || 0) - (Number(item.totalUnits) || 0))
              await supabase.from('products').update({ stock: newStock }).eq('id', item.productId)
            }
          }
        }
      }
    }

    const updatedEntries = oldEntries.filter((e) => e.id !== entryId)
    const updatedSupplier = { ...supplier, entries: updatedEntries }

    // Determine if it was paid from cash
    const isCash = 
      (deletedEntry.type === 'factura' && deletedEntry.paidCash) || 
      (deletedEntry.type === 'pago' && (deletedEntry.fromCash || deletedEntry.detail?.includes('Pago contado') || deletedEntry.detail?.includes('Caja Chica') || deletedEntry.detail?.includes('pago a proveedor') || deletedEntry.detail?.includes('Pago a proveedor')))

    // Update active shift locally and on DB if it was cash
    if (isCash && currentShift) {
      const shiftTime = new Date(deletedEntry.date).getTime()
      const shiftMov = (currentShift.movements || []).find((m) => {
        const isType = m.type === 'pago_proveedor'
        const isAmount = Math.abs(m.amount) === Math.abs(deletedEntry.amount)
        const isTimeClose = Math.abs(new Date(m.date).getTime() - shiftTime) < MOVEMENT_MATCH_TOLERANCE_MS
        return isType && isAmount && isTimeClose
      })

      if (shiftMov) {
        const updatedMovements = (currentShift.movements || []).filter((m) => m.id !== shiftMov.id)
        const updatedShift = { ...currentShift, movements: updatedMovements }
        
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => s.id === currentShift.id ? updatedShift : s)
        })
        setCurrentShiftCache(updatedShift)

        if (isOnline) {
          await supabase.from('shifts').update({ movements: updatedMovements }).eq('id', currentShift.id)
        } else {
          enqueueOfflineAction({
            id: uid(),
            type: 'UPDATE_SHIFT_MOVEMENTS',
            payload: { shiftId: currentShift.id, movements: updatedMovements }
          })
        }
      }
    }

    // If direct purchase, sync with localStorage and update query cache
    if (supplierId === DIRECT_PURCHASE_SUPPLIER_ID || supplier.name === DIRECT_PURCHASE_SUPPLIER_NAME) {
      persistDirectPurchases(updatedEntries)
      qc.setQueryData(['suppliers'], (old = []) =>
        old.map((s) => (s.id === supplier.id ? updatedSupplier : s)),
      )
      return
    }

    // Update supplier in cache and DB
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'UPDATE_SUPPLIER', payload: updatedSupplier })
      qc.setQueryData(['suppliers'], (old = []) => old.map((s) => s.id === supplierId ? updatedSupplier : s))
    } else {
      await updateSupplierMutation.mutateAsync(updatedSupplier)
    }
  }, [currentShift, isOnline, qc, updateSupplierMutation, enqueueOfflineAction, setCurrentShiftCache, setProductsCache])

  const receiveGoods = useCallback((supplierId, amount, detail, paidCash, items = []) => {
    if (currentUser?.role !== ROLES.ADMIN && currentUser?.role !== ROLES.CASHIER && currentUser?.role !== ROLES.STOCKER) return Promise.resolve(null)
    const shiftId = currentShift?.id || null
    if (!isOnline) {
      if (paidCash && !currentShift?.id) {
        console.warn('Cannot register cash payment without an open shift')
        return Promise.resolve(null)
      }
      const date = new Date().toISOString()
      const goods = { supplierId, amount, detail, paidCash, date, shiftId, items }

      // Update products stock/cost and batches locally
      let batchesUpdated = false
      qc.setQueryData(['product_batches'], (oldBatches = []) => {
        let updated = [...oldBatches]
        for (const item of items) {
          if (item.productId) {
            const prod = displayedProducts.find((p) => p.id === item.productId)
            if (prod?.controlLotes) {
              batchesUpdated = true
              const existingIdx = updated.findIndex((b) => b.productId === item.productId && b.batchCode === item.batchCode)
              updated =
                existingIdx !== -1
                  ? updated.map((b, idx) => (idx === existingIdx ? { ...b, stock: b.stock + item.totalUnits } : b))
                  : [
                      ...updated,
                      {
                        id: uid(),
                        productId: item.productId,
                        batchCode: item.batchCode,
                        expirationDate: item.expirationDate,
                        stock: item.totalUnits,
                        created_at: date,
                      },
                    ]
            }
          }
        }
        if (batchesUpdated) {
          setBatchesCache(updated)
        }
        return updated
      })

      qc.setQueryData(['products'], (oldProds = []) => {
        const updated = oldProds.map((p) => {
          const item = items.find((it) => it.productId === p.id)
          if (item) {
            const { cost: calculatedUnitCost, stock: purchasedStock } = applyPurchaseItems(p, items)
            if (p.controlLotes) {
              const latestBatches = qc.getQueryData(['product_batches']) || []
              const totalStock = latestBatches
                .filter((b) => b.productId === p.id)
                .reduce((sum, b) => sum + b.stock, 0)
              return { ...p, cost: calculatedUnitCost, stock: totalStock }
            } else {
              return { ...p, cost: calculatedUnitCost, stock: purchasedStock }
            }
          }
          return p
        })
        setProductsCache(updated)
        return updated
      })

      enqueueOfflineAction({
        id: uid(),
        type: 'RECEIVE_GOODS',
        payload: goods
      })

      // Update suppliers local cache
      const targetSupplierId = supplierId || DIRECT_PURCHASE_SUPPLIER_ID
      const isTargetSupplier = (s) =>
        s.id === targetSupplierId || (targetSupplierId === DIRECT_PURCHASE_SUPPLIER_ID && isDirectPurchaseSupplier(s))
      qc.setQueryData(['suppliers'], (old = []) => {
        const exists = old.some(isTargetSupplier)

        const updated = exists
          ? old.map((s) => {
              if (!isTargetSupplier(s)) return s
              const invoice = { id: uid(), date, type: 'factura', amount, detail, paidCash, items }
              const cashPayment = paidCash
                ? [{ id: uid(), date, type: 'pago', amount, detail: `Pago contado: ${detail}` }]
                : []
              return { ...s, entries: [...(s.entries || []), invoice, ...cashPayment] }
            })
          : [
              ...old,
              {
                id: DIRECT_PURCHASE_SUPPLIER_ID,
                name: DIRECT_PURCHASE_SUPPLIER_NAME,
                category: DIRECT_PURCHASE_SUPPLIER_CATEGORY,
                entries: [{ id: uid(), date, type: 'factura', amount, detail, paidCash, items }],
              },
            ]

        const directSup = updated.find(isDirectPurchaseSupplier)
        if (directSup) {
          persistDirectPurchases(directSup.entries || [])
        }
        return updated
      })

      // Update shift movement local cache
      if (paidCash && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'pago_proveedor',
          amount: -Math.abs(amount),
          reason: `Pago contado`
        }
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => {
            if (s.id === currentShift.id) {
              const updatedShift = {
                ...s,
                movements: [...(s.movements || []), mov]
              }
              setCurrentShiftCache(updatedShift)
              return updatedShift
            }
            return s
          })
        })
      }
      return Promise.resolve(goods)
    } else {
      return receiveGoodsMutation.mutateAsync({ supplierId, amount, detail, paidCash, shiftId, items })
    }
  }, [receiveGoodsMutation, currentUser, isOnline, enqueueOfflineAction, currentShift, qc, displayedProducts, setBatchesCache, setProductsCache, setCurrentShiftCache])

  const registerSupplierPayment = useCallback((supplierId, amount, fromCash) => {
    if (currentUser?.role !== ROLES.ADMIN && currentUser?.role !== ROLES.CASHIER) return Promise.resolve(null)
    const shiftId = currentShift?.id || null
    if (!isOnline) {
      if (fromCash && !currentShift?.id) {
        console.warn('Cannot register cash payment without an open shift')
        return Promise.resolve(null)
      }
      const date = new Date().toISOString()
      const payment = { supplierId, amount, fromCash, date, shiftId }
      enqueueOfflineAction({
        id: uid(),
        type: 'REGISTER_SUPPLIER_PAYMENT',
        payload: payment
      })

      // Update suppliers local cache
      qc.setQueryData(['suppliers'], (old = []) => {
        return old.map((s) => {
          if (s.id === supplierId) {
            return {
              ...s,
              entries: [...(s.entries || []), { id: uid(), date, type: 'pago', amount, detail: 'Pago a proveedor', fromCash }]
            }
          }
          return s
        })
      })

      // Update shift movement local cache
      if (fromCash && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'pago_proveedor',
          amount: -Math.abs(amount),
          reason: `Pago a proveedor`
        }
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => {
            if (s.id === currentShift.id) {
              const updatedShift = {
                ...s,
                movements: [...(s.movements || []), mov]
              }
              setCurrentShiftCache(updatedShift)
              return updatedShift
            }
            return s
          })
        })
      }
      return Promise.resolve(payment)
    } else {
      return registerSupplierPaymentMutation.mutateAsync({ supplierId, amount, fromCash, shiftId })
    }
  }, [registerSupplierPaymentMutation, currentUser, isOnline, enqueueOfflineAction, currentShift, qc, setCurrentShiftCache])

  const completeSale = useCallback((args) => {
    const shiftId = currentShift?.id || null

    if (!isOnline) {
      const date = new Date().toISOString()
      const itemsWithCost = freezeItemCosts(args.items, displayedProducts, comboItems)
      const cost = sumItemsCost(itemsWithCost)
      const discount = Math.max(0, Number(args.discount) || 0)
      const subtotal = itemsWithCost.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
      const total = Math.max(0, subtotal - discount)

      const sale = {
        id: `${OFFLINE_SALE_ID_PREFIX}${uid()}`,
        date,
        items: itemsWithCost,
        total,
        discount,
        method: args.method,
        customerId: args.customerId,
        cashReceived: args.cashReceived,
        change: args.change,
        cost,
        soldBy: currentUser?.username || DEFAULT_SELLER_USERNAME,
        isOfflinePending: true,
        shiftId,
      }

      // 1. Perform FEFO batch deduction for any product with controlLotes
      let batchesUpdated = false
      qc.setQueryData(['product_batches'], (oldBatches = []) => {
        let updated = [...oldBatches]
        for (const item of args.items) {
          const prod = displayedProducts.find((p) => p.id === item.productId)
          if (prod?.controlLotes) {
            batchesUpdated = true
            // Find active batches for this product
            const activeBatches = updated
              .filter((b) => b.productId === item.productId && b.stock > 0)
              .sort((a, b) => {
                const dateA = new Date(a.expirationDate).getTime()
                const dateB = new Date(b.expirationDate).getTime()
                if (dateA !== dateB) return dateA - dateB
                const createdA = a.created_at ? new Date(a.created_at).getTime() : 0
                const createdB = b.created_at ? new Date(b.created_at).getTime() : 0
                if (createdA !== createdB) return createdA - createdB
                return a.id.localeCompare(b.id)
              })

            const totalAvailable = activeBatches.reduce((sum, b) => sum + b.stock, 0)
            if (totalAvailable < item.qty) {
              throw new Error(`Stock insuficiente en los lotes para el producto: ${prod.name}`)
            }

            let qtyToDeduct = item.qty
            for (const batch of activeBatches) {
              if (qtyToDeduct <= 0) break
              const deduct = Math.min(batch.stock, qtyToDeduct)
              qtyToDeduct -= deduct
              updated = updated.map((b) => b.id === batch.id ? { ...b, stock: b.stock - deduct } : b)
            }
          }
        }
        if (batchesUpdated) {
          setBatchesCache(updated)
        }
        return updated
      })

      // 2. Decrement stock locally in products cache
      qc.setQueryData(['products'], (oldProducts = []) => {
        const updated = oldProducts.map((p) => {
          const cartItem = args.items.find((item) => item.productId === p.id)
          if (cartItem) {
            if (p.controlLotes) {
              const latestBatches = qc.getQueryData(['product_batches']) || []
              const totalStock = latestBatches
                .filter((b) => b.productId === p.id)
                .reduce((sum, b) => sum + b.stock, 0)
              return { ...p, stock: totalStock }
            } else {
              return { ...p, stock: Math.max(0, p.stock - cartItem.qty) }
            }
          }
          return p
        })
        setProductsCache(updated)
        return updated
      })

      enqueueOfflineSale(sale)

      // Register shift movement locally
      if ((args.method === 'efectivo' || args.method === 'qr') && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: args.method === 'efectivo' ? 'venta' : 'venta_qr',
          amount: total,
          reason: args.method === 'efectivo' 
            ? `Venta en efectivo (${args.items.length} art.)` 
            : `Venta QR / Transf. (${args.items.length} art.)`,
        }
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => {
            if (s.id === currentShift.id) {
              const updatedShift = {
                ...s,
                movements: [...(s.movements || []), mov]
              }
              setCurrentShiftCache(updatedShift)
              return updatedShift
            }
            return s
          })
        })
      }

      // Add to sales cache locally
      qc.setQueryData(['sales'], (oldSales = []) => {
        return [sale, ...oldSales]
      })

      // 4. Update customer balance locally if credit ("fiado")
      if (args.method === 'fiado' && args.customerId) {
        qc.setQueryData(['customers'], (oldCustomers = []) => {
          return oldCustomers.map((c) => {
            if (c.id === args.customerId) {
              const detail = args.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
              return {
                ...c,
                entries: [...(c.entries || []), { id: uid(), date, type: 'compra', amount: total, detail }]
              }
            }
            return c
          })
        })
      }

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(OFFLINE_SALE_REGISTERED_EVENT, { detail: sale }))
      }

      return Promise.resolve(sale)
    } else {
      return completeSaleMutation.mutateAsync(args)
    }
  }, [completeSaleMutation, displayedProducts, comboItems, currentUser, enqueueOfflineSale, currentShift, qc, isOnline, setBatchesCache, setProductsCache, setCurrentShiftCache])

  const resetData = useCallback(() => {
    resetDataMutation.mutate()
  }, [resetDataMutation])

  const retryFailedSale = useCallback((sale) => {
    dequeueFailedSale(sale.id)
    const cleanSale = omitKeys(sale, ['failedAt', 'error'])
    enqueueOfflineSale(cleanSale)
    if (navigator.onLine) {
      syncOfflineSales()
    }
  }, [dequeueFailedSale, enqueueOfflineSale, syncOfflineSales])

  const discardFailedSale = useCallback((saleId) => {
    dequeueFailedSale(saleId)
    qc.invalidateQueries({ queryKey: ['sales'] })
  }, [dequeueFailedSale, qc])

  const retryFailedAction = useCallback((action) => {
    dequeueFailedAction(action.id)
    const cleanAction = omitKeys(action, ['failedAt', 'error'])
    enqueueOfflineAction(cleanAction)
    if (navigator.onLine) {
      syncOfflineActions()
    }
  }, [dequeueFailedAction, enqueueOfflineAction, syncOfflineActions])

  const discardFailedAction = useCallback((actionId) => {
    dequeueFailedAction(actionId)
    qc.invalidateQueries({ queryKey: ['customers'] })
    qc.invalidateQueries({ queryKey: ['suppliers'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['shifts'] })
  }, [dequeueFailedAction, qc])

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return
    setIsSyncing(true)
    try {
      await syncAllOfflineData()
    } finally {
      setIsSyncing(false)
    }
  }, [syncAllOfflineData, isOnline, isSyncing])

  const login = useCallback(async (username, password) => {
    const email = `${username.toLowerCase().trim()}${AUTH_EMAIL_DOMAIN}`
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (authError) {
      console.error(authError)
      return false
    }
    if (authData?.user) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      if (error) {
        console.error(error)
        return false
      }
      setCurrentUser(data)
      return true
    }
    return false
  }, [setCurrentUser])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
  }, [setCurrentUser])

  const createUser = useCallback((username, password, name, role, options) => {
    addUserMutation.mutate({ username, password, name, role }, options)
  }, [addUserMutation])

  const deleteUser = useCallback((id, options) => {
    deleteUserMutation.mutate(id, options)
  }, [deleteUserMutation])

  // Saves an expense. Paid from the drawer (origin 'turno') it also adds a 'gasto'
  // movement to the open shift; both are written together by register_expense_rpc.
  const registerExpense = useCallback(async (input) => {
    const isShift = input.origin === SHIFT_ORIGIN
    const expense = {
      id: uid(),
      category: input.category,
      amount: Number(input.amount),
      description: input.description?.trim() ?? '',
      period: input.period,
      paidAt: input.paidAt ?? new Date().toISOString(),
      origin: input.origin,
      shiftId: isShift ? currentShift?.id ?? null : null,
      movementId: isShift ? uid() : null,
      createdBy: currentUser?.username ?? null,
    }
    const validationError = validateExpense(expense)
    if (validationError) throw new Error(validationError)

    if (isOnline) {
      const { error } = await supabase.rpc('register_expense_rpc', buildExpenseRpcArgs(expense))
      if (error) throw error
    } else {
      enqueueOfflineAction({ id: uid(), type: 'REGISTER_EXPENSE', payload: expense })
    }

    qc.setQueryData(['expenses'], (old = []) => [expense, ...old.filter((e) => e.id !== expense.id)])
    if (isShift) {
      const movement = buildExpenseMovement(expense)
      qc.setQueryData(['shifts'], (old = []) =>
        old.map((s) => (s.id === expense.shiftId ? { ...s, movements: [...(s.movements ?? []), movement] } : s)),
      )
    }
    return expense
  }, [currentShift, currentUser, isOnline, enqueueOfflineAction, qc])

  // Admin only, for expenses paid outside the drawer (RLS blocks origin 'turno')
  const updateExpense = useCallback(async (expense) => {
    const fields = {
      category: expense.category,
      amount: Number(expense.amount),
      description: expense.description?.trim() || null,
      period: expense.period,
      paidAt: expense.paidAt,
      origin: expense.origin,
    }
    const validationError = validateExpense(fields)
    if (validationError) throw new Error(validationError)
    const { data, error } = await supabase.from('expenses').update(fields).eq('id', expense.id).select()
    if (error) throw error
    const saved = data?.[0] ?? { ...expense, ...fields }
    qc.setQueryData(['expenses'], (old = []) => old.map((e) => (e.id === saved.id ? saved : e)))
    return saved
  }, [qc])

  const deleteExpense = useCallback(async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    qc.setQueryData(['expenses'], (old = []) => old.filter((e) => e.id !== id))
  }, [qc])

  const addComboItem = useCallback((item) => addComboItemMutation.mutateAsync(item), [addComboItemMutation])
  const deleteComboItem = useCallback((id) => deleteComboItemMutation.mutateAsync(id), [deleteComboItemMutation])
  const addPromotion = useCallback((promo) => addPromotionMutation.mutateAsync(promo), [addPromotionMutation])
  const updatePromotion = useCallback((promo) => updatePromotionMutation.mutateAsync(promo), [updatePromotionMutation])
  const deletePromotion = useCallback((id) => deletePromotionMutation.mutateAsync(id), [deletePromotionMutation])

  // Combine query and Zustand states
  const state = useMemo(() => ({
    products: displayedProducts,
    productBatches: displayedProductBatches,
    comboItems,
    promotions,
    expenses,
    sales,
    customers,
    suppliers,
    currentShift,
    shiftHistory,
    theme: uiTheme,
    currentUser,
    users,
    failedSalesQueue,
    failedActionsQueue,
    cart,
    offlineSalesQueue,
    offlineActionsQueue,
    isSyncing,
  }), [
    displayedProducts,
    displayedProductBatches,
    comboItems,
    promotions,
    expenses,
    sales,
    customers,
    suppliers,
    currentShift,
    shiftHistory,
    uiTheme,
    currentUser,
    users,
    failedSalesQueue,
    failedActionsQueue,
    cart,
    offlineSalesQueue,
    offlineActionsQueue,
    isSyncing,
  ])

  return {
    state,
    hydrated,
    toggleTheme,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    completeSale,
    openShift,
    closeShift,
    addMovement,
    addCustomer,
    deleteCustomer,
    registerCustomerPayment,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    deleteSupplierEntry,
    receiveGoods,
    registerSupplierPayment,
    updateProductBatch,
    addComboItem,
    deleteComboItem,
    registerExpense,
    updateExpense,
    deleteExpense,
    addPromotion,
    updatePromotion,
    deletePromotion,
    resetData,
    login,
    logout,
    createUser,
    deleteUser,
    toggleMostSold,
    clearFailedSalesQueue,
    clearFailedActionsQueue,
    retryFailedSale,
    discardFailedSale,
    retryFailedAction,
    discardFailedAction,
    syncOfflineData,
    setCart,
    openShiftPending: openShiftMutation.isPending,
    closeShiftPending: closeShiftMutation.isPending,
    resetDataPending: resetDataMutation.isPending,
    loadingProducts,
  }
}
