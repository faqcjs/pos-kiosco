'use client'

import { useState, useEffect } from 'react'
import { Modal, Input } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Percent, DollarSign, Tag } from 'lucide-react'

export function ExtrasModal({
  open,
  onClose,
  subtotal = 0,
  extraType = 'descuento',
  extraCalc = 'porcentaje',
  extraValue = 0,
  onApply,
}) {
  const [type, setType] = useState(extraType || 'descuento')
  const [calc, setCalc] = useState(extraCalc || 'porcentaje')
  const [val, setVal] = useState(extraValue ? String(extraValue) : '')

  useEffect(() => {
    if (open) {
      setType(extraType || 'descuento')
      setCalc(extraCalc || 'porcentaje')
      setVal(extraValue ? String(extraValue) : '')
    }
  }, [open, extraType, extraCalc, extraValue])

  const numVal = Math.max(0, Number(val) || 0)
  const extraAmount = calc === 'porcentaje' ? (subtotal * numVal) / 100 : numVal
  const finalTotal = type === 'descuento' ? Math.max(0, subtotal - extraAmount) : subtotal + extraAmount

  return (
    <Modal open={open} onClose={onClose} title="Gestionar extras">
      <div className="space-y-4 pt-1">
        {/* Subtotal actual */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
          <span className="text-xs text-muted-foreground font-medium">Subtotal de la venta</span>
          <span className="font-heading text-base font-bold text-foreground">{money(subtotal)}</span>
        </div>

        {/* Tipo de Ajuste: Descuento o Recargo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Tipo de ajuste</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('descuento')}
              className={cn(
                'py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                type === 'descuento'
                  ? 'border-destructive bg-destructive/10 text-destructive shadow-2xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Tag className="size-3.5" />
              Descuento (-)
            </button>
            <button
              type="button"
              onClick={() => setType('recargo')}
              className={cn(
                'py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                type === 'recargo'
                  ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Tag className="size-3.5 rotate-180" />
              Recargo (+)
            </button>
          </div>
        </div>

        {/* Tipo de Cálculo: Porcentaje o Monto Fijo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Tipo de cálculo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCalc('porcentaje')}
              className={cn(
                'py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                calc === 'porcentaje'
                  ? 'border-foreground bg-foreground text-background shadow-2xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Percent className="size-3.5" />
              Porcentaje (%)
            </button>
            <button
              type="button"
              onClick={() => setCalc('monto')}
              className={cn(
                'py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                calc === 'monto'
                  ? 'border-foreground bg-foreground text-background shadow-2xs'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <DollarSign className="size-3.5" />
              Monto fijo ($)
            </button>
          </div>
        </div>

        {/* Valor Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            {calc === 'porcentaje' ? 'Porcentaje de descuento/recargo' : 'Monto fijo de descuento/recargo'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">
              {calc === 'porcentaje' ? '%' : '$'}
            </span>
            <Input
              type="number"
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="0"
              className="pl-8 text-base font-bold h-11"
            />
          </div>
        </div>

        {/* Resumen Calculado */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Ajuste calculado:</span>
            <span className={cn('font-bold text-sm', type === 'descuento' ? 'text-destructive' : 'text-primary')}>
              {type === 'descuento' ? '-' : '+'}{money(extraAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="font-bold text-foreground text-sm">Total final a cobrar:</span>
            <span className="font-heading text-xl font-extrabold text-foreground">{money(finalTotal)}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 pt-2">
          {numVal > 0 && (
            <button
              type="button"
              onClick={() => {
                onApply({ type: 'descuento', calc: 'porcentaje', value: 0 })
                onClose()
              }}
              className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer"
            >
              Quitar extras
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onApply({ type, calc, value: numVal })
              onClose()
            }}
            className="flex-1 py-3 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Aplicar extras
          </button>
        </div>
      </div>
    </Modal>
  )
}
