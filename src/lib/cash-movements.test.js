import { describe, it, expect } from 'vitest'
import {
  signMovementAmount,
  MOVEMENT_LABELS,
  MOVEMENT_DETAIL_LABELS,
  buildShiftTimeline,
  computeCloseDifference,
  computeShiftDetailStats,
  formatShortId,
  getCashierDisplayName,
  getMovementDetailLabel,
  isPositiveMovement,
} from './cash-movements'

describe('movement labels', () => {
  it('keeps the cash register labels', () => {
    expect(MOVEMENT_LABELS).toEqual({
      apertura: 'Apertura',
      venta: 'Venta efectivo',
      ingreso: 'Ingreso',
      egreso: 'Egreso',
      cobro_fiado: 'Cobro fiado',
      pago_proveedor: 'Pago proveedor',
    })
  })

  it('keeps the shift detail labels', () => {
    expect(MOVEMENT_DETAIL_LABELS).toEqual({
      apertura: 'Apertura de Caja',
      venta: 'Venta Efectivo',
      venta_qr: 'Venta QR / Transf.',
      ingreso: 'Ingreso Manual',
      egreso: 'Egreso / Retiro',
      cobro_fiado: 'Cobro de Fiado',
      pago_proveedor: 'Pago a Proveedor',
    })
  })

  it('falls back to the raw type for unknown detail labels', () => {
    expect(getMovementDetailLabel('egreso')).toBe('Egreso / Retiro')
    expect(getMovementDetailLabel('otro')).toBe('otro')
  })
})

describe('getCashierDisplayName', () => {
  const currentUser = { username: 'facu', name: 'Facundo' }

  it('returns Desconocido when nobody opened the shift', () => {
    expect(getCashierDisplayName(null, currentUser)).toBe('Desconocido')
  })

  it('resolves the current user by username or name', () => {
    expect(getCashierDisplayName(' FACU ', currentUser)).toBe('Facundo')
    expect(getCashierDisplayName('facundo', currentUser)).toBe('Facundo')
  })

  it('resolves legacy demo users and otherwise echoes the raw value', () => {
    expect(getCashierDisplayName('cajero', currentUser)).toBe('Juan Cajero')
    expect(getCashierDisplayName('Maria', currentUser)).toBe('Maria')
  })
})

describe('formatShortId', () => {
  it('uppercases the last characters of the id', () => {
    expect(formatShortId('abc-12ef', 4)).toBe('12EF')
    expect(formatShortId(123456789, 6)).toBe('456789')
  })
})

describe('buildShiftTimeline', () => {
  it('merges manual movements and shift sales, newest first, skipping sale movements', () => {
    const shift = {
      openedAt: '2026-01-01T10:00:00Z',
      movements: [
        { id: 'm1', type: 'apertura', amount: 100, date: '2026-01-01T10:00:00Z' },
        { id: 'm2', type: 'venta', amount: 50, date: '2026-01-01T10:05:00Z' },
        { id: 'm3', type: 'venta_qr', amount: 30, date: '2026-01-01T10:06:00Z' },
        { id: 'm4', type: 'egreso', amount: -20, date: '2026-01-01T10:30:00Z' },
      ],
    }
    const sales = [
      { id: 's0', date: '2026-01-01T09:00:00Z' },
      { id: 's1', date: '2026-01-01T10:05:00Z' },
    ]
    const timeline = buildShiftTimeline(shift, sales)
    expect(timeline.map((i) => i.id)).toEqual(['m4', 's1', 'm1'])
    expect(timeline[0].isMovement).toBe(true)
    expect(timeline[1].isSale).toBe(true)
  })

  it('returns an empty list without a shift', () => {
    expect(buildShiftTimeline(null, [])).toEqual([])
  })
})

describe('computeCloseDifference', () => {
  it('compares the counted amount against the absolute theoretical total', () => {
    expect(computeCloseDifference(120, 100)).toBe(20)
    expect(computeCloseDifference(80, -100)).toBe(-20)
  })
})

describe('isPositiveMovement', () => {
  it('treats incoming movement types as positive', () => {
    for (const type of ['apertura', 'venta', 'venta_qr', 'ingreso', 'cobro_fiado']) {
      expect(isPositiveMovement({ type, amount: -1 })).toBe(true)
    }
  })

  it('treats egresos and supplier payments as negative', () => {
    expect(isPositiveMovement({ type: 'egreso', amount: 10 })).toBe(false)
    expect(isPositiveMovement({ type: 'pago_proveedor', amount: 10 })).toBe(false)
  })

  it('uses the amount sign for unknown types', () => {
    expect(isPositiveMovement({ type: 'otro', amount: 10 })).toBe(true)
    expect(isPositiveMovement({ type: 'otro', amount: -10 })).toBe(false)
  })
})

describe('computeShiftDetailStats', () => {
  const movements = [
    { type: 'apertura', amount: 1000 },
    { type: 'venta', amount: 500 },
    { type: 'venta_qr', amount: 300 },
    { type: 'ingreso', amount: 200 },
    { type: 'cobro_fiado', amount: 100 },
    { type: 'egreso', amount: -150 },
    { type: 'pago_proveedor', amount: -50 },
  ]

  it('sums movements by kind', () => {
    const stats = computeShiftDetailStats({
      shift: { movements, closingTheoretical: 1800, difference: 0 },
      openingAmount: 1000,
      closingCounted: 1800,
      isOpen: false,
    })
    expect(stats).toEqual({
      cashSales: 500,
      qrSales: 300,
      manualIn: 300,
      manualOut: -200,
      theoretical: 1800,
      diff: 0,
    })
  })

  it('current behavior pending T0: the fallback theoretical adds egresos back because manualOut is negative', () => {
    const stats = computeShiftDetailStats({
      shift: { movements },
      openingAmount: 1000,
      closingCounted: 1600,
      isOpen: false,
    })
    // 1000 + 500 + 300 - (-200) = 2000
    expect(stats.theoretical).toBe(2000)
    expect(stats.diff).toBe(-400)
  })

  it('uses salesCashTotal when no movements were logged and leaves diff null while open', () => {
    const stats = computeShiftDetailStats({
      shift: { salesCashTotal: 700 },
      openingAmount: 100,
      closingCounted: 0,
      isOpen: true,
    })
    expect(stats.cashSales).toBe(700)
    expect(stats.theoretical).toBe(800)
    expect(stats.diff).toBeNull()
  })
})

describe('signMovementAmount', () => {
  it('stores outflows (egreso, pago_proveedor) as negative', () => {
    expect(signMovementAmount('egreso', 500)).toBe(-500)
    expect(signMovementAmount('pago_proveedor', -300)).toBe(-300)
  })

  it('stores every other movement as positive', () => {
    expect(signMovementAmount('ingreso', -200)).toBe(200)
    expect(signMovementAmount('cobro_fiado', 100)).toBe(100)
  })
})
