'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppState,
  CartItem,
  CashMovement,
  CashShift,
  Customer,
  MovementType,
  PaymentMethod,
  Product,
  Sale,
  Supplier,
} from './types'
import { uid } from './format'
import { SEED_CUSTOMERS, SEED_PRODUCTS, SEED_SUPPLIERS } from './seed'

const STORAGE_KEY = 'kiosko-pos-state-v1'

function initialState(): AppState {
  return {
    products: SEED_PRODUCTS,
    sales: [],
    customers: SEED_CUSTOMERS,
    suppliers: SEED_SUPPLIERS,
    currentShift: null,
    shiftHistory: [],
    theme: 'light',
    adminPassword: 'admin123',
    isAdminAuthenticated: false,
  }
}

// ---------- selectors ----------
export function customerBalance(c: Customer): number {
  return c.entries.reduce((sum, e) => sum + (e.type === 'compra' ? e.amount : -e.amount), 0)
}

export function supplierBalance(s: Supplier): number {
  return s.entries.reduce((sum, e) => sum + (e.type === 'factura' ? e.amount : -e.amount), 0)
}

export function shiftTheoretical(shift: CashShift): number {
  return shift.openingAmount + shift.movements.reduce((sum, m) => sum + m.amount, 0)
}

export function shiftTotals(shift: CashShift, sales: Sale[]) {
  let cashSales = 0
  let manualIn = 0
  let manualOut = 0
  for (const m of shift.movements) {
    if (m.type === 'venta') cashSales += m.amount
    else if (m.type === 'ingreso' || m.type === 'cobro_fiado') manualIn += m.amount
    else if (m.type === 'egreso' || m.type === 'pago_proveedor') manualOut += m.amount
  }

  const start = new Date(shift.openedAt).getTime()
  const end = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now()
  const qrSales = sales
    .filter((s) => {
      const t = new Date(s.date).getTime()
      return s.method === 'qr' && t >= start && t <= end
    })
    .reduce((sum, s) => sum + s.total, 0)

  return { cashSales, manualIn, manualOut, qrSales }
}

