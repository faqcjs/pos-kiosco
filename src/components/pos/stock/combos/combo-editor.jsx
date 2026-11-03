import { useMemo } from 'react'
import { Input, Label, Select } from '@/components/ui/kit'
import { addComponent, buildComponentLines, getDraftMetrics, setComponentQty } from '@/lib/combo-draft'
import { CATEGORIES } from '@/lib/types'
import { ComboRecipe } from './combo-recipe'
import { ComponentList } from './component-list'
import { ComponentPicker } from './component-picker'

/** Create/edit form for a combo. The draft is owned by the parent; every change goes through onChange. */
export function ComboEditor({ draft, onChange, products }) {
  const lines = useMemo(() => buildComponentLines(draft.components, products), [draft.components, products])
  const metrics = useMemo(
    () => getDraftMetrics(draft.components, products, draft.price),
    [draft.components, products, draft.price],
  )

  const setField = (field) => (e) => onChange({ ...draft, [field]: e.target.value })
  const handlePick = (product) => onChange({ ...draft, components: addComponent(draft.components, product.id) })
  const handleQty = (productId, quantity) =>
    onChange({ ...draft, components: setComponentQty(draft.components, productId, quantity) })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="sr-only">Datos del combo</legend>
          <div className="sm:col-span-2">
            <Label htmlFor="combo-name">Nombre</Label>
            <Input
              id="combo-name"
              value={draft.name}
              onChange={setField('name')}
              placeholder="Combo previa"
              autoFocus
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="combo-price">Precio de venta</Label>
            <div className="relative">
              <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">
                $
              </span>
              <Input
                id="combo-price"
                type="number"
                inputMode="numeric"
                min="0"
                value={draft.price}
                onChange={setField('price')}
                placeholder="12000"
                className="pl-7"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="combo-category">Categoría</Label>
            <Select id="combo-category" value={draft.category} onChange={setField('category')}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="combo-barcode">Código de barras (opcional)</Label>
            <Input
              id="combo-barcode"
              value={draft.barcode}
              onChange={setField('barcode')}
              placeholder="Escaneá o escribí un código propio"
              autoComplete="off"
            />
          </div>
        </fieldset>

        <section aria-labelledby="combo-components" className="flex flex-col gap-3">
          <h3 id="combo-components" className="font-heading text-sm font-bold">
            Productos del combo
          </h3>
          <ComponentPicker products={products} onPick={handlePick} />
          <ComponentList lines={lines} onChangeQty={handleQty} />
        </section>
      </div>

      <ComboRecipe lines={lines} price={draft.price} metrics={metrics} />
    </div>
  )
}
