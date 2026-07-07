'use client'

import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  History,
  Lock,
  LockOpen,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Input, Label, Modal, Select, StatCard } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { formatDateTime, formatTime, money } from '@/lib/format'
import { shiftTheoretical, shiftTotals, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const MOV_LABEL = {
  apertura: 'Apertura',
  venta: 'Venta efectivo',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  cobro_fiado: 'Cobro fiado',
  pago_proveedor: 'Pago proveedor',
}

export function Caja() {
  const { state, openShift, closeShift, addMovement } = useStore()
  const toast = useToast()
  const shift = state.currentShift

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-1.5 lg:p-6">
      <PageHeader title="Caja" description="Control del flujo de efectivo por turno." />
      {shift ? (
        <OpenShiftView shift={shift} onClose={closeShift} onMovement={addMovement} toast={toast} />
      ) : (
        <ClosedShiftView onOpen={openShift} toast={toast} currentUser={state.currentUser} />
      )}
      <ShiftHistory history={state.shiftHistory} />
    </div>
  )
}

function ClosedShiftView({
  onOpen,
  toast,
  currentUser,
}) {
  const [amount, setAmount] = useState('')
  const cashierName = currentUser?.name || 'Desconocido'
  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="size-7" />
      </div>
      <div>
        <h2 className="font-heading text-lg font-bold">La caja está cerrada</h2>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          El cajero <strong className="text-foreground">{cashierName}</strong> va a abrir el turno.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ingresá el monto de efectivo inicial en caja para iniciar las operaciones.
        </p>
      </div>
      <div className="w-full max-w-xs text-left space-y-3">
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
        onClick={() => {
          const n = Number(amount)
          if (n < 0 || Number.isNaN(n)) return
          onOpen(n, cashierName)
          toast('Caja abierta')
          setAmount('')
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
}) {
  const { state } = useStore()
  const { cashSales, manualIn, manualOut, qrSales } = useMemo(
    () => shiftTotals(shift, state.sales),
    [shift, state.sales]
  )
  const theoretical = useMemo(() => shiftTheoretical(shift), [shift])

  const [movType, setMovType] = useState('ingreso')
  const [movAmount, setMovAmount] = useState('')
  const [movReason, setMovReason] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [counted, setCounted] = useState('')
  const [closedBy, setClosedBy] = useState('')

  const history = [...shift.movements].reverse()

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
  const diff = countedNum - theoretical

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="success">
          <span className="size-2 animate-pulse rounded-full bg-success" />
          Turno abierto por{' '}
          <span className="max-w-[12ch] truncate inline-block align-bottom">{shift.openedBy || 'Desconocido'}</span>{' '}
          desde {formatTime(shift.openedAt)}
        </Badge>
        <Button variant="destructive" onClick={() => setCloseOpen(true)}>
          <Lock className="size-4" />
          Cerrar caja
        </Button>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Apertura" value={money(shift.openingAmount)} icon={<Wallet className="size-4" />} className="p-3" />
        <StatCard label="Ventas efectivo" value={money(cashSales)} tone="success" sub="+ ingresos por ventas" className="p-3" />
        <StatCard label="Ventas QR/Transferencia" value={money(qrSales)} tone="success" sub="Dinero digital en cuenta" className="p-3" />
        <StatCard label="Ingresos manuales" value={money(manualIn)} tone="success" className="p-3" />
        <StatCard label="Egresos / retiros" value={money(manualOut)} tone="danger" className="p-3" />
        <StatCard
          label="Total teórico"
          value={money(theoretical)}
          tone="accent"
          sub="Saldo estimado en caja"
          className="p-3"
        />
      </div>

      {/* register movement */}
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Registrar movement</h3>
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
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos aún.</p>
          ) : (
            history.map((m) => {
              const positive = m.amount >= 0
              return (
                <div
                  key={m.id}
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
                    <p className="truncate text-sm font-medium">{m.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {MOV_LABEL[m.type]} · {formatTime(m.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm font-bold tabular-nums',
                      positive ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {positive ? '+' : '-'}
                    {money(Math.abs(m.amount))}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* close modal */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Cierre de caja"
        variant="center"
        footer={
          <Button
            className="h-12 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
            disabled={counted === '' || !closedBy.trim()}
            onClick={() => {
              onClose(countedNum, closedBy.trim())
              const label =
                diff === 0 ? 'Caja perfecta' : diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(Math.abs(diff))}`
              toast(`Caja cerrada. ${label}`, diff === 0 ? 'success' : 'info')
              setCloseOpen(false)
              setCounted('')
              setClosedBy('')
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
            <Label htmlFor="closedBy">Nombre del cajero</Label>
            <Input
              id="closedBy"
              value={closedBy}
              onChange={(e) => setClosedBy(e.target.value)}
              placeholder="Tu nombre"
              required
              autoFocus
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
                    ? 'bg-accent/20 text-accent-foreground'
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
                      Cajero: <b className="text-foreground">{s.openedBy || 'Desconocido'}</b> (Apertura) | <b className="text-foreground">{s.closedBy || 'Desconocido'}</b> (Cierre)
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