// ---------- context ----------
interface StoreContextValue {
  state: AppState
  hydrated: boolean
  toggleTheme: () => void
  // products
  addProduct: (p: Omit<Product, 'id'>) => void
  updateProduct: (p: Product) => void
  deleteProduct: (id: string) => void
  adjustStock: (id: string, delta: number) => void
  // sales
  completeSale: (args: {
    items: CartItem[]
    method: PaymentMethod
    customerId?: string
    cashReceived?: number
    change?: number
  }) => void
  // caja
  openShift: (openingAmount: number, openedBy: string) => void
  closeShift: (counted: number, closedBy: string) => void
  addMovement: (type: MovementType, amount: number, reason: string) => void
  // customers
  addCustomer: (name: string, phone: string) => Customer
  registerCustomerPayment: (customerId: string, amount: number) => void
  // suppliers
  addSupplier: (name: string) => Supplier
  receiveGoods: (supplierId: string, amount: number, detail: string, paidCash: boolean) => void
  registerSupplierPayment: (supplierId: string, amount: number, fromCash: boolean) => void
  resetData: () => void
  loginAdmin: (password: string) => boolean
  logoutAdmin: () => void
  changeAdminPassword: (newPassword: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [hydrated, setHydrated] = useState(false)
  const firstLoad = useRef(true)

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppState
        setState({ ...initialState(), ...parsed })
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // persist
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, hydrated])

  // apply theme class
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [state.theme])

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
  }, [])

  const addProduct = useCallback((p: Omit<Product, 'id'>) => {
    setState((s) => ({ ...s, products: [...s.products, { ...p, id: uid() }] }))
  }, [])

  const updateProduct = useCallback((p: Product) => {
    setState((s) => ({ ...s, products: s.products.map((x) => (x.id === p.id ? p : x)) }))
  }, [])

  const deleteProduct = useCallback((id: string) => {
    setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== id) }))
  }, [])

  const adjustStock = useCallback((id: string, delta: number) => {
    setState((s) => ({
      ...s,
      products: s.products.map((x) =>
        x.id === id ? { ...x, stock: Math.max(0, x.stock + delta) } : x,
      ),
    }))
  }, [])

  const completeSale = useCallback(
    (args: {
      items: CartItem[]
      method: PaymentMethod
      customerId?: string
      cashReceived?: number
      change?: number
    }) => {
      setState((s) => {
        const total = args.items.reduce((sum, i) => sum + i.price * i.qty, 0)
        // compute cost of goods
        let cost = 0
        for (const item of args.items) {
          if (item.productId) {
            const prod = s.products.find((p) => p.id === item.productId)
            if (prod) cost += prod.cost * item.qty
          }
        }
        const sale: Sale = {
          id: uid(),
          date: new Date().toISOString(),
          items: args.items,
          total,
          method: args.method,
          customerId: args.customerId,
          cashReceived: args.cashReceived,
          change: args.change,
          cost,
        }

        // decrement stock
        const products = s.products.map((p) => {
          const soldQty = args.items
            .filter((i) => i.productId === p.id)
            .reduce((q, i) => q + i.qty, 0)
          return soldQty ? { ...p, stock: Math.max(0, p.stock - soldQty) } : p
        })

        let currentShift = s.currentShift
        let customers = s.customers

        if (args.method === 'efectivo' && currentShift && currentShift.status === 'open') {
          const mov: CashMovement = {
            id: uid(),
            date: sale.date,
            type: 'venta',
            amount: total,
            reason: `Venta en efectivo (${args.items.length} art.)`,
          }
          currentShift = { ...currentShift, movements: [...currentShift.movements, mov] }
        }

        if (args.method === 'fiado' && args.customerId) {
          const detail = args.items.map((i) => `${i.qty}x ${i.name}`).join(', ')
          customers = s.customers.map((c) =>
            c.id === args.customerId
              ? {
                  ...c,
                  entries: [
                    ...c.entries,
                    { id: uid(), date: sale.date, type: 'compra', amount: total, detail },
                  ],
                }
              : c,
          )
        }

        return { ...s, sales: [sale, ...s.sales], products, currentShift, customers }
      })
    },
    [],
  )

  const openShift = useCallback((openingAmount: number, openedBy: string) => {
    setState((s) => {
      const shift: CashShift = {
        id: uid(),
        openedAt: new Date().toISOString(),
        openingAmount,
        movements: [],
        status: 'open',
        openedBy,
      }
      return { ...s, currentShift: shift }
    })
  }, [])

  const closeShift = useCallback((counted: number, closedBy: string) => {
    setState((s) => {
      if (!s.currentShift) return s
      const theoretical = shiftTheoretical(s.currentShift)
      const closed: CashShift = {
        ...s.currentShift,
        closedAt: new Date().toISOString(),
        closingCounted: counted,
        closingTheoretical: theoretical,
        difference: counted - theoretical,
        status: 'closed',
        closedBy,
      }
      return { ...s, currentShift: null, shiftHistory: [closed, ...s.shiftHistory] }
    })
  }, [])

  const addMovement = useCallback((type: MovementType, amount: number, reason: string) => {
    setState((s) => {
      if (!s.currentShift) return s
      const signed = type === 'egreso' || type === 'pago_proveedor' ? -Math.abs(amount) : Math.abs(amount)
      const mov: CashMovement = { id: uid(), date: new Date().toISOString(), type, amount: signed, reason }
      return {
        ...s,
        currentShift: { ...s.currentShift, movements: [...s.currentShift.movements, mov] },
      }
    })
  }, [])

  const addCustomer = useCallback((name: string, phone: string) => {
    const customer: Customer = { id: uid(), name, phone, entries: [] }
    setState((s) => ({ ...s, customers: [...s.customers, customer] }))
    return customer
  }, [])

  const registerCustomerPayment = useCallback((customerId: string, amount: number) => {
    setState((s) => {
      const date = new Date().toISOString()
      const customers = s.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              entries: [...c.entries, { id: uid(), date, type: 'pago' as const, amount, detail: 'Pago de deuda' }],
            }
          : c,
      )
      let currentShift = s.currentShift
      if (currentShift && currentShift.status === 'open') {
        const cust = s.customers.find((c) => c.id === customerId)
        const mov: CashMovement = {
          id: uid(),
          date,
          type: 'cobro_fiado',
          amount: Math.abs(amount),
          reason: `Cobro de fiado${cust ? ` - ${cust.name}` : ''}`,
        }
        currentShift = { ...currentShift, movements: [...currentShift.movements, mov] }
      }
      return { ...s, customers, currentShift }
    })
  }, [])

  const addSupplier = useCallback((name: string) => {
    const supplier: Supplier = { id: uid(), name, entries: [] }
    setState((s) => ({ ...s, suppliers: [...s.suppliers, supplier] }))
    return supplier
  }, [])

  const receiveGoods = useCallback(
    (supplierId: string, amount: number, detail: string, paidCash: boolean) => {
      setState((s) => {
        const date = new Date().toISOString()
        let suppliers = s.suppliers.map((sup) =>
          sup.id === supplierId
            ? {
                ...sup,
                entries: [
                  ...sup.entries,
                  { id: uid(), date, type: 'factura' as const, amount, detail, paidCash },
                ],
              }
            : sup,
        )
        let currentShift = s.currentShift
        if (paidCash) {
          // if paid cash, also register the payment entry so balance stays 0 for this invoice
          suppliers = suppliers.map((sup) =>
            sup.id === supplierId
              ? {
                  ...sup,
                  entries: [
                    ...sup.entries,
                    { id: uid(), date, type: 'pago' as const, amount, detail: `Pago contado: ${detail}` },
                  ],
                }
              : sup,
          )
          if (currentShift && currentShift.status === 'open') {
            const sup = s.suppliers.find((x) => x.id === supplierId)
            const mov: CashMovement = {
              id: uid(),
              date,
              type: 'pago_proveedor',
              amount: -Math.abs(amount),
              reason: `Pago contado${sup ? ` - ${sup.name}` : ''}`,
            }
            currentShift = { ...currentShift, movements: [...currentShift.movements, mov] }
          }
        }
        return { ...s, suppliers, currentShift }
      })
    },
    [],
  )

  const registerSupplierPayment = useCallback(
    (supplierId: string, amount: number, fromCash: boolean) => {
      setState((s) => {
        const date = new Date().toISOString()
        const suppliers = s.suppliers.map((sup) =>
          sup.id === supplierId
            ? {
                ...sup,
                entries: [...sup.entries, { id: uid(), date, type: 'pago' as const, amount, detail: 'Pago a proveedor' }],
              }
            : sup,
        )
        let currentShift = s.currentShift
        if (fromCash && currentShift && currentShift.status === 'open') {
          const sup = s.suppliers.find((x) => x.id === supplierId)
          const mov: CashMovement = {
            id: uid(),
            date,
            type: 'pago_proveedor',
            amount: -Math.abs(amount),
            reason: `Pago a proveedor${sup ? ` - ${sup.name}` : ''}`,
          }
          currentShift = { ...currentShift, movements: [...currentShift.movements, mov] }
        }
        return { ...s, suppliers, currentShift }
      })
    },
    [],
  )

  const resetData = useCallback(() => {
    setState((s) => ({ ...initialState(), theme: s.theme }))
  }, [])

  const loginAdmin = useCallback((password: string) => {
    let success = false
    setState((s) => {
      if (password === (s.adminPassword || 'admin123')) {
        success = true
        return { ...s, isAdminAuthenticated: true }
      }
      return s
    })
    return success
  }, [])

  const logoutAdmin = useCallback(() => {
    setState((s) => ({ ...s, isAdminAuthenticated: false }))
  }, [])

  const changeAdminPassword = useCallback((newPassword: string) => {
    if (!newPassword || newPassword.trim().length === 0) return
    setState((s) => ({ ...s, adminPassword: newPassword }))
  }, [])

  const value = useMemo<StoreContextValue>(
    () => ({
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
    }),
    [
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
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
