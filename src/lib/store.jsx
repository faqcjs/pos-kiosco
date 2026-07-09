import { createContext, useContext, useEffect, useMemo, useCallback } from 'react'
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  // Zustand Local UI state
  const uiTheme = useUIStore((s) => s.theme)
  const adminPassword = useUIStore((s) => s.adminPassword)
  const isAdminAuthenticated = useUIStore((s) => s.isAdminAuthenticated)
  const currentUser = useUIStore((s) => s.currentUser)
  const offlineSalesQueue = useUIStore((s) => s.offlineSalesQueue)
  const productsCache = useUIStore((s) => s.productsCache)
  
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const loginAdmin = useUIStore((s) => s.loginAdmin)
  const logoutAdmin = useUIStore((s) => s.logoutAdmin)
  const changeAdminPassword = useUIStore((s) => s.changeAdminPassword)
  const setCurrentUser = useUIStore((s) => s.setCurrentUser)
  const enqueueOfflineSale = useUIStore((s) => s.enqueueOfflineSale)
  const dequeueOfflineSale = useUIStore((s) => s.dequeueOfflineSale)
  const setProductsCache = useUIStore((s) => s.setProductsCache)

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
    if (offlineSalesQueue.length === 0) return

    console.log(`Syncing ${offlineSalesQueue.length} offline sales...`)
    const queueToProcess = [...offlineSalesQueue]

    for (const sale of queueToProcess) {
      try {
        const { isOfflinePending, ...saleToInsert } = sale
        // 1. Insert sale on server
        const { error: saleError } = await supabase.from('sales').insert([saleToInsert])
        if (saleError) throw saleError

        // 2. Decrement stock on server
        for (const item of sale.items) {
          if (item.productId) {
            const { data: prod, error: prodError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.productId)
              .single()
            if (!prodError && prod) {
              const newStock = Math.max(0, prod.stock - item.qty)
              await supabase.from('products').update({ stock: newStock }).eq('id', item.productId)
            }
          }
        }

        // 3. Register cash shift movement on server
        if (sale.method === 'efectivo') {
          const { data: activeShift, error: shiftError } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .maybeSingle()
          
          if (!shiftError && activeShift) {
            const mov = {
              id: uid(),
              date: sale.date,
              type: 'venta',
              amount: sale.total,
              reason: `Venta en efectivo (${sale.items.length} art.) [Sincronizada]`,
            }
            const updatedShift = {
              ...activeShift,
              movements: [...(activeShift.movements || []), mov]
            }
            await supabase.from('shifts').update(updatedShift).eq('id', activeShift.id)
          }
        }

        // 4. Update customer balance if credit ("fiado")
        if (sale.method === 'fiado' && sale.customerId) {
          const { data: customer, error: custError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', sale.customerId)
            .single()
          
          if (!custError && customer) {
            const detail = sale.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
            const updated = {
              ...customer,
              entries: [...(customer.entries || []), { id: uid(), date: sale.date, type: 'compra', amount: sale.total, detail }],
            }
            await supabase.from('customers').update(updated).eq('id', sale.customerId)
          }
        }

        // Remove successfully synced sale from queue
        dequeueOfflineSale(sale.id)
        console.log(`Synced offline sale: ${sale.id}`)
      } catch (err) {
        console.error(`Failed to sync sale ${sale.id}:`, err)
        break // Stop processing queue to maintain order
      }
    }
    qc.invalidateQueries()
  }, [offlineSalesQueue, dequeueOfflineSale, qc])

  // Sync effect when regaining connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      console.log('App regained connection. Syncing offline sales...')
      syncOfflineSales()
    }

    window.addEventListener('online', handleOnline)

    if (navigator.onLine && offlineSalesQueue.length > 0) {
      handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [syncOfflineSales, offlineSalesQueue.length])

  // Compute shifts states
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.status === 'open') || null
  }, [shifts])

  const shiftHistory = useMemo(() => {
    return shifts.filter((s) => s.status === 'closed')
  }, [shifts])

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine
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
    mutationFn: async ({ customerId, amount }) => {
      const date = new Date().toISOString()
      const customer = customers.find((c) => c.id === customerId)
      if (!customer) throw new Error('Customer not found')
      const updated = {
        ...customer,
        entries: [...(customer.entries || []), { id: uid(), date, type: 'pago', amount, detail: 'Pago de deuda' }],
      }
      await supabase.from('customers').update(updated).eq('id', customerId)

      if (currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'cobro_fiado',
          amount: Math.abs(amount),
          reason: `Cobro de fiado - ${customer.name}`,
        }
        const updatedShift = {
          ...currentShift,
          movements: [...(currentShift.movements || []), mov],
        }
        await supabase.from('shifts').update(updatedShift).eq('id', currentShift.id)
      }
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
    mutationFn: async ({ supplierId, amount, detail, paidCash }) => {
      const date = new Date().toISOString()
      const supplier = suppliers.find((x) => x.id === supplierId)
      if (!supplier) throw new Error('Supplier not found')

      let entries = [...(supplier.entries || []), { id: uid(), date, type: 'factura', amount, detail, paidCash }]
      if (paidCash) {
        entries.push({ id: uid(), date, type: 'pago', amount, detail: `Pago contado: ${detail}` })
      }

      await supabase.from('suppliers').update({ entries }).eq('id', supplierId)

      if (paidCash && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'pago_proveedor',
          amount: -Math.abs(amount),
          reason: `Pago contado - ${supplier.name}`,
        }
        const updatedShift = {
          ...currentShift,
          movements: [...(currentShift.movements || []), mov],
        }
        await supabase.from('shifts').update(updatedShift).eq('id', currentShift.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const registerSupplierPaymentMutation = useMutation({
    mutationFn: async ({ supplierId, amount, fromCash }) => {
      const date = new Date().toISOString()
      const supplier = suppliers.find((x) => x.id === supplierId)
      if (!supplier) throw new Error('Supplier not found')

      const updated = {
        ...supplier,
        entries: [...(supplier.entries || []), { id: uid(), date, type: 'pago', amount, detail: 'Pago a proveedor' }],
      }
      await supabase.from('suppliers').update(updated).eq('id', supplierId)

      if (fromCash && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'pago_proveedor',
          amount: -Math.abs(amount),
          reason: `Pago a proveedor - ${supplier.name}`,
        }
        const updatedShift = {
          ...currentShift,
          movements: [...(currentShift.movements || []), mov],
        }
        await supabase.from('shifts').update(updatedShift).eq('id', currentShift.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['shifts'] })
    },
  })

  const completeSaleMutation = useMutation({
    mutationFn: async (args) => {
      if (!currentShift) return

      const date = new Date().toISOString()
      const total = args.items.reduce((sum, i) => sum + i.price * i.qty, 0)
      
      let cost = 0
      for (const item of args.items) {
        if (item.productId) {
          const prod = products.find((p) => p.id === item.productId)
          if (prod) cost += prod.cost * item.qty
        }
      }

      const sale = {
        id: uid(),
        date,
        items: args.items,
        total,
        method: args.method,
        customerId: args.customerId,
        cashReceived: args.cashReceived,
        change: args.change,
        cost,
        soldBy: currentUser?.username || 'admin',
      }

      // 1. Insert sale
      await supabase.from('sales').insert([sale])

      // 2. Decrement stocks
      for (const item of args.items) {
        if (item.productId) {
          const prod = products.find((p) => p.id === item.productId)
          if (prod) {
            const newStock = Math.max(0, prod.stock - item.qty)
            await supabase.from('products').update({ stock: newStock }).eq('id', item.productId)
          }
        }
      }

      // 3. Register cash shift movement if paid in cash
      if (args.method === 'efectivo' && currentShift) {
        const mov = {
          id: uid(),
          date,
          type: 'venta',
          amount: total,
          reason: `Venta en efectivo (${args.items.length} art.)`,
        }
        const updatedShift = {
          ...currentShift,
          movements: [...(currentShift.movements || []), mov],
        }
        await supabase.from('shifts').update(updatedShift).eq('id', currentShift.id)
      }

      // 4. Update customer balance if credit ("fiado")
      if (args.method === 'fiado' && args.customerId) {
        const customer = customers.find((c) => c.id === args.customerId)
        if (customer) {
          const detail = args.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
          const updated = {
            ...customer,
            entries: [...(customer.entries || []), { id: uid(), date, type: 'compra', amount: total, detail }],
          }
          await supabase.from('customers').update(updated).eq('id', args.customerId)
        }
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
    openShiftMutation.mutate({ openingAmount, openedBy })
  }, [openShiftMutation])

  const closeShift = useCallback((counted, closedBy) => {
    closeShiftMutation.mutate({ counted, closedBy })
  }, [closeShiftMutation])

  const addMovement = useCallback((type, amount, reason) => {
    addMovementMutation.mutate({ type, amount, reason })
  }, [addMovementMutation])

  const addCustomer = useCallback((name, phone) => {
    const cust = { id: uid(), name, phone, entries: [] }
    addCustomerMutation.mutate(cust)
    return cust
  }, [addCustomerMutation])

  const registerCustomerPayment = useCallback((customerId, amount) => {
    registerCustomerPaymentMutation.mutate({ customerId, amount })
  }, [registerCustomerPaymentMutation])

  const addSupplier = useCallback((name) => {
    const sup = { id: uid(), name, entries: [] }
    addSupplierMutation.mutate(sup)
    return sup
  }, [addSupplierMutation])

  const receiveGoods = useCallback((supplierId, amount, detail, paidCash) => {
    receiveGoodsMutation.mutate({ supplierId, amount, detail, paidCash })
  }, [receiveGoodsMutation])

  const registerSupplierPayment = useCallback((supplierId, amount, fromCash) => {
    registerSupplierPaymentMutation.mutate({ supplierId, amount, fromCash })
  }, [registerSupplierPaymentMutation])

  const completeSale = useCallback((args) => {
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine

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

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('offline-sale-registered', { detail: sale }))
      }
    } else {
      completeSaleMutation.mutate(args)
    }
  }, [completeSaleMutation, displayedProducts, currentUser, enqueueOfflineSale, currentShift, qc])

  const resetData = useCallback(() => {
    resetDataMutation.mutate()
  }, [resetDataMutation])

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
  }
}
