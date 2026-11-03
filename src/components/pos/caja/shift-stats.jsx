import { Wallet } from 'lucide-react'
import { StatCard } from '@/components/ui/kit'
import { money } from '@/lib/format'

export function ShiftStats({ openingAmount, totals, theoretical }) {
  const { cashSales, manualIn, manualOut, qrSales } = totals

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Apertura" value={money(openingAmount)} icon={<Wallet className="size-4" />} className="p-3" />
      <StatCard label="Ventas efectivo" value={money(cashSales)} tone="success" sub="Ventas en caja" className="p-3" />
      <StatCard label="Ventas QR/Trans." value={money(qrSales)} tone="success" sub="Dinero digital" className="p-3" />
      <StatCard label="Ingresos" value={money(manualIn)} tone="success" className="p-3" />
      <StatCard label="Egresos" value={money(manualOut)} tone="danger" className="p-3" />
      <StatCard
        label="Total teórico"
        value={money(theoretical)}
        tone="accent"
        sub="Saldo estimado"
        className="p-3 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs shadow-emerald-500/20"
      />
    </section>
  )
}
