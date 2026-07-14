'use client'

import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  History,
  Lock,
  LockOpen,
  Wallet,
  ShoppingCart,
  NotebookPen,
  QrCode,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input, Label, Modal, Select, StatCard } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { formatDateTime, formatTime, money } from '@/lib/format'
import { shiftTheoretical, shiftTotals, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const USER_DISPLAY_NAMES = {
  admin: 'Administrador',
  cajero: 'Juan Cajero',
  repo: 'Pedro Repositor',
}

export function getCashierDisplayName(openedBy, currentUser) {
  if (!openedBy) return 'Desconocido'
  const normalizedOpenedBy = openedBy.toLowerCase().trim()
  const normalizedUsername = currentUser?.username?.toLowerCase()?.trim()
  const normalizedName = currentUser?.name?.toLowerCase()?.trim()
  if (normalizedOpenedBy === normalizedUsername) return currentUser?.name || openedBy
  if (normalizedOpenedBy === normalizedName) return currentUser?.name
  return USER_DISPLAY_NAMES[normalizedOpenedBy] || openedBy
}

const MOV_LABEL = {
  apertura: 'Apertura',
  venta: 'Venta efectivo',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  cobro_fiado: 'Cobro fiado',
  pago_proveedor: 'Pago proveedor',
}

export function Caja() {
  const { state, openShift, closeShift, addMovement, openShiftPending, closeShiftPending } = useStore()
  const toast = useToast()
  const shift = state.currentShift

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-1.5 lg:p-6">
      <PageHeader title="Caja" description="Control del flujo de efectivo por turno." />
      {shift ? (
        <OpenShiftView shift={shift} onClose={closeShift} onMovement={addMovement} toast={toast} closeShiftPending={closeShiftPending} />
      ) : (
        <ClosedShiftView onOpen={openShift} toast={toast} currentUser={state.currentUser} openShiftPending={openShiftPending} />
      )}
      <ShiftHistory history={state.shiftHistory} />
    </div>
  )
}

function ClosedShiftView({
  onOpen,
  toast,
  currentUser,
  openShiftPending,
}) {
  const [amount, setAmount] = useState('')
  const [cashierName, setCashierName] = useState('')
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="size-7" />
      </div>
      <div>
        <h2 className="font-heading text-lg font-bold">La caja está cerrada</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Ingresá tu nombre y el monto de efectivo inicial en caja para abrir el turno.
        </p>
      </div>
      <div className="w-full max-w-xs text-left space-y-3">
        <div>
          <Label htmlFor="cashier-name">Nombre del cajero/a</Label>
          <Input
            id="cashier-name"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            placeholder="Ej: Juan"
            required
          />
        </div>
        <div>
          <Label htmlFor="opening">Monto de apertura</Label>
          <Input
            id="opening"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>
      <Button
        className="h-12 w-full max-w-xs bg-success text-base font-bold text-success-foreground hover:bg-success/90"
        disabled={openShiftPending || !cashierName.trim()}
        onClick={() => {
          const n = Number(amount)
          if (n < 0 || Number.isNaN(n)) return
          onOpen(n, cashierName.trim())
          toast('Caja abierta')
          setAmount('')
          setCashierName('')
        }}
      >
        <LockOpen className="size-5" />
        Abrir caja
      </Button>
    </Card>
  )
}

