// Shared cash register movement constants and pure helpers.

// Short labels shown in the cash register timeline.
export const MOVEMENT_LABELS = {
  apertura: 'Apertura',
  venta: 'Venta efectivo',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  cobro_fiado: 'Cobro fiado',
  pago_proveedor: 'Pago proveedor',
}

// Longer labels shown in the admin shift detail modal.
export const MOVEMENT_DETAIL_LABELS = {
  apertura: 'Apertura de Caja',
  venta: 'Venta Efectivo',
  venta_qr: 'Venta QR / Transf.',
  ingreso: 'Ingreso Manual',
  egreso: 'Egreso / Retiro',
  cobro_fiado: 'Cobro de Fiado',
  pago_proveedor: 'Pago a Proveedor',
}

// Movements that mirror a sale (the sale itself is listed instead).
export const SALE_MOVEMENT_TYPES = ['venta', 'venta_qr']
export const MANUAL_IN_MOVEMENT_TYPES = ['ingreso', 'cobro_fiado']
export const MANUAL_OUT_MOVEMENT_TYPES = ['egreso', 'pago_proveedor']

// Shift movements are stored signed: outflows negative, everything else positive.
export function signMovementAmount(type, amount) {
  const value = Math.abs(Number(amount) || 0)
  return MANUAL_OUT_MOVEMENT_TYPES.includes(type) ? -value : value
}
const POSITIVE_MOVEMENT_TYPES = ['apertura', 'venta', 'venta_qr', 'ingreso', 'cobro_fiado']

const UNKNOWN_CASHIER = 'Desconocido'

// Legacy demo usernames mapped to display names.
const USER_DISPLAY_NAMES = {
  admin: 'Administrador',
  cajero: 'Juan Cajero',
  repo: 'Pedro Repositor',
}

export function getMovementDetailLabel(type) {
  return MOVEMENT_DETAIL_LABELS[type] || type
}

export function getCashierDisplayName(openedBy, currentUser) {
  if (!openedBy) return UNKNOWN_CASHIER
  const normalizedOpenedBy = openedBy.toLowerCase().trim()
  const normalizedUsername = currentUser?.username?.toLowerCase()?.trim()
  const normalizedName = currentUser?.name?.toLowerCase()?.trim()
  if (normalizedOpenedBy === normalizedUsername) return currentUser?.name || openedBy
  if (normalizedOpenedBy === normalizedName) return currentUser?.name
  return USER_DISPLAY_NAMES[normalizedOpenedBy] || openedBy
}

export function formatShortId(id, length) {
  return String(id).slice(-length).toUpperCase()
}

const toTime = (date) => new Date(date).getTime()

// Manual movements plus the sales made since the shift opened, newest first.
export function buildShiftTimeline(shift, sales) {
  if (!shift) return []
  const start = toTime(shift.openedAt)
  const movements = (shift.movements || [])
    .filter((m) => !SALE_MOVEMENT_TYPES.includes(m.type))
    .map((m) => ({ ...m, isMovement: true }))
  const shiftSales = (sales || [])
    .filter((s) => toTime(s.date) >= start)
    .map((s) => ({ ...s, isSale: true }))
  return [...movements, ...shiftSales].sort((a, b) => toTime(b.date) - toTime(a.date))
}

export function computeCloseDifference(counted, theoretical) {
  return counted - Math.abs(theoretical)
}

export function isPositiveMovement(mov) {
  return (
    POSITIVE_MOVEMENT_TYPES.includes(mov.type) ||
    (typeof mov.amount === 'number' && mov.amount > 0 && !MANUAL_OUT_MOVEMENT_TYPES.includes(mov.type))
  )
}

export function computeShiftDetailStats({ shift, openingAmount, closingCounted, isOpen }) {
  const movements = shift.movements || []
  let cashSales = 0
  let qrSales = 0
  let manualIn = 0
  let manualOut = 0

  for (const m of movements) {
    if (m.type === 'venta') cashSales += m.amount || 0
    else if (m.type === 'venta_qr') qrSales += m.amount || 0
    else if (MANUAL_IN_MOVEMENT_TYPES.includes(m.type)) manualIn += m.amount || 0
    else if (MANUAL_OUT_MOVEMENT_TYPES.includes(m.type)) manualOut += m.amount || 0
  }

  // Without logged movements, fall back to the shift's cash sales total.
  if (movements.length === 0 && shift.salesCashTotal) {
    cashSales = shift.salesCashTotal
  }

  // manualOut is stored negative, so it is added (not subtracted).
  const theoretical = shift.closingTheoretical ?? openingAmount + cashSales + manualIn + manualOut
  const diff = shift.difference ?? (isOpen ? null : closingCounted - theoretical)

  return { cashSales, qrSales, manualIn, manualOut, theoretical, diff }
}
