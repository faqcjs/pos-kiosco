// Shared constants used across the store and the POS components.

// Purchases registered without a supplier
export const DIRECT_PURCHASE_SUPPLIER_ID = 'compra_directa'
export const DIRECT_PURCHASE_SUPPLIER_NAME = 'Compra Directa'
export const DIRECT_PURCHASES_STORAGE_KEY = 'kiosko_direct_purchases'
export const DIRECT_PURCHASE_SUPPLIER_CATEGORY = 'General'

// Category used when a product or supplier has none
export const DEFAULT_CATEGORY = 'Varios'

// Seller recorded when no user is logged in
export const DEFAULT_SELLER_USERNAME = 'admin'

// Prefix of sale ids created while offline
export const OFFLINE_SALE_ID_PREFIX = 'off-'

// Window events dispatched by the store for the UI
export const OFFLINE_SYNC_COMPLETED_EVENT = 'offline-sync-completed'
export const OFFLINE_SALE_REGISTERED_EVENT = 'offline-sale-registered'

// User roles (must match the users.role CHECK constraint in Supabase)
export const ROLES = Object.freeze({
  ADMIN: 'administrador',
  CASHIER: 'cajero',
  STOCKER: 'repositor',
})

// Persisted UI state (Zustand persist)
export const UI_STATE_STORAGE_KEY = 'kiosko-pos-ui-state'

// Usernames are mapped to Supabase Auth emails with this domain
export const AUTH_EMAIL_DOMAIN = '@kiosko.com'

// PostgREST error code when a table does not exist (hand-run patch not applied yet)
export const PGRST_TABLE_NOT_FOUND = 'PGRST205'

// Supabase returns at most 1000 rows per request
export const SUPABASE_PAGE_SIZE = 1000
