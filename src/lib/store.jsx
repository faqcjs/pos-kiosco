import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'
import { uid } from './format'
import { SEED_PRODUCTS, SEED_CUSTOMERS, SEED_SUPPLIERS, generateMockSales } from './seed'

function sanitizeProduct(p) {
  return {
    id: p.id,
    barcode: p.barcode || '',
    name: p.name || '',
    category: p.category || 'Varios',
    cost: Number(p.cost) || 0,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    "minStock": Number(p.minStock) || 0,
    isMostSold: !!p.isMostSold,
    unidad: Number(p.unidad) || 1
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
  
  if (!shift) return { cashSales, manualIn, manualOut, qrSales: 0 }
  
  const movements = shift.movements || []
  for (const m of movements) {
    if (m.type === 'venta') cashSales += m.amount
    else if (m.type === 'ingreso' || m.type === 'cobro_fiado') manualIn += m.amount
    else if (m.type === 'egreso' || m.type === 'pago_proveedor') manualOut += m.amount
  }

  const start = new Date(shift.openedAt).getTime()
  const end = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now()
  const qrSales = (sales || [])
    .filter((s) => {
      const t = new Date(s.date).getTime()
      return s.method === 'qr' && t >= start && t <= end
    })
    .reduce((sum, s) => sum + s.total, 0)

  return { cashSales, manualIn, manualOut, qrSales }
}

// --- Zustand UI Store ---
export const useUIStore = create()(
  persist(
    (set) => ({
      theme: 'light',
      adminPassword: 'admin123',
      isAdminAuthenticated: false,
      currentUser: null,
      offlineSalesQueue: [],
      productsCache: [],
      currentShiftCache: null,
      offlineActionsQueue: [],
      failedSalesQueue: [],
      failedActionsQueue: [],
      cart: [],
      
      toggleTheme: () => set((state) => {
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
        return { theme: nextTheme }
      }),
      loginAdmin: (password) => {
        let success = false
        set((state) => {
          if (password === state.adminPassword) {
            success = true
            return { isAdminAuthenticated: true }
          }
          return {}
        })
        return success
      },
      logoutAdmin: () => set({ isAdminAuthenticated: false }),
      changeAdminPassword: (newPassword) => {
        if (!newPassword || newPassword.trim().length === 0) return
        set({ adminPassword: newPassword })
      },
      setCurrentUser: (user) => set({ currentUser: user }),
      enqueueOfflineSale: (sale) => set((state) => ({
        offlineSalesQueue: [...state.offlineSalesQueue, sale]
      })),
      dequeueOfflineSale: (saleId) => set((state) => ({
        offlineSalesQueue: state.offlineSalesQueue.filter(s => s.id !== saleId)
      })),
      setProductsCache: (products) => set({ productsCache: products }),
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
      name: 'kiosko-pos-ui-state',
    }
  )
)

// --- Query Client ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

function RealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        qc.invalidateQueries()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  return null
}

export function StoreProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      {children}
    </QueryClientProvider>
  )
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

  const syncingSalesRef = useRef(false)
  const syncingActionsRef = useRef(false)
  
  // Zustand Local UI state
  const uiTheme = useUIStore((s) => s.theme)
  const adminPassword = useUIStore((s) => s.adminPassword)
  const isAdminAuthenticated = useUIStore((s) => s.isAdminAuthenticated)
  const currentUser = useUIStore((s) => s.currentUser)
  const productsCache = useUIStore((s) => s.productsCache)
  const currentShiftCache = useUIStore((s) => s.currentShiftCache)
  const failedSalesQueue = useUIStore((s) => s.failedSalesQueue)
  const failedActionsQueue = useUIStore((s) => s.failedActionsQueue)
  const cart = useUIStore((s) => s.cart)
  
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const loginAdmin = useUIStore((s) => s.loginAdmin)
  const logoutAdmin = useUIStore((s) => s.logoutAdmin)
  const changeAdminPassword = useUIStore((s) => s.changeAdminPassword)
  const setCurrentUser = useUIStore((s) => s.setCurrentUser)
  const enqueueOfflineSale = useUIStore((s) => s.enqueueOfflineSale)
  const dequeueOfflineSale = useUIStore((s) => s.dequeueOfflineSale)
  const setProductsCache = useUIStore((s) => s.setProductsCache)
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
      if (session?.user) {
        if (!currentUser || currentUser.id !== session.user.id) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          if (!error && data) {
            setCurrentUser(data)
          }
        }
      } else {
        if (currentUser) {
          setCurrentUser(null)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [currentUser, setCurrentUser])

  // React Query server state queries
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name')
      if (error) throw error
      return data || []
    },
  })

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false })
      if (error) throw error
      return data || []
    },
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
      return data || []
    },
  })

  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shifts').select('*').order('openedAt', { ascending: false })
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
    enabled: currentUser?.role === 'administrador',
  })

  // Sync products query results with productsCache
  useEffect(() => {
    if (products && products.length > 0) {
      setProductsCache(products)
    }
  }, [products, setProductsCache])

  const displayedProducts = useMemo(() => {
    if (!products || products.length === 0) {
      return productsCache || []
    }
    return products
  }, [products, productsCache])

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
    qc.invalidateQueries()
    syncingSalesRef.current = false

    // Check if everything is synced to notify UI
    const remainingSales = useUIStore.getState().offlineSalesQueue.length
    const remainingActions = useUIStore.getState().offlineActionsQueue.length
    if (remainingSales === 0 && remainingActions === 0) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('offline-sync-completed'))
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
          case 'RECEIVE_GOODS': {
            const { supplierId, amount, detail, paidCash, date, shiftId } = action.payload
            const { error } = await supabase.rpc('receive_goods_rpc', {
              p_supplier_id: supplierId,
              p_amount: amount,
              p_detail: detail,
              p_paid_cash: paidCash,
              p_date: date,
              p_shift_id: shiftId,
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
          case 'ADD_MOVEMENT': {
            const { type, amount, reason, date, shiftId } = action.payload
            const { data: shiftData, error: fetchError } = await supabase.from('shifts').select('*').eq('id', shiftId).single()
            if (fetchError) throw fetchError
            const signed = type === 'egreso' || type === 'pago_proveedor' ? -Math.abs(amount) : Math.abs(amount)
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
            const { error } = await supabase.from('shifts').insert([action.payload])
            if (error) throw error
            break
          }
          case 'CLOSE_SHIFT': {
            const { shiftId, closedAt, closingCounted, closingTheoretical, difference, status, closedBy } = action.payload
            const { data: shiftData, error: fetchError } = await supabase.from('shifts').select('*').eq('id', shiftId).single()
            if (fetchError) throw fetchError
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
    qc.invalidateQueries()
    syncingActionsRef.current = false

    // Check if everything is synced to notify UI
    const remainingSales = useUIStore.getState().offlineSalesQueue.length
    const remainingActions = useUIStore.getState().offlineActionsQueue.length
    if (remainingSales === 0 && remainingActions === 0) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('offline-sync-completed'))
      }
    }
  }, [dequeueOfflineAction, qc])

  const syncAllOfflineData = useCallback(async () => {
    await syncOfflineActions()
    await syncOfflineSales()
  }, [syncOfflineActions, syncOfflineSales])

  // Sync effect when regaining connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      console.log('App regained connection/startup. Syncing offline data...')
      syncAllOfflineData()
    }

    window.addEventListener('online', handleOnline)

    // Run once at startup if we are online and have items in either queue
    const startupSales = useUIStore.getState().offlineSalesQueue.length
    const startupActions = useUIStore.getState().offlineActionsQueue.length
    if (navigator.onLine && (startupSales > 0 || startupActions > 0)) {
      handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [syncAllOfflineData])

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

  const hydrated = !isOnline || (!loadingProducts && !loadingSales && !loadingCustomers && !loadingSuppliers && !loadingShifts && (currentUser?.role === 'administrador' ? !loadingUsers : true))

  // Mutations
  const addProductMutation = useMutation({
    mutationFn: async (p) => {
      const sanitized = sanitizeProduct(p)
      const { data, error } = await supabase.from('products').insert([sanitized]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const updateProductMutation = useMutation({
    mutationFn: async (p) => {
      const sanitized = sanitizeProduct(p)
      const { data, error } = await supabase.from('products').update(sanitized).eq('id', p.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const toggleMostSoldMutation = useMutation({
    mutationFn: async ({ id, isMostSold }) => {
      const { data, error } = await supabase.from('products').update({ isMostSold }).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const openShiftMutation = useMutation({
    mutationFn: async ({ openingAmount, openedBy }) => {
      const shift = {
        id: uid(),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const closeShiftMutation = useMutation({
    mutationFn: async ({ counted, closedBy }) => {
      if (!currentShift) return
      const theoretical = shiftTheoretical(currentShift)
      const closed = {
        ...currentShift,
        closedAt: new Date().toISOString(),
        closingCounted: counted,
        closingTheoretical: theoretical,
        difference: counted - theoretical,
        status: 'closed',
        closedBy,
      }
      const { data, error } = await supabase.from('shifts').update(closed).eq('id', currentShift.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const addMovementMutation = useMutation({
    mutationFn: async ({ type, amount, reason }) => {
      if (!currentShift) return
      const signed = type === 'egreso' || type === 'pago_proveedor' ? -Math.abs(amount) : Math.abs(amount)
      const mov = { id: uid(), date: new Date().toISOString(), type, amount: signed, reason }
      const updated = {
        ...currentShift,
        movements: [...(currentShift.movements || []), mov],
      }
      const { data, error } = await supabase.from('shifts').update(updated).eq('id', currentShift.id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const addCustomerMutation = useMutation({
    mutationFn: async (cust) => {
      const { data, error } = await supabase.from('customers').insert([cust]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const addSupplierMutation = useMutation({
    mutationFn: async (sup) => {
      const { data, error } = await supabase.from('suppliers').insert([sup]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  const receiveGoodsMutation = useMutation({
    mutationFn: async ({ supplierId, amount, detail, paidCash, shiftId }) => {
      const date = new Date().toISOString()
      const { error } = await supabase.rpc('receive_goods_rpc', {
        p_supplier_id: supplierId,
        p_amount: amount,
        p_detail: detail,
        p_paid_cash: paidCash,
        p_date: date,
        p_shift_id: shiftId,
      })
      if (error) throw error
      return { supplierId, amount, detail, paidCash, date, shiftId }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const completeSaleMutation = useMutation({
    mutationFn: async (args) => {
      if (!currentShift) throw new Error('No hay una caja abierta')

      const date = new Date().toISOString()
      
      let cost = 0
      for (const item of args.items) {
        if (item.productId) {
          const prod = products.find((p) => p.id === item.productId)
          if (prod) cost += prod.cost * item.qty
        }
      }

      const saleId = uid()
      const { error } = await supabase.rpc('complete_sale_rpc', {
        p_sale_id: saleId,
        p_items: args.items,
        p_method: args.method,
        p_customer_id: args.customerId || null,
        p_cash_received: args.cashReceived || 0,
        p_change: args.change || 0,
        p_cost: cost,
        p_sold_by: currentUser?.username || 'admin',
        p_date: date,
        p_shift_id: currentShift.id,
      })
      if (error) throw error

      const total = args.items.reduce((sum, i) => sum + i.price * i.qty, 0)
      return {
        id: saleId,
        date,
        items: args.items,
        total,
        method: args.method,
        customerId: args.customerId || null,
        cashReceived: args.cashReceived || 0,
        change: args.change || 0,
        cost,
        soldBy: currentUser?.username || 'admin',
        shiftId: currentShift.id,
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const resetDataMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('products').delete().neq('id', '_none_')
      await supabase.from('sales').delete().neq('id', '_none_')
      await supabase.from('customers').delete().neq('id', '_none_')
      await supabase.from('suppliers').delete().neq('id', '_none_')
      await supabase.from('shifts').delete().neq('id', '_none_')

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
        p_role: role || 'cajero',
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('delete_user', { user_id: id })
      if (error) throw error
      return id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  // Callback wrapper definitions to preserve component APIs
  const addProduct = useCallback((p) => {
    addProductMutation.mutate({ ...p, id: uid() })
  }, [addProductMutation])

  const updateProduct = useCallback((p) => {
    updateProductMutation.mutate(p)
  }, [updateProductMutation])

  const deleteProduct = useCallback((id) => {
    deleteProductMutation.mutate(id)
  }, [deleteProductMutation])

  const adjustStock = useCallback((id, delta) => {
    adjustStockMutation.mutate({ id, delta })
  }, [adjustStockMutation])

  const toggleMostSold = useCallback((id, isMostSold) => {
    toggleMostSoldMutation.mutate({ id, isMostSold })
  }, [toggleMostSoldMutation])

  const openShift = useCallback((openingAmount, openedBy) => {
    if (!isOnline) {
      const shiftId = uid()
      const newShift = {
        id: shiftId,
        openedAt: new Date().toISOString(),
        openingAmount,
        movements: [],
        status: 'open',
        openedBy,
      }
      enqueueOfflineAction({
        id: uid(),
        type: 'OPEN_SHIFT',
        payload: newShift
      })
      qc.setQueryData(['shifts'], (old = []) => [newShift, ...old])
      setCurrentShiftCache(newShift)
    } else {
      openShiftMutation.mutate({ openingAmount, openedBy })
    }
  }, [openShiftMutation, isOnline, enqueueOfflineAction, setCurrentShiftCache, qc])

  const closeShift = useCallback((counted, closedBy) => {
    if (!isOnline) {
      if (currentShift === null) return
      const theoretical = shiftTheoretical(currentShift)
      const closed = {
        shiftId: currentShift.id,
        closedAt: new Date().toISOString(),
        closingCounted: counted,
        closingTheoretical: theoretical,
        difference: counted - theoretical,
        status: 'closed',
        closedBy,
      }
      enqueueOfflineAction({
        id: uid(),
        type: 'CLOSE_SHIFT',
        payload: closed
      })
      qc.setQueryData(['shifts'], (old = []) => {
        return old.map((s) => {
          if (s.id === currentShift.id) {
            return {
              ...s,
              closedAt: closed.closedAt,
              closingCounted: counted,
              closingTheoretical: theoretical,
              difference: closed.difference,
              status: 'closed',
              closedBy,
            }
          }
          return s
        })
      })
      setCurrentShiftCache(null)
    } else {
      closeShiftMutation.mutate({ counted, closedBy })
    }
  }, [closeShiftMutation, isOnline, currentShift, enqueueOfflineAction, setCurrentShiftCache, qc])

  const addMovement = useCallback((type, amount, reason) => {
    if (!isOnline) {
      enqueueOfflineAction({
        id: uid(),
        type: 'ADD_MOVEMENT',
        payload: { type, amount, reason, date: new Date().toISOString(), shiftId: currentShift?.id }
      })
      const signed = type === 'egreso' || type === 'pago_proveedor' ? -Math.abs(amount) : Math.abs(amount)
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
      addMovementMutation.mutate({ type, amount, reason })
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

  const registerCustomerPayment = useCallback((customerId, amount) => {
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
              return {
                ...s,
                movements: [...(s.movements || []), mov]
              }
            }
            return s
          })
        })
      }
      return Promise.resolve(payment)
    } else {
      return registerCustomerPaymentMutation.mutateAsync({ customerId, amount, shiftId })
    }
  }, [registerCustomerPaymentMutation, isOnline, enqueueOfflineAction, currentShift, qc])

  const addSupplier = useCallback((name) => {
    const sup = { id: uid(), name, entries: [] }
    if (!isOnline) {
      enqueueOfflineAction({ id: uid(), type: 'ADD_SUPPLIER', payload: sup })
      qc.setQueryData(['suppliers'], (old = []) => [...old, sup])
    } else {
      addSupplierMutation.mutate(sup)
    }
    return sup
  }, [addSupplierMutation, isOnline, enqueueOfflineAction, qc])

  const receiveGoods = useCallback((supplierId, amount, detail, paidCash) => {
    const shiftId = currentShift?.id || null
    if (!isOnline) {
      const date = new Date().toISOString()
      const goods = { supplierId, amount, detail, paidCash, date, shiftId }
      enqueueOfflineAction({
        id: uid(),
        type: 'RECEIVE_GOODS',
        payload: goods
      })

      // Update suppliers local cache
      qc.setQueryData(['suppliers'], (old = []) => {
        return old.map((s) => {
          if (s.id === supplierId) {
            let entries = [...(s.entries || []), { id: uid(), date, type: 'factura', amount, detail, paidCash }]
            if (paidCash) {
              entries.push({ id: uid(), date, type: 'pago', amount, detail: `Pago contado: ${detail}` })
            }
            return { ...s, entries }
          }
          return s
        })
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
              return {
                ...s,
                movements: [...(s.movements || []), mov]
              }
            }
            return s
          })
        })
      }
      return Promise.resolve(goods)
    } else {
      return receiveGoodsMutation.mutateAsync({ supplierId, amount, detail, paidCash, shiftId })
    }
  }, [receiveGoodsMutation, isOnline, enqueueOfflineAction, currentShift, qc])

  const registerSupplierPayment = useCallback((supplierId, amount, fromCash) => {
    const shiftId = currentShift?.id || null
    if (!isOnline) {
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
              entries: [...(s.entries || []), { id: uid(), date, type: 'pago', amount, detail: 'Pago a proveedor' }]
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
              return {
                ...s,
                movements: [...(s.movements || []), mov]
              }
            }
            return s
          })
        })
      }
      return Promise.resolve(payment)
    } else {
      return registerSupplierPaymentMutation.mutateAsync({ supplierId, amount, fromCash, shiftId })
    }
  }, [registerSupplierPaymentMutation, isOnline, enqueueOfflineAction, currentShift, qc])

  const completeSale = useCallback((args) => {
    const shiftId = currentShift?.id || null

    if (!isOnline) {
      const date = new Date().toISOString()
      const total = args.items.reduce((sum, i) => sum + i.price * i.qty, 0)
      
      let cost = 0
      for (const item of args.items) {
        if (item.productId) {
          const prod = displayedProducts.find((p) => p.id === item.productId)
          if (prod) cost += prod.cost * item.qty
        }
      }

      const sale = {
        id: `off-${uid()}`,
        date,
        items: args.items,
        total,
        method: args.method,
        customerId: args.customerId,
        cashReceived: args.cashReceived,
        change: args.change,
        cost,
        soldBy: currentUser?.username || 'admin',
        isOfflinePending: true,
        shiftId,
      }

      enqueueOfflineSale(sale)

      // Decrement stock locally in cache
      qc.setQueryData(['products'], (oldProducts = []) => {
        return oldProducts.map((p) => {
          const cartItem = args.items.find((item) => item.productId === p.id)
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.qty) }
          }
          return p
        })
      })

      // Register cash shift movement locally
      if (args.method === 'efectivo' && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'venta',
          amount: total,
          reason: `Venta en efectivo (${args.items.length} art.)`,
        }
        qc.setQueryData(['shifts'], (oldShifts = []) => {
          return oldShifts.map((s) => {
            if (s.id === currentShift.id) {
              return {
                ...s,
                movements: [...(s.movements || []), mov]
              }
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
        window.dispatchEvent(new CustomEvent('offline-sale-registered', { detail: sale }))
      }

      return Promise.resolve(sale)
    } else {
      return completeSaleMutation.mutateAsync(args)
    }
  }, [completeSaleMutation, displayedProducts, currentUser, enqueueOfflineSale, currentShift, qc, isOnline])

  const resetData = useCallback(() => {
    resetDataMutation.mutate()
  }, [resetDataMutation])

  const retryFailedSale = useCallback((sale) => {
    dequeueFailedSale(sale.id)
    const cleanSale = { ...sale }
    delete cleanSale.failedAt
    delete cleanSale.error
    enqueueOfflineSale(cleanSale)
    if (navigator.onLine) {
      syncOfflineSales()
    }
  }, [dequeueFailedSale, enqueueOfflineSale, syncOfflineSales])

  const discardFailedSale = useCallback((saleId) => {
    dequeueFailedSale(saleId)
  }, [dequeueFailedSale])

  const retryFailedAction = useCallback((action) => {
    dequeueFailedAction(action.id)
    const cleanAction = { ...action }
    delete cleanAction.failedAt
    delete cleanAction.error
    enqueueOfflineAction(cleanAction)
    if (navigator.onLine) {
      syncOfflineActions()
    }
  }, [dequeueFailedAction, enqueueOfflineAction, syncOfflineActions])

  const discardFailedAction = useCallback((actionId) => {
    dequeueFailedAction(actionId)
  }, [dequeueFailedAction])

  const syncOfflineData = useCallback(() => {
    if (navigator.onLine) {
      syncAllOfflineData()
    }
  }, [syncAllOfflineData])

  const login = useCallback(async (username, password) => {
    const email = `${username.toLowerCase().trim()}@kiosko.com`
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

  // Combine query and Zustand states
  const state = useMemo(() => ({
    products: displayedProducts,
    sales,
    customers,
    suppliers,
    currentShift,
    shiftHistory,
    theme: uiTheme,
    adminPassword,
    isAdminAuthenticated,
    currentUser,
    users,
    failedSalesQueue,
    failedActionsQueue,
    cart,
  }), [
    displayedProducts,
    sales,
    customers,
    suppliers,
    currentShift,
    shiftHistory,
    uiTheme,
    adminPassword,
    isAdminAuthenticated,
    currentUser,
    users,
    failedSalesQueue,
    failedActionsQueue,
    cart,
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
    registerCustomerPayment,
    addSupplier,
    receiveGoods,
    registerSupplierPayment,
    resetData,
    loginAdmin,
    logoutAdmin,
    changeAdminPassword,
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
  }
}
