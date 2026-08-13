'use client'

import { ArrowLeft, CheckCircle, Loader2, Zap, ScanBarcode, AlertTriangle } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { ScannerModal } from '@/components/pos/venta/scanner-modal'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON } from '@/lib/types'
import { fetchOpenFoodFacts } from '@/lib/open-food-facts'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'carga-rapida-category'

const EMPTY_DRAFT = {
  barcode: '',
  name: '',
  brand: '',
  image: '',
  cost: '',
  price: '',
  stock: '1',
}

export function CargaRapida({ onClose }) {
  const { state, addProduct } = useStore()
  const toast = useToast()

  const [category, setCategory] = useState(
    () => sessionStorage.getItem(SESSION_KEY) || CATEGORIES[0],
  )
  const [scannerOpen, setScannerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [offLoading, setOffLoading] = useState(false)
  const [offFound, setOffFound] = useState(false)
  const [duplicate, setDuplicate] = useState(null)
  const [phase, setPhase] = useState('scan')
  const [saved, setSaved] = useState(0)

  const nameRef = useRef(null)
  const costRef = useRef(null)

  function selectCategory(cat) {
    setCategory(cat)
    sessionStorage.setItem(SESSION_KEY, cat)
  }

  function openScanner() {
    setScannerOpen(true)
  }

  async function handleBarcode(code) {
    setScannerOpen(false)

    const existing = state.products.find((p) => p.barcode === code)
    if (existing) {
      setDuplicate(existing)
      setDraft({ ...EMPTY_DRAFT, barcode: code })
      setOffFound(false)
      setPhase('form')
      setTimeout(() => nameRef.current?.focus(), 150)
      return
    }

    setDuplicate(null)
    setOffLoading(true)
    setPhase('form')
    setDraft({ ...EMPTY_DRAFT, barcode: code })
    setOffFound(false)

    const offData = await fetchOpenFoodFacts(code)
    setOffLoading(false)

    if (offData) {
      setOffFound(true)
      setDraft((prev) => ({
        ...prev,
        name: offData.name || '',
        brand: offData.brand || '',
        image: offData.image || '',
      }))
      setTimeout(() => {
        if (offData.name) {
          costRef.current?.focus()
        } else {
          nameRef.current?.focus()
        }
      }, 150)
    } else {
      setTimeout(() => nameRef.current?.focus(), 150)
    }
  }

  function handleSave() {
    if (!draft.name.trim()) {
      toast('Ingresá el nombre del producto', 'error')
      nameRef.current?.focus()
      return
    }

    addProduct({
      barcode: draft.barcode,
      name: draft.name.trim(),
      category,
      cost: Number(draft.cost) || 0,
      price: Number(draft.price) || 0,
      stock: Number(draft.stock) || 1,
      minStock: 0,
      unidad: 1,
      controlLotes: false,
    })

    setSaved((n) => n + 1)
    toast(`✓ ${draft.name.trim()} agregado`, 'success')

    setDraft(EMPTY_DRAFT)
    setOffFound(false)
    setDuplicate(null)
    setPhase('scan')
    setTimeout(() => setScannerOpen(true), 600)
  }

  function handleSkipDuplicate() {
    setDuplicate(null)
    setTimeout(() => nameRef.current?.focus(), 100)
  }

  function backToScan() {
    setPhase('scan')
    setDraft(EMPTY_DRAFT)
    setOffFound(false)
    setDuplicate(null)
  }

  const profitAmount = Number(draft.price) - Number(draft.cost)
  const profitPercentage = Number(draft.cost) > 0 ? Math.round((profitAmount / Number(draft.cost)) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            aria-label="Salir de carga rápida"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 font-heading text-base sm:text-lg font-bold">
              <Zap className="size-5 text-primary animate-pulse" />
              Carga Rápida de Stock
            </div>
            {saved > 0 && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ✓ {saved} producto{saved !== 1 ? 's' : ''} cargado{saved !== 1 ? 's' : ''} esta sesión
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar [Esc]
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {phase === 'scan' ? (
            /* ── SCAN PHASE ── */
            <div className="space-y-6">
              {/* Category Selector Grid */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-foreground">
                      1. Seleccioná la Categoría
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Los productos que escanees se asignarán a esta categoría
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary shrink-0">
                    {CATEGORY_ICON[category]} {category}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c
                    return (
                      <button
                        key={c}
                        onClick={() => selectCategory(c)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 active:scale-95',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20 shadow-sm'
                            : 'border-border bg-background hover:bg-accent/50 text-foreground'
                        )}
                      >
                        <span className="text-xl shrink-0">{CATEGORY_ICON[c]}</span>
                        <span className="truncate text-xs sm:text-sm font-medium">{c}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Scanner Trigger Card */}
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-sm text-center flex flex-col items-center justify-center gap-5">
                <div className="flex size-16 sm:size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <ScanBarcode className="size-8 sm:size-10" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">2. Escaneá el código</h3>
                  <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground mx-auto">
                    Presioná el botón para abrir la cámara de tu celular o PC y escanear el código de barras.
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={openScanner}
                  className="h-14 px-8 text-base font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all gap-3 w-full sm:w-auto"
                >
                  <ScanBarcode className="size-6" />
                  Abrir Escáner de Cámara
                </Button>
              </div>
            </div>
          ) : (
            /* ── FORM PHASE ── */
            <div className="space-y-5">
              {/* Top Banner Warnings/Info */}
              {duplicate && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-bold text-amber-800 dark:text-amber-300">
                        ¡Este código ya existe en el stock!
                      </p>
                      <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                        Registrado como: <strong>{duplicate.name}</strong> · Categoría: {duplicate.category} · Stock actual: {duplicate.stock}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={backToScan}
                          className="h-8 text-xs bg-background"
                        >
                          Volver a escanear
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSkipDuplicate}
                          className="h-8 text-xs bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30"
                        >
                          Agregar como nuevo producto
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {offLoading && (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary animate-pulse">
                  <Loader2 className="size-5 animate-spin shrink-0" />
                  <span>Buscando información en OpenFoodFacts…</span>
                </div>
              )}

              {offFound && !offLoading && (
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
                  {draft.image && (
                    <img
                      src={draft.image}
                      alt="Preview"
                      className="size-14 rounded-xl border border-emerald-500/20 bg-white object-contain p-1 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
                      <CheckCircle className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      Producto encontrado en OpenFoodFacts
                    </div>
                    {draft.brand && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 opacity-90 mt-0.5">
                        Marca: {draft.brand}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Product Edit Card */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-5">
                {/* Meta info bar: Barcode & Category */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3.5 py-1.5 text-xs font-mono">
                    <ScanBarcode className="size-4 text-muted-foreground" />
                    <span className="font-semibold">{draft.barcode || 'Sin código'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Categoría:</span>
                    <select
                      value={category}
                      onChange={(e) => selectCategory(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_ICON[c]} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="qr-name" className="text-sm font-semibold">
                    Nombre del producto *
                  </Label>
                  <Input
                    id="qr-name"
                    ref={nameRef}
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Coca Cola 2.25L"
                    className="h-12 text-base rounded-xl"
                    autoComplete="off"
                  />
                </div>

                {/* Cost + Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-cost" className="text-sm font-semibold">
                      Costo ($)
                    </Label>
                    <Input
                      id="qr-cost"
                      ref={costRef}
                      type="number"
                      inputMode="decimal"
                      value={draft.cost}
                      onChange={(e) => setDraft((p) => ({ ...p, cost: e.target.value }))}
                      placeholder="0"
                      className="h-12 text-base rounded-xl"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="qr-price" className="text-sm font-semibold">
                      Precio Final ($)
                    </Label>
                    <Input
                      id="qr-price"
                      type="number"
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0"
                      className="h-12 text-base font-bold rounded-xl"
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') document.getElementById('qr-stock')?.focus()
                      }}
                    />
                  </div>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-stock" className="text-sm font-semibold">
                      Stock inicial
                    </Label>
                    <Input
                      id="qr-stock"
                      type="number"
                      inputMode="numeric"
                      value={draft.stock}
                      onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.value }))}
                      placeholder="1"
                      className="h-12 text-base rounded-xl"
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave()
                      }}
                    />
                  </div>

                  {/* Margin calculation badge */}
                  {Number(draft.cost) > 0 && Number(draft.price) > 0 && (
                    <div
                      className={cn(
                        'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium h-12',
                        profitAmount >= 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-destructive/10 text-destructive'
                      )}
                    >
                      <span>Margen estimado:</span>
                      <span className="font-bold">
                        {profitAmount >= 0 ? '+' : ''}${profitAmount.toFixed(0)} ({profitPercentage}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={backToScan}
                  className="h-12 rounded-xl text-sm font-medium sm:w-1/3"
                >
                  ← Volver a escanear
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={offLoading}
                  className="h-12 rounded-xl text-base font-bold sm:w-2/3 shadow-lg shadow-primary/20"
                >
                  {offLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    'Guardar y seguir escaneando →'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScannerModal
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          if (phase === 'scan') setPhase('scan')
        }}
        onDetect={handleBarcode}
      />
    </div>
  )
}
