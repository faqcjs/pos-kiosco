import { Button } from '@/components/ui/button'
import { Card, Input, Label, Select } from '@/components/ui/kit'
import { EXPENSE_CATEGORIES } from '@/lib/expenses'
import { cn } from '@/lib/utils'
import { EGRESO_KIND, EGRESO_KINDS, MOVEMENT_TYPES } from './movement-request'
import { useMovementForm } from './use-movement-form'

const EGRESO_TYPE = 'egreso'

function EgresoKindPicker({ value, onChange }) {
  const hint = EGRESO_KINDS.find((k) => k.id === value)?.hint
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">Motivo del egreso</legend>
      <div className="grid grid-cols-3 gap-2">
        {EGRESO_KINDS.map((kind) => (
          <label
            key={kind.id}
            className={cn(
              'flex items-center justify-center px-2 min-h-11 text-center text-sm font-medium rounded-xl border border-input cursor-pointer transition-colors',
              value === kind.id && 'text-primary bg-primary/10 border-primary',
            )}
          >
            <input
              type="radio"
              name="egresoKind"
              value={kind.id}
              checked={value === kind.id}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            {kind.label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  )
}

function EgresoDetailFields({ form, setField, supplierOptions }) {
  if (form.egresoKind === EGRESO_KIND.GASTO) {
    return (
      <>
        <div>
          <Label htmlFor="movcategory">Categoría</Label>
          <Select id="movcategory" value={form.category} onChange={(e) => setField('category', e.target.value)}>
            <option value="">Elegí una categoría</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="movdescription">Descripción</Label>
          <Input
            id="movdescription"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Ej: sueldo Juan, factura de luz"
          />
        </div>
      </>
    )
  }
  if (form.egresoKind === EGRESO_KIND.PROVEEDOR) {
    return (
      <div className="sm:col-span-2">
        <Label htmlFor="movsupplier">Proveedor</Label>
        <Select id="movsupplier" value={form.supplierId} onChange={(e) => setField('supplierId', e.target.value)}>
          <option value="">Elegí un proveedor</option>
          {supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
    )
  }
  return null
}

export function MovementForm({ actions, suppliers, toast }) {
  const { form, setField, submit, saving, supplierOptions } = useMovementForm({ actions, suppliers, toast })
  const isEgreso = form.type === EGRESO_TYPE
  const needsReasonText = !isEgreso || form.egresoKind === EGRESO_KIND.RETIRO

  return (
    <section>
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Registrar movimiento</h3>
        <form onSubmit={submit} className="grid gap-3 mt-3 sm:grid-cols-2 sm:items-end">
          <div>
            <Label htmlFor="movtype">Tipo</Label>
            <Select id="movtype" value={form.type} onChange={(e) => setField('type', e.target.value)}>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="movamount">Monto</Label>
            <Input
              id="movamount"
              type="number"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              placeholder="0"
            />
          </div>
          {isEgreso && <EgresoKindPicker value={form.egresoKind} onChange={(v) => setField('egresoKind', v)} />}
          {isEgreso && <EgresoDetailFields form={form} setField={setField} supplierOptions={supplierOptions} />}
          {needsReasonText && (
            <div className="sm:col-span-2">
              <Label htmlFor="movreason">Motivo</Label>
              <Input
                id="movreason"
                value={form.reason}
                onChange={(e) => setField('reason', e.target.value)}
                placeholder={isEgreso ? 'Ej: retiro del dueño' : 'Ej: cambio inicial extra'}
              />
            </div>
          )}
          <Button type="submit" className="h-11 w-full sm:col-span-2 sm:justify-self-end sm:w-auto" disabled={saving}>
            {saving ? 'Registrando…' : 'Registrar'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
