import { ChevronDown, History } from 'lucide-react'
import { useState } from 'react'
import { Badge, Card } from '@/components/ui/kit'
import { getCashierDisplayName } from '@/lib/cash-movements'
import { formatDateTime, money } from '@/lib/format'
import { cn } from '@/lib/utils'

function getDifferenceBadge(diff) {
  if (diff === 0) return { tone: 'success', label: 'Perfecta' }
  if (diff > 0) return { tone: 'accent', label: `Sobrante ${money(diff)}` }
  return { tone: 'danger', label: `Faltante ${money(Math.abs(diff))}` }
}

export function ShiftHistory({ history, currentUser }) {
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null

  return (
    <section>
      <Card className="overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 font-heading text-base font-bold">
            <History className="size-5 text-muted-foreground" />
            Cajas cerradas ({history.length})
          </span>
          <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <ul className="space-y-2 p-4 border-t border-border">
            {history.map((s) => (
              <ClosedShiftItem key={s.id} shift={s} currentUser={currentUser} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

function ClosedShiftItem({ shift, currentUser }) {
  const badge = getDifferenceBadge(shift.difference ?? 0)

  return (
    <li className="p-3 rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{formatDateTime(shift.openedAt)}</p>
          <p className="text-[10px] text-muted-foreground">
            Cajero: <b className="text-foreground">{getCashierDisplayName(shift.openedBy, currentUser)}</b> (Apertura) | <b className="text-foreground">{getCashierDisplayName(shift.closedBy, currentUser)}</b> (Cierre)
          </p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
        <span>Apertura: <b className="text-foreground">{money(shift.openingAmount)}</b></span>
        <span>Teórico: <b className="text-foreground">{money(shift.closingTheoretical ?? 0)}</b></span>
        <span>Contado: <b className="text-foreground">{money(shift.closingCounted ?? 0)}</b></span>
      </div>
    </li>
  )
}
