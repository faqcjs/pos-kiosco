import { Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/kit'
import { getCashierDisplayName } from '@/lib/cash-movements'
import { formatTime } from '@/lib/format'
import { shiftTheoretical, shiftTotals } from '@/lib/store'
import { CloseShiftModal } from './close-shift-modal'
import { MovementForm } from './movement-form'
import { SaleDetailModal } from './sale-detail-modal'
import { ShiftStats } from './shift-stats'
import { ShiftTimeline } from './shift-timeline'

export function OpenShiftView({
  shift,
  sales,
  currentUser,
  suppliers,
  onClose,
  movementActions,
  toast,
  closeShiftPending,
}) {
  const totals = useMemo(() => shiftTotals(shift, sales), [shift, sales])
  const theoretical = useMemo(() => shiftTheoretical(shift), [shift])
  const shiftOpName = getCashierDisplayName(shift.openedBy, currentUser)

  const [closeOpen, setCloseOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="success" className="text-xs">
          <span className="size-2 bg-success rounded-full animate-pulse" />
          Turno abierto por{' '}
          <span className="inline-block max-w-[12ch] align-bottom truncate">{shiftOpName || 'Desconocido'}</span>{' '}
          desde {formatTime(shift.openedAt)}
        </Badge>
        <Button variant="destructive" size="sm" onClick={() => setCloseOpen(true)}>
          <Lock className="size-4" />
          Cerrar caja
        </Button>
      </header>

      <ShiftStats openingAmount={shift.openingAmount} totals={totals} theoretical={theoretical} />

      <MovementForm actions={movementActions} suppliers={suppliers} toast={toast} />

      <ShiftTimeline shift={shift} sales={sales} onSelectSale={setSelectedSale} />

      <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />

      <CloseShiftModal
        open={closeOpen}
        onDismiss={() => setCloseOpen(false)}
        shift={shift}
        theoretical={theoretical}
        onCloseShift={onClose}
        toast={toast}
        pending={closeShiftPending}
      />
    </div>
  )
}
