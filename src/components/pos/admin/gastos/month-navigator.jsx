import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthLabel, shiftMonth } from './gastos-insights'

/** Previous / next month arrows around the month name, plus a shortcut back to the current month. */
export function MonthNavigator({ month, currentMonth, onChange }) {
  const isCurrent = month === currentMonth

  return (
    <nav aria-label="Elegir mes" className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft />
      </Button>
      <h2 aria-live="polite" className="min-w-36 font-heading text-lg font-bold text-center capitalize sm:text-xl">
        {formatMonthLabel(month)}
      </h2>
      {/* Future months stay reachable: rent can be loaded before its month starts */}
      <Button type="button" variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight />
      </Button>
      {!isCurrent && (
        <Button type="button" variant="outline" size="sm" className="ml-1" onClick={() => onChange(currentMonth)}>
          Este mes
        </Button>
      )}
    </nav>
  )
}
