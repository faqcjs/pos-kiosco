'use client'

import { useState } from 'react'
import { MoreHorizontal, RotateCcw, Calendar, CreditCard, ChevronDown, Check } from 'lucide-react'

export function ReportsHeader({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApplyPreset,
  onRefresh,
  paymentMethod = 'todos',
  onPaymentMethodChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [methodMenuOpen, setMethodMenuOpen] = useState(false)

  const handlePresetSelect = (preset) => {
    onApplyPreset(preset)
    setMenuOpen(false)
  }

  const paymentOptions = [
    { id: 'todos', label: 'Todos los pagos' },
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'qr', label: 'Mercado Pago / QR' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'fiado', label: 'Fiado' },
  ]

  const activeMethodLabel = paymentOptions.find((o) => o.id === paymentMethod)?.label || 'Todos los pagos'

  return (
    <div className="flex items-end sm:items-center gap-2 flex-wrap sm:flex-nowrap">
      {/* Botón de Filtro por Método de Pago (A LA IZQUIERDA DE LAS FECHAS) */}
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5 mb-0.5">
          Medio de pago
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMethodMenuOpen(!methodMenuOpen)}
            className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="size-3.5 text-primary shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[140px]">{activeMethodLabel}</span>
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          </button>

          {methodMenuOpen && (
            <div className="absolute left-0 z-30 mt-1.5 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onPaymentMethodChange?.(opt.id)
                    setMethodMenuOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    paymentMethod === opt.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{opt.label}</span>
                  {paymentMethod === opt.id && <Check className="size-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fechas: fila compacta */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5 mb-0.5">
            Desde
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-9 w-32 sm:w-36 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-0.5 mb-0.5">
            Hasta
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-9 w-32 sm:w-36 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs"
          />
        </div>
      </div>

      {/* Menú rápido */}
      <div className="relative self-end sm:self-auto">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted shadow-2xs cursor-pointer"
          aria-label="Opciones de periodo"
        >
          <MoreHorizontal className="size-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-30 mt-1.5 w-40 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
            <button
              onClick={() => {
                onRefresh?.()
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <RotateCcw className="size-3.5 text-muted-foreground" />
              Recargar
            </button>

            <hr className="my-1 border-border/60" />

            <button
              onClick={() => handlePresetSelect('hoy')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              Hoy
            </button>

            <button
              onClick={() => handlePresetSelect('mes')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              Este mes
            </button>

            <button
              onClick={() => handlePresetSelect('anio')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <Calendar className="size-3.5 text-muted-foreground" />
              Este año
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
