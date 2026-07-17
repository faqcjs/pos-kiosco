'use client'

import { ArrowLeft, CheckCircle, Loader2, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/kit'
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

  // Category is persisted in sessionStorage so it survives between scans
  const [category, setCategory] = useState(
    () => sessionStorage.getItem(SESSION_KEY) || CATEGORIES[0],
  )
  const [scannerOpen, setScannerOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [offLoading, setOffLoading] = useState(false)
  const [offFound, setOffFound] = useState(false)
  const [duplicate, setDuplicate] = useState(null) // existing product if barcode already in stock
  const [phase, setPhase] = useState('scan') // 'scan' | 'form'
  const [saved, setSaved] = useState(0) // count of products saved this session

  const nameRef = useRef(null)
  const costRef = useRef(null)

  function handleCategoryChange(e) {
    const val = e.target.value
    setCategory(val)
    sessionStorage.setItem(SESSION_KEY, val)
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
      // Focus name after render so user can proceed if they want
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
      // If OFF filled the name, jump to cost; otherwise focus name
      setTimeout(() => {
        if (offData.name) {
          costRef.current?.focus()
        } else {
          nameRef.current?.focus()
        }
      }, 150)
    } else {
      // Not in OFF — focus name for manual entry
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

    // Reset and go straight back to scanner
    setDraft(EMPTY_DRAFT)
    setOffFound(false)
    setDuplicate(null)
    setPhase('scan')
    // Small delay so user sees the toast before camera opens
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Salir de carga rápida"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 font-heading text-base font-bold">
              <Zap className="size-4 text-primary" />
              Carga rápida
            </div>
            {saved > 0 && (
              <p className="text-xs text-muted-foreground">
                {saved} producto{saved !== 1 ? 's' : ''} cargado{saved !== 1 ? 's' : ''} esta sesión
              </p>
            )}
          </div>
        </div>

        {/* Category selector — fixed, persists between scans */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{CATEGORY_ICON[category]}</span>
          <select
            value={category}
            onChange={handleCategoryChange}
            className="h-9 max-w-[140px] appearance-none rounded-xl border border-input bg-background px-2.5 text-sm font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICON[c]} {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {phase === 'scan' ? (
          /* ── Scan phase ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
            <div className="text-center">
              <p className="text-lg font-semibold">Escaneá un producto</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Categoría activa:{' '}
                <span className="font-medium text-foreground">
                  {CATEGORY_ICON[category]} {category}
                </span>
              </p>
            </div>
            <button
              onClick={openScanner}
              className="flex size-28 flex-col items-center justify-center gap-2 rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <span className="text-4xl">📷</span>
              <span className="text-sm font-semibold">Escanear</span>
            </button>
            <p className="text-xs text-muted-foreground">
              O podés ingresar el código manualmente desde el escáner
            </p>
          </div>
        ) : (
          /* ── Form phase ── */
          <div className="mx-auto w-full max-w-lg space-y-4 p-4">
            {/* Duplicate warning */}
            {duplicate && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚠️ Este código ya existe en el stock
                </p>
                <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/80">
                  <strong>{duplicate.name}</strong> · {duplicate.category} · stock: {duplicate.stock}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={backToScan}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Volver a escanear
                  </button>
                  <button
                    onClick={handleSkipDuplicate}
                    className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 transition-colors"
                  >
                    Agregar de todos modos
                  </button>
                </div>
              </div>
            )}

            {/* OFF loading indicator */}
            {offLoading && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando en OpenFoodFacts…
              </div>
            )}

            {/* OFF found badge */}
            {offFound && !offLoading && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                {draft.image && (
                  <img
                    src={draft.image}
                    alt="Producto"
                    className="h-12 w-12 shrink-0 rounded-lg border border-emerald-500/20 object-contain bg-white"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle className="size-3.5 shrink-0" />
                    Encontrado en OpenFoodFacts
                  </div>
                  {draft.brand && (
                    <p className="mt-0.5 text-xs opacity-80">{draft.brand}</p>
                  )}
                </div>
              </div>
            )}

            {/* Barcode (read-only display) */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Código de barras</span>
              <span className="font-mono text-sm font-medium">{draft.barcode || '—'}</span>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="qr-name">Nombre del producto</Label>
              <Input
                id="qr-name"
                ref={nameRef}
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nombre del producto"
                autoComplete="off"
              />
            </div>

            {/* Cost + Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qr-cost">Costo</Label>
                <Input
                  id="qr-cost"
                  ref={costRef}
                  type="number"
                  inputMode="numeric"
                  value={draft.cost}
                  onChange={(e) => setDraft((p) => ({ ...p, cost: e.target.value }))}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div>
                <Label htmlFor="qr-price">Precio final</Label>
                <Input
                  id="qr-price"
                  type="number"
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') document.getElementById('qr-stock')?.focus()
                  }}
                />
              </div>
            </div>

            {/* Stock */}
            <div>
              <Label htmlFor="qr-stock">Stock inicial</Label>
              <Input
                id="qr-stock"
                type="number"
                inputMode="numeric"
                value={draft.stock}
                onChange={(e) => setDraft((p) => ({ ...p, stock: e.target.value }))}
                placeholder="1"
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
              />
            </div>

            {/* Margin indicator */}
            {Number(draft.cost) > 0 && Number(draft.price) > 0 && (
              <div className={cn(
                'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm',
                Number(draft.price) >= Number(draft.cost) ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-destructive/10 text-destructive',
              )}>
                <span>Ganancia</span>
                <span className="font-semibold tabular-nums">
                  +${(Number(draft.price) - Number(draft.cost)).toFixed(2)} (
                  {Math.round(((Number(draft.price) - Number(draft.cost)) / Number(draft.cost)) * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions — only in form phase */}
      {phase === 'form' && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-lg gap-3">
            <Button
              variant="outline"
              className="h-12 flex-none px-4"
              onClick={backToScan}
            >
              ← Volver
            </Button>
            <Button
              className="h-12 flex-1 text-base font-bold"
              onClick={handleSave}
              disabled={offLoading}
            >
              {offLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Guardar y seguir →'
              )}
            </Button>
          </div>
        </div>
      )}

      <ScannerModal
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          if (phase === 'scan') setPhase('scan') // stays on scan screen
        }}
        onDetect={handleBarcode}
      />
    </div>
  )
}
