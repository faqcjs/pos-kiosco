import { Search, X } from 'lucide-react'
import { Badge, Input } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Search results dropdown; the first suggestion is the one Enter selects. */
export function ProductSuggestions({ suggestions, onSelect }) {
  if (suggestions.length === 0) return null

  return (
    <ul className="absolute top-full right-0 left-0 z-30 overflow-y-auto mt-1.5 p-1.5 max-h-72 bg-card rounded-xl border border-border divide-y divide-border/40 shadow-2xl">
      {suggestions.map((p, idx) => {
        const isFirst = idx === 0
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                'flex items-center justify-between gap-3 p-3 w-full min-h-[50px] text-left rounded-lg transition-all',
                isFirst ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted active:bg-muted/80',
              )}
            >
              <div className="flex-1 space-y-0.5 min-w-0">
                <p className="text-xs sm:text-sm font-bold leading-snug text-foreground break-words">{p.name}</p>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-medium text-muted-foreground">
                  <span>
                    Stock: <strong className="font-bold text-foreground">{p.stock}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Costo catálogo: <strong className="font-bold text-foreground">{money(p.cost)}</strong>
                  </span>
                  {p.category && (
                    <>
                      <span>•</span>
                      <span className="opacity-80">{p.category}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                variant={isFirst ? 'default' : 'secondary'}
                className="shrink-0 px-2.5 py-1 text-[10px] sm:text-xs font-bold"
              >
                {isFirst ? '↵ Seleccionar' : '+ Agregar'}
              </Badge>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Product search box with its suggestions dropdown. */
export function ProductSearch({ query, onQueryChange, onKeyDown, suggestions, onSelect }) {
  return (
    <div className="relative w-full">
      <Search className="absolute top-1/2 left-3.5 -translate-y-1/2 size-4.5 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Buscar por nombre o código de barras (Enter para agregar)..."
        className="pr-9 pl-10 w-full h-11 text-xs sm:text-sm bg-card shadow-2xs"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange('')}
          className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      <ProductSuggestions suggestions={suggestions} onSelect={onSelect} />
    </div>
  )
}
