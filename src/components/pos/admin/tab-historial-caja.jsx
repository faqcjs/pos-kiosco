'use client'

import { useMemo } from 'react'
import { Calendar, MoreHorizontal, Wallet } from 'lucide-react'
import { money } from '@/lib/format'

export function TabHistorialCaja({ shifts }) {
  const sortedShifts = useMemo(() => {
    if (!shifts) return []
    return [...shifts].sort(
      (a, b) => new Date(b.openedAt || b.createdAt).getTime() - new Date(a.openedAt || a.createdAt).getTime(),
    )
  }, [shifts])

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-2xs space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground font-heading">Historial de Caja</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Lista de sesiones de caja en el período seleccionado.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground font-semibold border-b border-border/60">
            <tr>
              <th className="p-3">Fecha de Apertura</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Fecha de Cierre</th>
              <th className="p-3 text-right">Monto Inicial</th>
              <th className="p-3 text-right">Monto Final</th>
              <th className="p-3 text-right">Diferencia</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-medium">
            {sortedShifts.length > 0 ? (
              sortedShifts.map((shift) => {
                const isOpen = shift.status === 'open' || !shift.closedAt
                const openDateStr = shift.openedAt
                  ? `${new Date(shift.openedAt).toLocaleDateString('es-AR')} ${new Date(shift.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : '-'
                const closeDateStr = shift.closedAt
                  ? `${new Date(shift.closedAt).toLocaleDateString('es-AR')} ${new Date(shift.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'No cerrada'

                const diff = shift.difference ?? (shift.finalAmount ? shift.finalAmount - (shift.initialAmount + (shift.salesCashTotal || 0)) : null)

                return (
                  <tr key={shift.id || shift.openedAt} className="hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{openDateStr}</td>
                    <td className="p-3 font-semibold text-foreground">
                      {shift.openedBy || shift.opened_by || shift.userName || shift.user || shift.closedBy || 'Desconocido'}
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{closeDateStr}</td>
                    <td className="p-3 text-right font-semibold text-foreground">
                      {money(shift.openingAmount ?? shift.initialAmount ?? 0)}
                    </td>
                    <td className="p-3 text-right font-semibold text-foreground">
                      {isOpen ? 'No cerrada' : money(shift.closingCounted ?? shift.finalAmount ?? 0)}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {diff === null || isOpen ? (
                        <span className="text-muted-foreground">-</span>
                      ) : diff === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">$ 0,00</span>
                      ) : diff < 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{money(diff)}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">+{money(diff)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isOpen
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isOpen ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">
                  No hay sesiones de caja registradas en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
