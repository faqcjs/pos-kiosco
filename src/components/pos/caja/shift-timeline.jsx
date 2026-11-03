import { ArrowDownCircle, ArrowUpCircle, NotebookPen, QrCode, ShoppingCart } from 'lucide-react'
import { Card, Pagination } from '@/components/ui/kit'
import { MOVEMENT_LABELS, formatShortId } from '@/lib/cash-movements'
import { formatTime, money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { HISTORY_ITEMS_PER_PAGE, useShiftTimeline } from './use-shift-timeline'

const SALE_ID_LENGTH = 4

const SALE_STYLES = {
  fiado: {
    label: 'Fiado',
    Icon: NotebookPen,
    iconClassName: 'bg-blue-500/10 text-blue-500',
    amountClassName: 'text-blue-500',
  },
  qr: {
    label: 'Venta QR/Transf.',
    Icon: QrCode,
    iconClassName: 'bg-purple-500/10 text-purple-500',
    amountClassName: 'text-purple-500',
  },
}

const DEFAULT_SALE_STYLE = {
  label: 'Venta',
  Icon: ShoppingCart,
  iconClassName: 'bg-primary/10 text-primary',
  amountClassName: 'text-success',
}

export function ShiftTimeline({ shift, sales, onSelectSale }) {
  const { totalItems, pageItems, currentPage, totalPages, setHistoryPage } = useShiftTimeline(shift, sales)

  return (
    <section>
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Historial del turno</h3>
        <ul className="space-y-2 mt-3">
          {pageItems.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">Sin movimientos aún.</li>
          ) : (
            pageItems.map((item) =>
              item.isMovement ? (
                <MovementItem key={item.id} movement={item} />
              ) : (
                <SaleItem key={item.id} sale={item} onSelect={onSelectSale} />
              ),
            )
          )}
        </ul>
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setHistoryPage}
          totalItems={totalItems}
          itemsPerPage={HISTORY_ITEMS_PER_PAGE}
        />
      </Card>
    </section>
  )
}

function MovementItem({ movement }) {
  const positive = movement.amount >= 0
  const Icon = positive ? ArrowUpCircle : ArrowDownCircle

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border">
      <span
        className={cn(
          'flex shrink-0 items-center justify-center size-8 rounded-lg',
          positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{movement.reason}</p>
        <p className="text-xs text-muted-foreground">
          {MOVEMENT_LABELS[movement.type]} · {formatTime(movement.date)}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-bold tabular-nums',
          positive ? 'text-success' : 'text-destructive',
        )}
      >
        {positive ? '+' : '-'}
        {money(Math.abs(movement.amount))}
      </span>
    </li>
  )
}

function SaleItem({ sale, onSelect }) {
  const { label, Icon, iconClassName, amountClassName } = SALE_STYLES[sale.method] ?? DEFAULT_SALE_STYLE
  const itemCount = sale.items.length

  return (
    <li
      onClick={() => onSelect(sale)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.99]"
    >
      <span className={cn('flex shrink-0 items-center justify-center size-8 rounded-lg', iconClassName)}>
        <Icon className="size-4.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {label} #{formatShortId(sale.id, SALE_ID_LENGTH)}
        </p>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'} · {formatTime(sale.date)}
        </p>
      </div>
      <span className={cn('shrink-0 text-sm font-bold tabular-nums', amountClassName)}>+{money(sale.total)}</span>
    </li>
  )
}
