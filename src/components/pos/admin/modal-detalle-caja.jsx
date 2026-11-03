'use client'

import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, QrCode, User } from 'lucide-react'
import { Modal, Badge } from '@/components/ui/kit'
import {
  computeShiftDetailStats,
  formatShortId,
  getMovementDetailLabel,
  isPositiveMovement,
} from '@/lib/cash-movements'
import { money, formatDateTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const SHIFT_ID_LENGTH = 6
const UNKNOWN_SHIFT_ID = 'SN'
const UNKNOWN_USER = 'Desconocido'

const POSITIVE_TEXT = 'text-emerald-600 dark:text-emerald-400'
const NEGATIVE_TEXT = 'text-rose-600 dark:text-rose-400'
const KPI_LABEL = 'text-[11px] font-medium tracking-wider text-muted-foreground uppercase'

export function ModalDetalleCaja({ shift, open, onClose }) {
  if (!shift) return null

  const isOpen = shift.status === 'open' || !shift.closedAt
  const openingAmount = shift.openingAmount ?? shift.initialAmount ?? 0
  const closingCounted = shift.closingCounted ?? shift.finalAmount ?? 0
  const movements = shift.movements || []
  // The T0 arqueo fallback formula lives in computeShiftDetailStats (src/lib/cash-movements.js).
  const stats = computeShiftDetailStats({ shift, openingAmount, closingCounted, isOpen })

  return (
    <Modal open={open} onClose={onClose} title="Detalle de Sesión de Caja" variant="large">
      <div className="space-y-6">
        <ShiftDetailHeader shift={shift} isOpen={isOpen} />
        <ShiftDetailKpis openingAmount={openingAmount} stats={stats} />
        {!isOpen && <ShiftAuditResult closingCounted={closingCounted} diff={stats.diff} />}
        <ShiftMovementList movements={movements} />
      </div>
    </Modal>
  )
}

function ShiftDetailHeader({ shift, isOpen }) {
  const shiftId = shift.id ? formatShortId(shift.id, SHIFT_ID_LENGTH) : UNKNOWN_SHIFT_ID
  const openDateStr = formatDateTime(shift.openedAt || shift.createdAt)
  const closeDateStr = shift.closedAt ? formatDateTime(shift.closedAt) : 'Sesión en curso'
  const openedByStr = shift.openedBy || shift.userName || shift.user || UNKNOWN_USER
  const closedByStr = shift.closedBy || (isOpen ? 'No cerrada' : openedByStr)

  return (
    <header className="space-y-3 p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-muted/30">
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <h4 className="font-heading text-xs sm:text-sm font-bold text-foreground">Sesión de Caja #{shiftId}</h4>
        <Badge tone={isOpen ? 'primary' : 'muted'} className="text-[10px] sm:text-xs">
          {isOpen ? 'Abierta' : 'Cerrada'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
        <ShiftPartyCard
          icon={<User className="size-3.5" />}
          iconClassName="bg-emerald-500/10 text-emerald-600"
          label="Apertura por"
          name={openedByStr}
          detail={openDateStr}
        />
        <ShiftPartyCard
          icon={<Clock className="size-3.5" />}
          iconClassName="bg-muted text-muted-foreground"
          label={isOpen ? 'Estado Cierre' : 'Cierre por'}
          name={isOpen ? 'En curso' : closedByStr}
          detail={isOpen ? 'Sesión no finalizada' : closeDateStr}
        />
      </div>
    </header>
  )
}

function ShiftPartyCard({ icon, iconClassName, label, name, detail }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl border border-border/40 bg-card/60">
      <div className={cn('flex shrink-0 items-center justify-center mt-0.5 size-7 rounded-lg', iconClassName)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
        <p className="truncate font-bold text-foreground">{name}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function ShiftDetailKpis({ openingAmount, stats }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Monto Inicial">
        <p className="font-mono text-lg font-bold text-foreground">{money(openingAmount)}</p>
      </KpiCard>
      <KpiCard label="Ventas Efectivo">
        <p className={cn('font-mono text-lg font-bold', POSITIVE_TEXT)}>+{money(stats.cashSales)}</p>
      </KpiCard>
      <KpiCard label="Ingresos / Egresos">
        <p className="flex items-center justify-between font-mono text-sm font-bold">
          <span className={POSITIVE_TEXT}>+{money(stats.manualIn)}</span>
          <span className={NEGATIVE_TEXT}>-{money(stats.manualOut)}</span>
        </p>
      </KpiCard>
      <KpiCard label="Saldo Teórico">
        <p className="font-mono text-lg font-bold text-primary">{money(stats.theoretical)}</p>
      </KpiCard>
    </section>
  )
}

function KpiCard({ label, children }) {
  return (
    <div className="space-y-1 p-3 rounded-xl border border-border/60 bg-card">
      <p className={KPI_LABEL}>{label}</p>
      {children}
    </div>
  )
}

function ShiftAuditResult({ closingCounted, diff }) {
  return (
    <section className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center p-4 rounded-xl border border-border/70 bg-muted/20">
      <div className="space-y-1">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Arqueo Contado al Cierre
        </span>
        <p className="font-mono text-2xl font-black text-foreground">{money(closingCounted)}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Resultado Auditoría
          </span>
          <p className="flex items-center justify-end gap-1.5 mt-0.5 text-sm font-bold">
            <AuditDifference diff={diff} />
          </p>
        </div>
      </div>
    </section>
  )
}

function AuditDifference({ diff }) {
  if (diff === 0) {
    return (
      <span className={cn('flex items-center gap-1', POSITIVE_TEXT)}>
        <CheckCircle2 className="size-4" /> Caja Cuadrada ($ 0,00)
      </span>
    )
  }
  if (diff > 0) {
    return (
      <span className={cn('flex items-center gap-1', POSITIVE_TEXT)}>
        <ArrowUpCircle className="size-4" /> Sobrante de +{money(diff)}
      </span>
    )
  }
  return (
    <span className={cn('flex items-center gap-1', NEGATIVE_TEXT)}>
      <AlertTriangle className="size-4" /> Faltante de {money(diff)}
    </span>
  )
}

function ShiftMovementList({ movements }) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h5 className="font-heading text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Movimientos Registrados ({movements.length})
        </h5>
      </header>

      {movements.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto text-xs rounded-xl border border-border/60 divide-y divide-border/50">
          {movements.map((mov, idx) => (
            <MovementRow key={mov.id || idx} movement={mov} />
          ))}
        </ul>
      ) : (
        <div className="p-6 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border/70">
          No hay movimientos de efectivo detallados para esta sesión.
        </div>
      )}
    </section>
  )
}

