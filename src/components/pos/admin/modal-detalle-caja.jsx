'use client'

import { useMemo } from 'react'
import {
  Calendar,
  Clock,
  User,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  QrCode,
} from 'lucide-react'
import { Modal, Badge } from '@/components/ui/kit'
import { money, formatDateTime, formatTime } from '@/lib/format'

const MOV_LABEL = {
  apertura: 'Apertura de Caja',
  venta: 'Venta Efectivo',
  venta_qr: 'Venta QR / Transf.',
  ingreso: 'Ingreso Manual',
  egreso: 'Egreso / Retiro',
  cobro_fiado: 'Cobro de Fiado',
  pago_proveedor: 'Pago a Proveedor',
}

export function ModalDetalleCaja({ shift, open, onClose }) {
  if (!shift) return null

  const isOpen = shift.status === 'open' || !shift.closedAt

  const openingAmount = shift.openingAmount ?? shift.initialAmount ?? 0
  const closingCounted = shift.closingCounted ?? shift.finalAmount ?? 0
  
  // Calculate movement totals from movements array if available
  const movements = shift.movements || []
  
  const stats = useMemo(() => {
    let cashSales = 0
    let qrSales = 0
    let manualIn = 0
    let manualOut = 0

    for (const m of movements) {
      if (m.type === 'venta') cashSales += m.amount || 0
      else if (m.type === 'venta_qr') qrSales += m.amount || 0
      else if (m.type === 'ingreso' || m.type === 'cobro_fiado') manualIn += m.amount || 0
      else if (m.type === 'egreso' || m.type === 'pago_proveedor') manualOut += m.amount || 0
    }

    // If no movements logged explicitly, estimate cashSales from shift theoretical
    if (movements.length === 0 && shift.salesCashTotal) {
      cashSales = shift.salesCashTotal
    }

    const theoretical = shift.closingTheoretical ?? (openingAmount + cashSales + manualIn - manualOut)
    const diff = shift.difference ?? (isOpen ? null : closingCounted - theoretical)

    return { cashSales, qrSales, manualIn, manualOut, theoretical, diff }
  }, [movements, openingAmount, closingCounted, shift, isOpen])

  const openDateStr = formatDateTime(shift.openedAt || shift.createdAt)
  const closeDateStr = shift.closedAt ? formatDateTime(shift.closedAt) : 'Sesión en curso'

  const openedByStr = shift.openedBy || shift.userName || shift.user || 'Desconocido'
  const closedByStr = shift.closedBy || (isOpen ? 'No cerrada' : openedByStr)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de Sesión de Caja"
      variant="large"
    >
      <div className="space-y-6">
        {/* State Banner (Apertura y Cierre) */}
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 sm:p-4 space-y-3">
          {/* Fila 1: ID de Caja y Estado */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h4 className="text-xs sm:text-sm font-bold text-foreground font-heading">
              Sesión de Caja #{shift.id ? String(shift.id).slice(-6).toUpperCase() : 'SN'}
            </h4>
            <Badge tone={isOpen ? 'primary' : 'muted'} className="text-[10px] sm:text-xs">
              {isOpen ? 'Abierta' : 'Cerrada'}
            </Badge>
          </div>

          {/* Fila 2: Apertura vs Cierre en Grid Responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Apertura */}
            <div className="flex items-start gap-2 bg-card/60 p-2.5 rounded-xl border border-border/40">
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Apertura por
                </span>
                <p className="font-bold text-foreground truncate">{openedByStr}</p>
                <p className="text-[11px] text-muted-foreground">{openDateStr}</p>
              </div>
            </div>

            {/* Cierre */}
            <div className="flex items-start gap-2 bg-card/60 p-2.5 rounded-xl border border-border/40">
              <div className="size-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  {isOpen ? 'Estado Cierre' : 'Cierre por'}
                </span>
                <p className="font-bold text-foreground truncate">{isOpen ? 'En curso' : closedByStr}</p>
                <p className="text-[11px] text-muted-foreground">{isOpen ? 'Sesión no finalizada' : closeDateStr}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Financial Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monto Inicial</p>
            <p className="text-lg font-bold text-foreground font-mono">{money(openingAmount)}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ventas Efectivo</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              +{money(stats.cashSales)}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ingresos / Egresos</p>
            <p className="text-sm font-bold font-mono flex items-center justify-between">
              <span className="text-emerald-600 dark:text-emerald-400">+{money(stats.manualIn)}</span>
              <span className="text-rose-600 dark:text-rose-400">-{money(stats.manualOut)}</span>
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Teórico</p>
            <p className="text-lg font-bold text-primary font-mono">{money(stats.theoretical)}</p>
          </div>
        </div>

        {/* Closing Audit Result */}
        {!isOpen && (
          <div className="rounded-xl border border-border/70 p-4 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arqueo Contado al Cierre</span>
              <p className="text-2xl font-black text-foreground font-mono">{money(closingCounted)}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado Auditoría</span>
                <p className="text-sm font-bold flex items-center gap-1.5 justify-end mt-0.5">
                  {stats.diff === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="size-4" /> Caja Cuadrada ($ 0,00)
                    </span>
                  ) : stats.diff > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ArrowUpCircle className="size-4" /> Sobrante de +{money(stats.diff)}
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="size-4" /> Faltante de {money(stats.diff)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Movements History List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading">
              Movimientos Registrados ({movements.length})
            </h5>
          </div>

          {movements.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/50 text-xs">
              {movements.map((mov, idx) => {
                const isQr = mov.type === 'venta_qr'
                const isPositive = isQr || mov.type === 'apertura' || mov.type === 'venta' || mov.type === 'ingreso' || mov.type === 'cobro_fiado' || (typeof mov.amount === 'number' && mov.amount > 0 && mov.type !== 'egreso' && mov.type !== 'pago_proveedor')
                
                return (
                  <div key={mov.id || idx} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isQr 
                          ? 'bg-purple-500/10 text-purple-500' 
                          : isPositive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isQr ? <QrCode className="size-4" /> : isPositive ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {MOV_LABEL[mov.type] || mov.type}
                        </p>
                        {mov.reason && <p className="text-[11px] text-muted-foreground truncate">{mov.reason}</p>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <p className={`font-mono font-bold ${
                        isQr 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : isPositive 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isPositive ? '+' : '-'}{money(mov.amount)}
                      </p>
                      {mov.date && <p className="text-[10px] text-muted-foreground">{formatTime(mov.date)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl">
              No hay movimientos de efectivo detallados para esta sesión.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
