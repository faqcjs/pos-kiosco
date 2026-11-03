'use client'

import { useState, useMemo } from 'react'
import {
  Package,
  Plus,
  Trash2,
  X,
  Search,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal, Card, Input, Label, Badge, Select } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CATEGORIES, CATEGORY_ICON } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CombosModal({ open, onClose }) {
  const { state, addProduct, deleteProduct, addComboItem } = useStore()
  const toast = useToast()

  const [isCreating, setIsCreating] = useState(false)
  const [comboName, setComboName] = useState('')
  const [comboPrice, setComboPrice] = useState('')
  const [comboCategory, setComboCategory] = useState('Bebidas')
  const [comboBarcode, setComboBarcode] = useState('')
  const [selectedComponents, setSelectedComponents] = useState([]) // [{ product, quantity }]
  const [componentSearch, setComponentSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Combos existentes
  const existingCombos = useMemo(() => {
    return (state.products || []).filter((p) => p.isCombo)
  }, [state.products])

  // Componentes mapeados por comboId
  const comboComponentsMap = useMemo(() => {
    const map = new Map()
    const productMap = new Map((state.products || []).map((p) => [p.id, p]))

    for (const ci of state.comboItems || []) {
      const list = map.get(ci.comboId) || []
      const prod = productMap.get(ci.productId)
      list.push({
        ...ci,
        productName: prod?.name || 'Producto desconocido',
        productPrice: prod?.price || 0,
        productCost: prod?.cost || 0,
        productStock: prod?.stock || 0,
      })
      map.set(ci.comboId, list)
    }
    return map
  }, [state.comboItems, state.products])

  // Candidatos para agregar como componentes (excluyendo combos)
  const candidateProducts = useMemo(() => {
    const q = componentSearch.trim().toLowerCase()
    const raw = (state.products || []).filter((p) => !p.isCombo)
    if (!q) return raw.slice(0, 10)
    return raw
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 10)
  }, [state.products, componentSearch])

  // Costo acumulado de componentes del combo en creación
  const estimatedCost = useMemo(() => {
    return selectedComponents.reduce((sum, item) => sum + (item.product.cost || 0) * item.quantity, 0)
  }, [selectedComponents])

  // Componentes sin costo cargado: el combo cuenta como venta sin costo en los reportes
  const missingCostNames = useMemo(
    () => selectedComponents.filter((item) => !(item.product.cost > 0)).map((item) => item.product.name),
    [selectedComponents]
  )

  const margin = useMemo(() => {
    const p = Number(comboPrice) || 0
    return p - estimatedCost
  }, [comboPrice, estimatedCost])

  function resetForm() {
    setComboName('')
    setComboPrice('')
    setComboCategory('Bebidas')
    setComboBarcode('')
    setSelectedComponents([])
    setComponentSearch('')
    setIsCreating(false)
  }

  function handleAddComponent(product) {
    setSelectedComponents((prev) => {
      const exists = prev.find((item) => item.product.id === product.id)
      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setComponentSearch('')
  }

  function handleUpdateQuantity(productId, newQty) {
    if (newQty <= 0) {
      handleRemoveComponent(productId)
      return
    }
    setSelectedComponents((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    )
  }

  function handleRemoveComponent(productId) {
    setSelectedComponents((prev) => prev.filter((item) => item.product.id !== productId))
  }

  async function handleSaveCombo() {
    if (!comboName.trim()) {
      toast('Ingresá el nombre del combo', 'error')
      return
    }
    const priceNum = Number(comboPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      toast('Ingresá un precio de venta válido', 'error')
      return
    }
    if (selectedComponents.length === 0) {
      toast('Agregá al menos un producto al combo', 'error')
      return
    }

    setIsSaving(true)
    try {
      // 1. Crear el producto tipo combo
      const newProduct = await addProduct({
        name: comboName.trim(),
        price: priceNum,
        cost: estimatedCost,
        category: comboCategory,
        barcode: comboBarcode.trim() || undefined,
        stock: 0,
        isCombo: true,
      })

      if (!newProduct || !newProduct.id) {
        throw new Error('Error al registrar el producto combo')
      }

      // 2. Asociar los componentes en combo_items
      for (const comp of selectedComponents) {
        await addComboItem({
          comboId: newProduct.id,
          productId: comp.product.id,
          quantity: comp.quantity,
        })
      }

      toast(`¡Combo "${newProduct.name}" creado con éxito!`, 'success')
      resetForm()
    } catch (err) {
      console.error(err)
      toast(err.message || 'Error al guardar el combo', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCombo(combo) {
    if (!confirm(`¿Eliminar el combo "${combo.name}"? Los productos individuales no se borrarán.`)) {
      return
    }
    try {
      await deleteProduct(combo.id)
      toast(`Combo "${combo.name}" eliminado`, 'info')
    } catch (err) {
      console.error(err)
      toast('Error al eliminar combo', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title="Gestor de Combos y Packs"
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Cabecera / Selector de vista */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-sm text-muted-foreground">
              Creá paquetes de productos (ej. Fernet + Coca). El stock y costo se calculan en base a los componentes.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreating((prev) => !prev)}
            variant={isCreating ? 'outline' : 'default'}
            className="shrink-0 flex items-center gap-1.5"
          >
            {isCreating ? (
              <>
                <X className="size-4" /> Cancelar
              </>
            ) : (
              <>
                <Plus className="size-4" /> Nuevo Combo
              </>
            )}
          </Button>
        </div>

        {/* Formulario de creación */}
        {isCreating ? (
          <div className="space-y-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-sm">
              <Sparkles className="size-4" />
              <span>Nuevo Combo de Productos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nombre del Combo</Label>
                <Input
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  placeholder="ej. Combo Previa (Fernet + Coca)"
                  autoFocus
                />
              </div>

              <div>
                <Label>Precio de Venta del Combo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <Input
                    type="number"
                    value={comboPrice}
                    onChange={(e) => setComboPrice(e.target.value)}
                    placeholder="12000"
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label>Categoría</Label>
                <Select
                  value={comboCategory}
                  onChange={(e) => setComboCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Código de Barras (Opcional)</Label>
                <Input
                  value={comboBarcode}
                  onChange={(e) => setComboBarcode(e.target.value)}
                  placeholder="Escanear o ingresar código propio"
                />
              </div>
            </div>

            {/* Selector de componentes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center justify-between">
                <span>Productos que integran el combo</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedComponents.length} agregados
                </span>
              </Label>

              {/* Buscador de productos para sumar al combo */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  placeholder="Buscar producto de góndola para agregar al combo..."
                  className="pl-9 h-10 text-sm"
                />
              </div>

              {componentSearch.trim() && candidateProducts.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-1 shadow-md max-h-48 overflow-y-auto space-y-1">
                  {candidateProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddComponent(p)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span>{CATEGORY_ICON[p.category] || '📦'}</span>
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">({p.stock} u. en stock)</span>
                      </div>
                      <div className="text-xs font-semibold tabular-nums text-primary shrink-0">
                        {money(p.price)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Lista de productos componentes seleccionados */}
              {selectedComponents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Buscá y seleccioná los productos que forman parte de este combo (ej. 1 Fernet y 1 Coca).
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedComponents.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Costo: {money(item.product.cost)} | Stock disp: {item.product.stock} u.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Cant:</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.product.id, Number(e.target.value))}
                            className="w-16 h-8 text-center text-sm px-1"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComponent(item.product.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Quitar componente"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen de costos y margen */}
            {selectedComponents.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-xs border border-border">
                <div>
                  <span className="text-muted-foreground">Costo acumulado: </span>
                  <strong className="text-foreground">{money(estimatedCost)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio venta: </span>
                  <strong className="text-foreground">{money(Number(comboPrice) || 0)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Margen estimado: </span>
                  <strong className={margin >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                    {money(margin)}
                  </strong>
                </div>
              </div>
            )}

            {missingCostNames.length > 0 && (
              <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                Sin costo cargado: <strong>{missingCostNames.join(', ')}</strong>. Mientras falte, las ventas de este combo
                no se cuentan en la ganancia estimada.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCombo} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSaving ? 'Guardando...' : 'Crear Combo'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Lista de combos existentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground">
              Combos Activos ({existingCombos.length})
            </h3>
          </div>

          {existingCombos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border">
              <Package className="size-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No tenés combos creados todavía.</p>
              <p className="text-xs mt-1">Hacé clic en "Nuevo Combo" para armar el primero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {existingCombos.map((combo) => {
                const components = comboComponentsMap.get(combo.id) || []
                return (
                  <Card key={combo.id} className="p-3.5 space-y-2 border-border/80 hover:border-purple-500/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{combo.name}</span>
                          <Badge tone="primary" className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
                            Combo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{combo.category || 'Varios'}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCombo(combo)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        title="Eliminar combo"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-xs text-muted-foreground">Precio: </span>
                        <span className="font-heading text-base font-bold text-primary">{money(combo.price)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Stock virtual: </span>
                        <span className={cn("text-xs font-bold tabular-nums", combo.stock > 0 ? "text-success" : "text-destructive")}>
                          {combo.stock > 0 ? `${combo.stock} armables` : 'Agotado'}
                        </span>
                      </div>
                    </div>

                    {/* Componentes */}
                    <div className="pt-2 border-t border-border/60 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Componentes:
                      </span>
                      <div className="space-y-0.5">
                        {components.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Sin componentes asociados</span>
                        ) : (
                          components.map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-xs text-foreground/80">
                              <span className="truncate">
                                {c.quantity}x {c.productName}
                                {!(c.productCost > 0) && (
                                  <span className="ml-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">Sin costo</span>
                                )}
                              </span>
                              <span className="text-muted-foreground text-[11px] tabular-nums">({c.productStock} disp.)</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