function getMovementTone(isQr, isPositive) {
  if (isQr) {
    return { icon: 'bg-purple-500/10 text-purple-500', amount: 'text-purple-600 dark:text-purple-400' }
  }
  if (isPositive) return { icon: cn('bg-emerald-500/10', POSITIVE_TEXT), amount: POSITIVE_TEXT }
  return { icon: cn('bg-rose-500/10', NEGATIVE_TEXT), amount: NEGATIVE_TEXT }
}

function MovementRow({ movement }) {
  const isQr = movement.type === 'venta_qr'
  const isPositive = isPositiveMovement(movement)
  const tone = getMovementTone(isQr, isPositive)
  const Icon = isQr ? QrCode : isPositive ? ArrowUpCircle : ArrowDownCircle

  return (
    <li className="flex items-center justify-between p-3 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('shrink-0 p-2 rounded-lg', tone.icon)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{getMovementDetailLabel(movement.type)}</p>
          {movement.reason && <p className="truncate text-[11px] text-muted-foreground">{movement.reason}</p>}
        </div>
      </div>

      <div className="shrink-0 ml-3 text-right">
        <p className={cn('font-mono font-bold', tone.amount)}>
          {isPositive ? '+' : '-'}
          {money(movement.amount)}
        </p>
        {movement.date && <p className="text-[10px] text-muted-foreground">{formatTime(movement.date)}</p>}
      </div>
    </li>
  )
}
