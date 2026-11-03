import { Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Input } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { cn, matchProduct } from '@/lib/utils'

const MAX_RESULTS = 8

/** Keyboard-friendly product search: arrows move, Enter adds, Escape clears. */
export function ComponentPicker({ products, onPick }) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return products.filter((p) => matchProduct(p, query)).slice(0, MAX_RESULTS)
  }, [products, query])

  const isOpen = results.length > 0
  const activeId = isOpen ? `${listId}-${activeIndex}` : undefined

  function pick(product) {
    onPick(product)
    setQuery('')
    setActiveIndex(0)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault()
      pick(results[activeIndex])
    } else if (e.key === 'Escape' && query) {
      // Clear the search without closing the whole modal.
      e.stopPropagation()
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-label="Buscar producto para sumar al combo"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Buscá por nombre o código para sumar un producto"
        className="pl-9"
        autoComplete="off"
      />

      {query.trim() && !isOpen && (
        <p className="mt-2 px-1 text-sm text-muted-foreground">Ningún producto coincide con “{query.trim()}”.</p>
      )}

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto p-1 rounded-xl bg-card border border-border shadow-lg"
        >
          {results.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(product)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer',
                index === activeIndex && 'bg-muted',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.stock} en stock</span>
              </span>
              <span className="shrink-0 text-right text-xs tabular-nums">
                {product.cost > 0 ? (
                  <span className="text-muted-foreground">Costo {money(product.cost)}</span>
                ) : (
                  <span className="font-semibold text-warning-foreground dark:text-warning">Sin costo</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
