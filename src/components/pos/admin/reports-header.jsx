'use client'

import { useState } from 'react'
import { MoreHorizontal, Calendar, CreditCard, ChevronDown, Check } from 'lucide-react'

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
    <div className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
      {/* 1. Medio de pago */}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 mb-1 block h-3.5 leading-none">
          Medio de pago
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMethodMenuOpen(!methodMenuOpen)}
            className="h-10 px-3 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer whitespace-nowrap box-border"
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

      {/* 2 y 3. Fechas Desde y Hasta */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 mb-1 block h-3.5 leading-none">
            Desde
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-10 min-h-0 w-32 sm:w-36 rounded-xl border border-border/80 bg-background px-2.5 py-0 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs font-medium leading-none box-border"
          />
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 mb-1 block h-3.5 leading-none">
            Hasta
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-10 min-h-0 w-32 sm:w-36 rounded-xl border border-border/80 bg-background px-2.5 py-0 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs font-medium leading-none box-border"
          />
        </div>
      </div>

      {/* 4. Menú rápido / presets */}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5 mb-1 block h-3.5 leading-none select-none opacity-0" aria-hidden="true">
          Acción
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground transition-colors hover:bg-muted/80 shadow-2xs cursor-pointer box-border"
            aria-label="Opciones de periodo"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1.5 w-40 rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
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
    </div>
  )
}