function OpenShiftView({
  shift,
  onClose,
  onMovement,
  toast,
  closeShiftPending,
}) {
  const { state } = useStore()
  const { cashSales, manualIn, manualOut, qrSales } = useMemo(
    () => shiftTotals(shift, state.sales),
    [shift, state.sales]
  )
  const theoretical = useMemo(() => shiftTheoretical(shift), [shift])
  const shiftOpName = getCashierDisplayName(shift.openedBy, state.currentUser)

  const [movType, setMovType] = useState('ingreso')
  const [movAmount, setMovAmount] = useState('')
  const [movReason, setMovReason] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [counted, setCounted] = useState('')
  const [closeCashierName, setCloseCashierName] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)

  const shiftSales = useMemo(() => {
    if (!shift) return []
    const start = new Date(shift.openedAt).getTime()
    return (state.sales || []).filter((s) => {
      const t = new Date(s.date).getTime()
      return t >= start
    })
  }, [shift, state.sales])

  const timeline = useMemo(() => {
    if (!shift) return []
    const movs = (shift.movements || [])
      .filter((m) => m.type !== 'venta' && m.type !== 'venta_qr')
      .map((m) => ({
        ...m,
        isMovement: true,
      }))
    const sls = shiftSales.map((s) => ({
      ...s,
      isSale: true,
    }))
    return [...movs, ...sls].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [shift, shiftSales])

  function submitMovement() {
    const n = Number(movAmount)
    if (!n || n <= 0 || !movReason.trim()) {
      toast('Completá monto y motivo', 'error')
      return
    }
    onMovement(movType, n, movReason.trim())
    toast(movType === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
    setMovAmount('')
    setMovReason('')
  }

  const countedNum = Number(counted)
  const diff = countedNum - Math.abs(theoretical)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="success" className="text-xs">
          <span className="size-2 animate-pulse rounded-full bg-success" />
          Turno abierto por{' '}
          <span className="max-w-[12ch] truncate inline-block align-bottom">{shiftOpName || 'Desconocido'}</span>{' '}
          desde {formatTime(shift.openedAt)}
        </Badge>
        <Button variant="destructive" size="sm" onClick={() => setCloseOpen(true)}>
          <Lock className="size-4" />
          Cerrar caja
        </Button>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Apertura" value={money(shift.openingAmount)} icon={<Wallet className="size-4" />} className="p-3" />
        <StatCard label="Ventas efectivo" value={money(cashSales)} tone="success" sub="Ventas en caja" className="p-3" />
        <StatCard label="Ventas QR/Trans." value={money(qrSales)} tone="success" sub="Dinero digital" className="p-3" />
        <StatCard label="Ingresos" value={money(manualIn)} tone="success" className="p-3" />
        <StatCard label="Egresos" value={money(manualOut)} tone="danger" className="p-3" />
        <StatCard
          label="Total teórico"
          value={money(theoretical)}
          tone="accent"
          sub="Saldo estimado"
          className="p-3"
        />
      </div>

      {/* register movement */}
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Registrar movimiento</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="movtype">Tipo</Label>
            <Select
              id="movtype"
              value={movType}
              onChange={(e) => setMovType(e.target.value)}
            >
              <option value="ingreso">Ingreso (+)</option>
              <option value="egreso">Egreso (-)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="movamount">Monto</Label>
            <Input
              id="movamount"
              type="number"
              inputMode="numeric"
              value={movAmount}
              onChange={(e) => setMovAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="movreason">Motivo</Label>
            <Input
              id="movreason"
              value={movReason}
              onChange={(e) => setMovReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitMovement()
              }}
              placeholder="Ej: pago delivery"
            />
          </div>
          <Button className="h-11 w-full sm:w-auto" onClick={submitMovement}>
            Registrar
          </Button>
        </div>
      </Card>

      {/* history */}
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Historial del turno</h3>
        <div className="mt-3 space-y-2">
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos aún.</p>
          ) : (
            timeline.map((item) => {
              if (item.isMovement) {
                const positive = item.amount >= 0
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {positive ? (
                        <ArrowUpCircle className="size-4.5" />
                      ) : (
                        <ArrowDownCircle className="size-4.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {MOV_LABEL[item.type]} · {formatTime(item.date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-sm font-bold tabular-nums',
                        positive ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {positive ? '+' : '-'}
                      {money(Math.abs(item.amount))}
                    </span>
                  </div>
                )
              } else {
                const isFiado = item.method === 'fiado'
                const isQr = item.method === 'qr'
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSale(item)}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isFiado
                          ? "bg-blue-500/10 text-blue-500"
                          : isQr
                          ? "bg-purple-500/10 text-purple-500"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {isFiado ? (
                        <NotebookPen className="size-4.5" />
                      ) : isQr ? (
                        <QrCode className="size-4.5" />
                      ) : (
                        <ShoppingCart className="size-4.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {isFiado ? 'Fiado' : isQr ? 'Venta QR/Transf.' : 'Venta'} #{item.id.slice(-4).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.items.length} {item.items.length === 1 ? 'artículo' : 'artículos'} · {formatTime(item.date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        isFiado ? "text-blue-500" : isQr ? "text-purple-500" : "text-success"
                      )}
                    >
                      +{money(item.total)}
                    </span>
                  </div>
                )
              }
            })
          )}
        </div>
      </Card>

      <Modal
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={selectedSale ? `Detalle de Venta #${selectedSale.id.slice(-4).toUpperCase()}` : ''}
        variant="center"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center pb-4 border-b border-border">
              <p className="text-2xl font-bold tracking-tight text-foreground font-heading">
                {money(selectedSale.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(selectedSale.date)} · Vía {selectedSale.method.toUpperCase()}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
              <div className="divide-y divide-border/60 max-h-40 overflow-y-auto pr-1 font-sans">
                {selectedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{it.name}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">x{it.qty}</span>
                    </div>
                    <span className="font-mono tabular-nums text-muted-foreground">{money(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Método de pago:</span>
                <span className="font-medium text-foreground capitalize">{selectedSale.method}</span>
              </div>
              {selectedSale.method === 'efectivo' && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Efectivo recibido:</span>
                    <span className="font-mono tabular-nums text-foreground">{money(selectedSale.cashReceived || 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Vuelto:</span>
                    <span className="font-mono tabular-nums text-foreground">{money(selectedSale.change || 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Registrado por:</span>
                <span className="font-medium text-foreground">{selectedSale.soldBy || 'Administrador'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* close modal */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Cierre de caja"
        variant="center"
        footer={
          <Button
            className="h-12 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
            disabled={counted === '' || !closeCashierName.trim() || closeShiftPending}
            onClick={async () => {
              try {
                await onClose(countedNum, closeCashierName.trim())
                const label =
                  diff === 0 ? 'Caja perfecta' : diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(Math.abs(diff))}`
                toast(`Caja cerrada. ${label}`, diff === 0 ? 'success' : 'info')
                setCloseOpen(false)
                setCounted('')
                setCloseCashierName('')
              } catch (err) {
                console.error(err)
                toast(err?.message || 'Error al cerrar la caja. Intentá de nuevo.', 'error')
              }
            }}
          >
            Confirmar cierre
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Total teórico</span>
            <span className="font-heading text-lg font-bold tabular-nums">{money(theoretical)}</span>
          </div>
          <div>
            <Label htmlFor="close-cashier-name">Nombre del cajero/a que cierra</Label>
            <Input
              id="close-cashier-name"
              value={closeCashierName}
              onChange={(e) => setCloseCashierName(e.target.value)}
              placeholder="Ej: María"
              required
            />
          </div>
          <div>
            <Label htmlFor="counted">Monto físico real en caja</Label>
            <Input
              id="counted"
              type="number"
              inputMode="numeric"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder="Contá el efectivo"
            />
          </div>
          {counted !== '' && (
            <div
              className={cn(
                'flex items-center justify-between rounded-xl px-4 py-3 font-semibold',
                diff === 0
                  ? 'bg-success/10 text-success'
                  : diff > 0
                    ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/10 text-destructive',
              )}
            >
              <span>{diff === 0 ? 'Caja perfecta' : diff > 0 ? 'Sobrante' : 'Faltante'}</span>
              <span className="tabular-nums">{money(Math.abs(diff))}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function ShiftHistory({ history }) {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 font-heading text-base font-bold">
          <History className="size-5 text-muted-foreground" />
          Cajas cerradas ({history.length})
        </span>
        <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-4">
          {history.map((s) => {
            const diff = s.difference ?? 0
            return (
              <div key={s.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{formatDateTime(s.openedAt)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Cajero: <b className="text-foreground">{getCashierDisplayName(s.openedBy, state.currentUser)}</b> (Apertura) | <b className="text-foreground">{getCashierDisplayName(s.closedBy, state.currentUser)}</b> (Cierre)
                    </p>
                  </div>
                  <Badge tone={diff === 0 ? 'success' : diff > 0 ? 'accent' : 'danger'}>
                    {diff === 0 ? 'Perfecta' : diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(Math.abs(diff))}`}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Apertura: <b className="text-foreground">{money(s.openingAmount)}</b></span>
                  <span>Teórico: <b className="text-foreground">{money(s.closingTheoretical ?? 0)}</b></span>
                  <span>Contado: <b className="text-foreground">{money(s.closingCounted ?? 0)}</b></span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
