import { Package, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/kit'
import { buildComponentLines, draftFromCombo, getDraftMetrics } from '@/lib/combo-draft'
import { matchProduct } from '@/lib/utils'
import { ComboRow } from './combo-row'

/** Saved combos with search, plus the entry point to create a new one. */
export function ComboList({ combos, comboItems, products, onCreate, onEdit, onDelete }) {
  const [query, setQuery] = useState('')

  const rows = useMemo(
    () =>
      combos
        .filter((combo) => matchProduct(combo, query))
        .map((combo) => {
          const { components } = draftFromCombo(combo, comboItems)
          return {
            combo,
            lines: buildComponentLines(components, products),
            metrics: getDraftMetrics(components, products, combo.price),
          }
        }),
    [combos, comboItems, products, query],
  )

  if (combos.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 px-6 py-14 text-center rounded-2xl border border-dashed border-border">
        <Package aria-hidden="true" className="size-10 text-muted-foreground/50" />
        <div>
          <h3 className="font-heading text-base font-bold">Todavía no armaste ningún combo</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
            Juntá productos que se venden juntos, como un Fernet con una Coca, y cobralos como uno solo.
          </p>
        </div>
        <Button onClick={onCreate} size="lg">
          <Plus aria-hidden="true" />
          Crear el primer combo
        </Button>
      </section>
    )
  }

  return (
    <section aria-label="Combos guardados" className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar entre ${combos.length} ${combos.length === 1 ? 'combo' : 'combos'}`}
            aria-label="Buscar combo"
            className="pl-9"
          />
        </div>
        <Button onClick={onCreate} size="lg">
          <Plus aria-hidden="true" />
          Nuevo combo
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Ningún combo coincide con “{query.trim()}”.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ combo, lines, metrics }) => (
            <ComboRow
              key={combo.id}
              combo={combo}
              lines={lines}
              metrics={metrics}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
