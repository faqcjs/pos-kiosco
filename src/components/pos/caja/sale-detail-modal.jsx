import { Modal } from '@/components/ui/kit'
import { formatShortId } from '@/lib/cash-movements'
import { formatDateTime, money } from '@/lib/format'

const SALE_ID_LENGTH = 4
const DEFAULT_SELLER = 'Administrador'

export function SaleDetailModal({ sale, onClose }) {
  return (
    <Modal
      open={!!sale}
      onClose={onClose}
      title={sale ? `Detalle de Venta #${formatShortId(sale.id, SALE_ID_LENGTH)}` : ''}
      variant="center"
    >
      {sale && (
        <article className="space-y-4">
          <header className="space-y-1.5 pb-4 text-center border-b border-border">
            <p className="font-heading text-2xl font-bold tracking-tight text-foreground">{money(sale.total)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(sale.date)} · Vía {sale.method.toUpperCase()}
            </p>
          </header>

          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Productos</p>
            <ul className="max-h-40 pr-1 overflow-y-auto font-sans divide-y divide-border/60">
              {sale.items.map((it, idx) => (
                <li key={idx} className="flex justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{it.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">x{it.qty}</span>
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground">{money(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="space-y-2 pt-3 text-sm border-t border-border">
            <DetailRow label="Método de pago:" valueClassName="font-medium text-foreground capitalize">
              {sale.method}
            </DetailRow>
            {sale.method === 'efectivo' && (
              <>
                <DetailRow label="Efectivo recibido:" valueClassName="font-mono tabular-nums text-foreground">
                  {money(sale.cashReceived || 0)}
                </DetailRow>
                <DetailRow label="Vuelto:" valueClassName="font-mono tabular-nums text-foreground">
                  {money(sale.change || 0)}
                </DetailRow>
              </>
            )}
            <DetailRow label="Registrado por:" valueClassName="font-medium text-foreground">
              {sale.soldBy || DEFAULT_SELLER}
            </DetailRow>
          </footer>
        </article>
      )}
    </Modal>
  )
}

function DetailRow({ label, valueClassName, children }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={valueClassName}>{children}</span>
    </div>
  )
}
