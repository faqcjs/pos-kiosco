import { Card } from '@/components/ui/kit'
import { money } from '@/lib/format'

export function ExpenseSummary({ categories, total }) {
  return (
    <Card className="p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Total del mes</h3>
        <p className="font-heading text-2xl font-bold">{money(total)}</p>
      </header>
      {categories.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-border">
          {categories.map((row) => (
            <li key={row.category} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold">{money(row.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
