export type Category = 'Bebidas' | 'Golosinas' | 'Snacks' | 'Tabaquería' | 'Helados' | 'Varios'

export const CATEGORIES: Category[] = [
  'Bebidas',
  'Golosinas',
  'Snacks',
  'Tabaquería',
  'Helados',
  'Varios',
]

export const CATEGORY_ICON: Record<Category, string> = {
  Bebidas: '🥤',
  Golosinas: '🍬',
  Snacks: '🍿',
  Tabaquería: '🚬',
  Helados: '🍦',
  Varios: '📦',
}

export interface Product {
  id: string
  barcode: string
  name: string
  category: Category
  cost: number
  price: number
  stock: number
  minStock: number
}

export interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  productId?: string // undefined for quick manual amounts
}

export type PaymentMethod = 'efectivo' | 'qr' | 'fiado'

export interface Sale {
  id: string
  date: string // ISO
  items: CartItem[]
  total: number
  method: PaymentMethod
  customerId?: string
  cashReceived?: number
  change?: number
  cost: number // total cost of goods sold (for margin)
}

export type MovementType = 'apertura' | 'venta' | 'ingreso' | 'egreso' | 'cobro_fiado' | 'pago_proveedor'

export interface CashMovement {
  id: string
  date: string
  type: MovementType
  amount: number // positive for in, negative for out
  reason: string
}

export interface CashShift {
  id: string
  openedAt: string
  closedAt?: string
  openingAmount: number
  movements: CashMovement[]
  closingCounted?: number
  closingTheoretical?: number
  difference?: number
  status: 'open' | 'closed'
  openedBy?: string
  closedBy?: string
}

export interface CustomerEntry {
  id: string
  date: string
  type: 'compra' | 'pago'
  amount: number
  detail: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  entries: CustomerEntry[]
}

export interface SupplierEntry {
  id: string
  date: string
  type: 'factura' | 'pago'
  amount: number
  detail: string
  paidCash?: boolean
}

export interface Supplier {
  id: string
  name: string
  entries: SupplierEntry[]
}

export interface AppState {
  products: Product[]
  sales: Sale[]
  customers: Customer[]
  suppliers: Supplier[]
  currentShift: CashShift | null
  shiftHistory: CashShift[]
  theme: 'light' | 'dark'
  adminPassword?: string
  isAdminAuthenticated?: boolean
}
