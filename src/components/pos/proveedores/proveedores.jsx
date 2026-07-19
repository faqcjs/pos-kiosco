'use client'

import { useMemo, useState, useEffect } from 'react'
import { ArrowLeft, PackagePlus, Plus, Search, Truck, Wallet, Pencil, MessageCircle, Calendar, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Label, Modal, Select, StatCard } from '@/components/ui/kit'
import { PageHeader } from '@/components/pos/page-header'
import { supplierBalance, useStore } from '@/lib/store'
import { formatDateTime, money, uid } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const SUPPLIER_CATEGORIES = [
  'Varios',
  'Golosinas',
  'Bebidas',
  'Cigarrillos',
  'Lácteos/Fiambres',
  'Almacén',
  'Panificados',
  'Helados',
  'Limpieza/Bazar',
]

const DAYS_OF_WEEK = [
  { value: 'Lunes', short: 'Lun', letter: 'L' },
  { value: 'Martes', short: 'Mar', letter: 'M' },
  { value: 'Miércoles', short: 'Mié', letter: 'X' },
  { value: 'Jueves', short: 'Jue', letter: 'J' },
  { value: 'Viernes', short: 'Vie', letter: 'V' },
  { value: 'Sábado', short: 'Sáb', letter: 'S' },
  { value: 'Domingo', short: 'Dom', letter: 'D' },
]

const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getWhatsAppLink(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 10 && !cleaned.startsWith('54')) {
    return `https://wa.me/549${cleaned}`
  }
  return `https://wa.me/${cleaned}`
}

export function Proveedores() {
  const { state, addSupplier, updateSupplier, deleteSupplier, receiveGoods, registerSupplierPayment } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  
  // Modal & Form States
  const [formOpen, setFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [category, setCategory] = useState('Varios')
  const [deliveryDays, setDeliveryDays] = useState([])

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [viewFilter, setViewFilter] = useState('todos') // 'todos' | 'deuda' | 'visita_hoy'

  const suppliers = state.suppliers
  const selected = suppliers.find((s) => s.id === selectedId) ?? null

  const todayDayName = useMemo(() => {
    return SPANISH_DAYS[new Date().getDay()]
  }, [])

  const totalDebt = useMemo(
    () => suppliers.reduce((sum, s) => sum + Math.max(0, supplierBalance(s)), 0),
    [suppliers],
  )

  const visitingTodayCount = useMemo(() => {
    return suppliers.filter((s) => s.delivery_days?.includes(todayDayName)).length
  }, [suppliers, todayDayName])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = suppliers

    // Text search filter
    if (q) {
      list = list.filter((s) => 
        s.name.toLowerCase().includes(q) || 
        (s.contact_name && s.contact_name.toLowerCase().includes(q))
      )
    }

    // Category pill filter
    if (selectedCategory !== 'Todos') {
      list = list.filter((s) => s.category === selectedCategory)
    }

    // Quick filter dropdown/tabs
    if (viewFilter === 'deuda') {
      list = list.filter((s) => supplierBalance(s) > 0)
    } else if (viewFilter === 'visita_hoy') {
      list = list.filter((s) => s.delivery_days?.includes(todayDayName))
    }

    return [...list].sort((a, b) => supplierBalance(b) - supplierBalance(a))
  }, [suppliers, query, selectedCategory, viewFilter, todayDayName])

  function handleOpenNew() {
    setEditingSupplier(null)
    setName('')
    setPhone('')
    setContactName('')
    setCategory('Varios')
    setDeliveryDays([])
    setFormOpen(true)
  }

  function handleOpenEdit(sup) {
    setEditingSupplier(sup)
    setName(sup.name)
    setPhone(sup.phone || '')
    setContactName(sup.contact_name || '')
    setCategory(sup.category || 'Varios')
    setDeliveryDays(sup.delivery_days || [])
    setFormOpen(true)
  }

  function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine

    if (editingSupplier) {
      const updated = {
        ...editingSupplier,
        name: trimmedName,
        phone: phone.trim(),
        contact_name: contactName.trim(),
        category,
        delivery_days: deliveryDays,
      }
      updateSupplier(updated)
      setFormOpen(false)
      if (!isOnline) {
        toast('Proveedor actualizado localmente (Modo Offline)', 'warning')
      } else {
        toast('Proveedor actualizado', 'success')
      }
    } else {
      const sup = addSupplier(
        trimmedName,
        phone.trim(),
        contactName.trim(),
        category,
        deliveryDays
      )
      setFormOpen(false)
      setSelectedId(sup.id)
      if (!isOnline) {
        toast('Proveedor agregado localmente (Modo Offline)', 'warning')
      } else {
        toast('Proveedor registrado', 'success')
      }
    }
  }

  if (selected) {
    return (
      <SupplierDetail
        supplier={selected}
        onBack={() => setSelectedId(null)}
        onReceive={receiveGoods}
        onPay={registerSupplierPayment}
        onEdit={handleOpenEdit}
        onDelete={(id) => {
          deleteSupplier(id)
          setSelectedId(null)
          toast('Proveedor eliminado', 'info')
        }}
        cashOpen={state.currentShift?.status === 'open'}
        canReceive={
          state.currentUser?.role === 'administrador' ||
          state.currentUser?.role === 'repositor' ||
          state.currentUser?.role === 'cajero'
        }
        canPay={state.currentUser?.role === 'administrador' || state.currentUser?.role === 'cajero'}
        canEdit={state.currentUser?.role === 'administrador' || state.currentUser?.role === 'repositor'}
        canDelete={state.currentUser?.role === 'administrador'}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-1.5 lg:p-6 space-y-6">
      <PageHeader
        title="Proveedores"
        description="Cuenta corriente con tus proveedores y agenda de visitas."
        action={
          <Button onClick={handleOpenNew} className="active:scale-[0.98]">
            <Plus className="size-4" /> Nuevo proveedor
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard 
          label="Deuda total" 
          value={money(totalDebt)} 
          tone="danger" 
          icon={<Wallet className="size-4" />} 
        />
        <StatCard 
          label="Total proveedores" 
          value={String(suppliers.length)} 
          icon={<Truck className="size-4" />} 
        />
        <StatCard 
          label="Visitas de hoy" 
          value={String(visitingTodayCount)} 
          tone={visitingTodayCount > 0 ? "warning" : "muted"}
          icon={<Calendar className="size-4" />} 
          sub={todayDayName}
        />
      </div>

      {/* Search and Quick Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por distribuidora o vendedor..."
              className="pl-10 h-11"
            />
          </div>

          {/* Quick Filters Segment */}
          <div className="flex rounded-xl bg-muted/60 p-1 shrink-0 border border-border/40">
            <button
              onClick={() => setViewFilter('todos')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97]",
                viewFilter === 'todos' 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setViewFilter('deuda')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] flex items-center gap-1",
                viewFilter === 'deuda' 
                  ? "bg-destructive/10 text-destructive shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Con deuda
            </button>
            <button
              onClick={() => setViewFilter('visita_hoy')}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] flex items-center gap-1",
                viewFilter === 'visita_hoy' 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Visitan hoy
            </button>
          </div>
        </div>

        {/* Category Pills (Horizontal scrolling) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('Todos')}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all shrink-0 active:scale-95",
              selectedCategory === 'Todos'
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
            )}
          >
            Todos los rubros
          </button>
          {SUPPLIER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all shrink-0 active:scale-95",
                selectedCategory === cat
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Truck className="size-10 text-muted-foreground/60" />}
              title="No se encontraron proveedores"
              description="Intentá buscando otro rubro, nombre o ajustando tus filtros."
            />
          </div>
        ) : (
          filtered.map((s) => {
            const balance = supplierBalance(s)
            const isVisitingToday = s.delivery_days?.includes(todayDayName)
            
            return (
              <div
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md hover:scale-[1.005] cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Category icon / avatar */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-base font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-heading font-semibold text-foreground">{s.name}</p>
                      {s.category && s.category !== 'Varios' && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                          {s.category}
                        </span>
                      )}
                    </div>
                    {s.contact_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        Vendedor: <span className="font-medium text-foreground">{s.contact_name}</span>
                      </p>
                    )}
                    
                    {/* Delivery Days Summary */}
                    {s.delivery_days && s.delivery_days.length > 0 ? (
                      <p className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <span>🚚</span>
                        <span className="truncate">
                          {isVisitingToday ? 'Visita hoy!' : `Reparto: ${s.delivery_days.join(', ')}`}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Sin días programados</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2">
                    {s.phone && (
                      <a
                        href={getWhatsAppLink(s.phone)}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-8 items-center justify-center rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
                        title={`Escribir a ${s.name}`}
                      >
                        <MessageCircle className="size-4" />
                      </a>
                    )}
                  </div>

                  <div className="text-right">
                    {balance > 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">Debés:</span>
                        <span className="font-heading text-base font-bold tabular-nums text-destructive">
                          {money(balance)}
                        </span>
                      </div>
                    ) : (
                      <Badge tone="success" className="text-[10px]">Al día</Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Creation/Edit Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
        variant="center"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="sup-name">Nombre de la Distribuidora</Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Distribuidora del Sur"
              autoFocus={!editingSupplier}
            />
          </div>

          <div>
            <Label htmlFor="sup-category">Rubro / Categoría</Label>
            <Select
              id="sup-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {SUPPLIER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sup-contact">Vendedor / Contacto</Label>
              <Input
                id="sup-contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="sup-phone">Celular (WhatsApp)</Label>
              <Input
                id="sup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder="Ej: 1123456789"
                inputMode="tel"
              />
            </div>
          </div>

          {/* Delivery Days Select buttons */}
          <div>
            <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Días de visita
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = deliveryDays.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setDeliveryDays(deliveryDays.filter((d) => d !== day.value))
                      } else {
                        setDeliveryDays([...deliveryDays, day.value])
                      }
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.96] flex items-center gap-1",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground font-bold shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <span>{day.short}</span>
                    {isSelected && <span className="text-[10px]">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={!name.trim()}>
            {editingSupplier ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function parseInvoiceDetail(detail) {
  let text = detail || ''
  let invoiceNumber = ''
  let invoiceDate = null
  let invoiceDueDate = null
  let notes = ''
  let isSimplified = false

  try {
    if (detail && detail.trim().startsWith('{')) {
      const parsed = JSON.parse(detail)
      text = parsed.text || ''
      invoiceNumber = parsed.invoiceNumber || ''
      invoiceDate = parsed.invoiceDate || null
      invoiceDueDate = parsed.invoiceDueDate || null
      notes = parsed.notes || ''
      isSimplified = parsed.isSimplified || false
    }
  } catch (err) {
    // Fallback for simple text entries
  }

  return { text, invoiceNumber, invoiceDate, invoiceDueDate, notes, isSimplified }
}

function SupplierDetail({
  supplier,
  onBack,
  onReceive,
  onPay,
  onEdit,
  onDelete,
  cashOpen,
  canReceive,
  canPay,
  canEdit,
  canDelete,
}) {
  const { state, deleteSupplierEntry } = useStore()
  const toast = useToast()
  const balance = supplierBalance(supplier)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Wizard steps & Invoice details
  const [step, setStep] = useState(1)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState('')
  const [prodQuery, setProdQuery] = useState('')

  const productSuggestions = useMemo(() => {
    const q = prodQuery.trim().toLowerCase()
    if (!q) return []
    return state.products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 6)
  }, [state.products, prodQuery])

  // Items in the current receipt
  const [items, setItems] = useState([])
  const [selectedProdId, setSelectedProdId] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCost, setCustomCost] = useState('')
  const [addItemType, setAddItemType] = useState('catalog')

  const [paidCash, setPaidCash] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [fromCash, setFromCash] = useState(true)

  const selectedProd = selectedProdId ? state.products.find((p) => p.id === selectedProdId) : null
  const requiresBatch = false // selectedProd?.controlLotes — disabled while in development

  const entries = [...supplier.entries].reverse()

  useEffect(() => {
    if (!receiveOpen) {
      setStep(1)
      setInvoiceNumber('')
      setInvoiceDate(new Date().toISOString().split('T')[0])
      setInvoiceDueDate('')
      setNotes('')
      setTotalInvoiceAmount('')
      setItems([])
      setPaidCash(false)
      setProdQuery('')
    }
  }, [receiveOpen])

  useEffect(() => {
    // When a product is selected in catalog mode, suggest the last cost
    if (selectedProdId && addItemType === 'catalog') {
      const prod = state.products.find((p) => p.id === selectedProdId)
      if (prod && prod.controlLotes) {
        // Find if batch details are needed
      }
    }
  }, [selectedProdId, addItemType, state.products])

  function handleAddCatalogItem() {
    if (!selectedProdId) return
    const prod = state.products.find((p) => p.id === selectedProdId)
    if (!prod) return

    if (prod.controlLotes) {
      if (!batchCode.trim() || !expirationDate) {
        toast('El producto seleccionado requiere código de lote y fecha de vencimiento.', 'error')
        return
      }
    }

    const existing = items.find((it) => 
      it.productId === selectedProdId && 
      (!prod.controlLotes || it.batchCode === batchCode.trim())
    )

    if (existing) {
      setItems(items.map((it) => {
        if (it.productId === selectedProdId && (!prod.controlLotes || it.batchCode === batchCode.trim())) {
          const nextQty = it.qty + 1
          const nextUnits = nextQty * it.unitSize
          const nextCost = nextUnits * it.catalogCost
          return { ...it, qty: nextQty, totalUnits: nextUnits, cost: nextCost }
        }
        return it
      }))
    } else {
      const u = prod.unidad || 1
      const initialCost = u * prod.cost
      setItems([...items, {
        id: uid(),
        productId: prod.id,
        name: prod.name + (prod.controlLotes ? ` (Lote: ${batchCode.trim()})` : ''),
        qty: 1,
        totalUnits: u,
        cost: initialCost,
        isCustom: false,
        unitSize: u,
        catalogCost: prod.cost,
        batchCode: prod.controlLotes ? batchCode.trim() : null,
        expirationDate: prod.controlLotes ? new Date(expirationDate).toISOString() : null,
      }])
    }
    setSelectedProdId('')
    setBatchCode('')
    setExpirationDate('')
  }

  function handleAddCustomItem() {
    const trimmed = customName.trim()
    const costVal = Number(customCost)
    if (!trimmed || !costVal || costVal <= 0) return

    setItems([...items, {
      id: uid(),
      productId: null,
      name: trimmed,
      qty: 1,
      totalUnits: 1,
      cost: costVal,
      isCustom: true,
      unitSize: 1,
      catalogCost: costVal
    }])
    setCustomName('')
    setCustomCost('')
  }

  function handleRemoveItem(id) {
    setItems(items.filter((it) => it.id !== id))
  }

  function handleUpdateItemQty(id, nextQty) {
    setItems(items.map((it) => {
      if (it.id === id) {
        const q = Math.max(1, Number(nextQty) || 1)
        const nextUnits = q * it.unitSize
        const nextCost = nextUnits * it.catalogCost
        return { ...it, qty: q, totalUnits: nextUnits, cost: nextCost }
      }
      return it
    }))
  }

  function handleUpdateItemCost(id, nextCost) {
    setItems(items.map((it) => {
      if (it.id === id) {
        const c = Math.max(0, Number(nextCost) || 0)
        return { ...it, cost: c }
      }
      return it
    }))
  }

  function handleToggleItemUnitType(id) {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it
      if (it.isCustom) return it
      const prod = state.products.find((p) => p.id === it.productId)
      if (!prod) return it
      const nextIsUnit = it.unitSize !== 1
      const nextUnitSize = nextIsUnit ? 1 : (prod.unidad || 1)
      const nextUnits = it.qty * nextUnitSize
      const nextCost = nextUnits * prod.cost
      return {
        ...it,
        unitSize: nextUnitSize,
        totalUnits: nextUnits,
        cost: nextCost
      }
    }))
  }

  function handleSelectSuggestion(p) {
    setSelectedProdId(p.id)
    setProdQuery(p.name)
  }

  function submitReceive() {
    if (!canReceive) {
      toast('No tenés permisos para realizar esta acción.', 'destructive')
      return
    }

    const totalInvoiceVal = Number(totalInvoiceAmount) || 0
    if (!totalInvoiceVal || totalInvoiceVal <= 0) {
      toast('Ingresá el monto total de la boleta.', 'error')
      return
    }

    if (items.length === 0 && step === 2) {
      toast('Agregá al menos un ítem al recibo en el Paso 2 o completá la Carga Simplificada en el Paso 1.', 'error')
      return
    }

    if (paidCash && !cashOpen) {
      toast('No hay una caja abierta. Abrí la caja antes de registrar un pago al contado, o marcá la compra "a cuenta".', 'error')
      return
    }

    const isSimplified = items.length === 0
    const itemsTotal = items.reduce((sum, it) => sum + it.cost, 0)
    
    // El total a registrar es el monto de la boleta física
    const totalAmount = totalInvoiceVal

    const detailString = isSimplified 
      ? `Carga Simplificada (Boleta Nro: ${invoiceNumber})` 
      : items.map((it) => {
          if (it.isCustom) {
            return it.name
          } else {
            return `${it.name} (x${it.totalUnits} un.)`
          }
        }).join(', ')

    const detailObj = {
      text: detailString,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || null,
      invoiceDueDate: invoiceDueDate || null,
      notes: notes.trim(),
      isSimplified
    }
    const finalDetailString = JSON.stringify(detailObj)

    const cleanItems = items.map(it => ({
      productId: it.productId || null,
      name: it.name,
      qty: it.qty,
      totalUnits: it.totalUnits,
      cost: it.cost,
      isCustom: it.isCustom,
      unitSize: it.unitSize,
      batchCode: it.batchCode || null,
      expirationDate: it.expirationDate || null
    }))

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine
    onReceive(supplier.id, totalAmount, finalDetailString, paidCash, cleanItems)

    setItems([])
    setReceiveOpen(false)

    if (!isOnline) {
      toast(
        paidCash
          ? 'Mercadería recibida, stock actualizado y pagada localmente (Modo Offline)'
          : 'Mercadería recibida, stock actualizado a cuenta localmente (Modo Offline)',
        'warning',
      )
    } else {
      toast(
        paidCash 
          ? 'Mercadería recibida, stock cargado y pagado' 
          : 'Mercadería recibida y stock cargado a cuenta', 
        'success'
      )
    }
  }

  function submitPay() {
    if (!canPay) {
      toast('No tenés permisos para realizar esta acción.', 'destructive')
      return
    }
    const value = Number(payAmount)
    if (!value || value <= 0) return
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine
    onPay(supplier.id, value, fromCash)
    setPayAmount('')
    setPayOpen(false)
    if (!isOnline) {
      toast('Pago registrado localmente (Modo Offline)', 'warning')
    } else {
      toast('Pago registrado', 'success')
    }
  }

  function handleDeleteEntry(entryId) {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    deleteSupplierEntry(supplier.id, entryId)
  }

  return (
    <div className="mx-auto max-w-3xl p-1.5 lg:p-6 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </button>

      <Card className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-xl font-bold text-primary">
              {supplier.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl font-bold text-balance text-foreground">{supplier.name}</h2>
                {supplier.category && supplier.category !== 'Varios' && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wide">
                    {supplier.category}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Cuenta corriente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 gap-1.5 text-xs shrink-0 active:scale-95 border-border hover:border-primary/30"
                onClick={() => onEdit(supplier)}
              >
                <Pencil className="size-3.5" /> Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 gap-1.5 text-xs shrink-0 active:scale-95 border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
                onClick={() => {
                  if (window.confirm(`¿Eliminar al proveedor "${supplier.name}"?\n\nSe eliminarán también todos sus movimientos e historial de cuenta corriente. Esta acción no se puede deshacer.`)) {
                    onDelete(supplier.id)
                  }
                }}
              >
                <Trash2 className="size-3.5" /> Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* Contact info list */}
        {(supplier.contact_name || supplier.phone) && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-4 text-sm text-muted-foreground">
            {supplier.contact_name && (
              <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/40">
                <span className="font-medium text-foreground">Contacto:</span>
                <span>{supplier.contact_name}</span>
              </div>
            )}
            {supplier.phone && (
              <a
                href={getWhatsAppLink(supplier.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-xl border border-green-500/20 text-green-600 dark:text-green-400 font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="size-4" />
                <span>Enviar WhatsApp</span>
                <span className="text-[11px] font-normal text-muted-foreground/80">({supplier.phone})</span>
              </a>
            )}
          </div>
        )}

        {/* Visual delivery calendar */}
        <div className="border-t border-border/50 pt-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Cronograma de repartos y visitas
          </p>
          <div className="flex gap-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const isActive = supplier.delivery_days?.includes(day.value)
              return (
                <div
                  key={day.value}
                  title={day.value}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all",
                    isActive
                      ? "bg-primary/10 border-primary/20 text-primary font-bold shadow-sm"
                      : "bg-muted/10 border-border/40 text-muted-foreground/40 text-xs"
                  )}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1">{day.letter}</span>
                  <span className="text-[8px] font-medium leading-none">{isActive ? "🚚" : "—"}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {balance > 0 ? 'Saldo a pagar' : 'Cuenta'}
          </p>
          <p
            className={`mt-1 font-heading text-3xl font-bold tabular-nums ${
              balance > 0 ? 'text-destructive' : 'text-success'
            }`}
          >
            {balance > 0 ? money(balance) : 'Al día'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {canReceive && (
            <Button variant="outline" onClick={() => setReceiveOpen(true)} className="h-11">
              <PackagePlus className="size-4" /> Recibir
            </Button>
          )}
          {canPay && (
            <Button onClick={() => setPayOpen(true)} disabled={balance <= 0} className="h-11">
              <Wallet className="size-4" /> Pagar
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-2.5">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Movimientos
        </h3>
        {entries.length === 0 ? (
          <EmptyState title="Sin movimientos" description="Registrá una recepción de mercadería o un pago." />
        ) : (
          <div className="space-y-2">
            {entries.map((e) => {
              const isInvoice = e.type === 'factura'
              const { text, invoiceNumber: num, invoiceDate: invDate, invoiceDueDate: invDueDate } = parseInvoiceDetail(e.detail)
              return (
                <div
                  key={e.id}
                  onClick={() => {
                    if (isInvoice) {
                      setSelectedInvoice(e)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border bg-card transition-all",
                    isInvoice
                      ? "cursor-pointer hover:border-primary/40 hover:bg-muted/30 border-border"
                      : "border-border"
                  )}
                  title={isInvoice ? "Hacé clic para ver el detalle de la factura" : undefined}
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      isInvoice ? 'bg-destructive/12 text-destructive' : 'bg-success/15 text-success'
                    }`}
                  >
                    {isInvoice ? <PackagePlus className="size-4" /> : <Wallet className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {isInvoice && num ? `Boleta Nro: ${num}` : text}
                    </p>
                    {isInvoice && num && (
                      <p className="truncate text-xs text-muted-foreground mt-0.5">{text}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.date)} {invDate && `(Emisión: ${invDate})`} {invDueDate && `(Vence: ${invDueDate})`}
                    </p>
                  </div>
                  <p
                    className={`font-heading text-sm font-bold tabular-nums ${
                      isInvoice ? 'text-destructive' : 'text-success'
                    }`}
                  >
                    {isInvoice ? '+' : '−'}
                    {money(e.amount)}
                  </p>
                  {canEdit && (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleDeleteEntry(e.id) }}
                      className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Eliminar movimiento"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal 
        open={receiveOpen} 
        onClose={() => setReceiveOpen(false)} 
        variant="large"
        title={step === 1 ? "Recibir mercadería - Paso 1: Datos de Boleta" : "Recibir mercadería - Paso 2: Productos"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {step === 1 ? (
            /* STEP 1: INVOICE DETAILS */
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Completá los datos generales de la boleta de compra. Podés confirmar la carga simplificada acá mismo.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-number">Número de Boleta</Label>
                  <Input
                    id="inv-number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ej: 0001-0004294"
                  />
                </div>
                <div>
                  <Label htmlFor="inv-total">Monto Total de la Boleta</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">$</span>
                    <Input
                      id="inv-total"
                      type="number"
                      inputMode="numeric"
                      value={totalInvoiceAmount}
                      onChange={(e) => setTotalInvoiceAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-date">Fecha de Emisión</Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="inv-due-date">Fecha de Vencimiento</Label>
                  <Input
                    id="inv-due-date"
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="inv-notes">Notas / Observaciones</Label>
                <Input
                  id="inv-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Bonificaciones, fletes o comentarios de entrega"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <input
                  type="checkbox"
                  checked={paidCash}
                  onChange={(e) => setPaidCash(e.target.checked)}
                  className="size-5 accent-[var(--primary)]"
                />
                <div>
                  <p className="text-sm font-medium">Pago contado (efectivo)</p>
                  <p className="text-xs text-muted-foreground">
                    {cashOpen
                      ? 'Se registrará un egreso en la caja actual'
                      : 'Sin caja abierta: no impactará en caja'}
                  </p>
                </div>
              </label>

              <div className="mt-6 flex gap-2 pt-2 border-t border-border/60">
                <Button variant="outline" className="flex-1" onClick={() => setReceiveOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/25 border-amber-500/25 font-bold"
                  onClick={submitReceive}
                  disabled={!totalInvoiceAmount || Number(totalInvoiceAmount) <= 0}
                >
                  Carga Simplificada
                </Button>
                <Button 
                  className="flex-1 font-bold"
                  onClick={() => setStep(2)}
                  disabled={!totalInvoiceAmount || Number(totalInvoiceAmount) <= 0}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: LOAD PRODUCTS */
            <div className="space-y-4">
              <div className="flex border-b border-border mb-3">
                <button
                  type="button"
                  onClick={() => setAddItemType('catalog')}
                  className={cn(
                    "flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-all cursor-pointer",
                    addItemType === 'catalog' ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  Del Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemType('custom')}
                  className={cn(
                    "flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-all cursor-pointer",
                    addItemType === 'custom' ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  Fuera de Catálogo
                </button>
              </div>

              {addItemType === 'catalog' ? (
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="relative flex-1">
                      <Label htmlFor="search-prod-input" className="text-xs">Buscar Producto (Nombre o Código)</Label>
                      <div className="relative mt-1">
                        <Input
                          id="search-prod-input"
                          value={prodQuery}
                          onChange={(e) => {
                            setProdQuery(e.target.value)
                            if (selectedProdId) setSelectedProdId('')
                          }}
                          placeholder="Escribí para buscar..."
                          className="h-11"
                          autoComplete="off"
                        />
                        {productSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                            {productSuggestions.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectSuggestion(p)}
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-muted transition-colors cursor-pointer"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate text-foreground">{p.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {p.category} {p.barcode && `· Código: ${p.barcode}`}
                                  </p>
                                </div>
                                <span className="text-[11px] font-medium text-primary shrink-0 ml-2 font-mono">
                                  Costo: {money(p.cost)}/un
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => {
                        handleAddCatalogItem()
                        setProdQuery('')
                      }} 
                      disabled={!selectedProdId}
                      className="h-11 shrink-0"
                    >
                      <Plus className="size-4 mr-1" /> Cargar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="custom-name" className="text-xs">Nombre del Producto</Label>
                    <Input
                      id="custom-name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ej: Artículos varios"
                      className="h-11"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label htmlFor="custom-cost" className="text-xs">Costo Total</Label>
                    <Input
                      id="custom-cost"
                      type="number"
                      inputMode="numeric"
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      placeholder="0"
                      className="h-11"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddCustomItem} 
                    disabled={!customName.trim() || !Number(customCost)}
                    className="h-11 shrink-0"
                  >
                    <Plus className="size-4 mr-1" /> Cargar
                  </Button>
                </div>
              )}

              {/* Loaded items list */}
              <div className="border border-border rounded-2xl overflow-hidden bg-card/50">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
                    <PackagePlus className="size-8 opacity-30 mb-2 text-muted-foreground" />
                    <p className="text-xs font-semibold">No cargaste ningún producto todavía</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Buscá y cargá productos de catálogo o personalizados arriba</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider grid grid-cols-[1fr_70px_85px_100px_40px] gap-2 border-b border-border">
                      <span>Detalle / Producto</span>
                      <span className="text-center">Cant.</span>
                      <span className="text-right">Costo/Un.</span>
                      <span className="text-right">Costo Total</span>
                      <span></span>
                    </div>
                    <div className="divide-y divide-border/60 max-h-[40vh] overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div key={item.id} className="px-3 py-2 text-sm grid grid-cols-[1fr_70px_85px_100px_40px] gap-2 items-center">
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-foreground leading-tight">{item.name}</p>
                            {!item.isCustom ? (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <p className="text-[10px] text-muted-foreground leading-none">
                                  Equivale a <span className="font-bold text-foreground">{item.totalUnits}</span> un.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemUnitType(item.id)}
                                  className="rounded bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 text-[9px] font-bold uppercase transition-colors shrink-0 cursor-pointer"
                                  title="Cambiar entre caja o unidad suelta"
                                >
                                  {item.unitSize === 1 ? 'Unidades' : `Caja (x${item.unitSize})`} ⇄
                                </button>
                              </div>
                            ) : (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground uppercase mt-1 inline-block shrink-0">
                                Custom (Unidad)
                              </span>
                            )}
                          </div>
                          <div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleUpdateItemQty(item.id, e.target.value)}
                              className="h-8 text-center px-1 py-0.5 rounded-lg border-border"
                            />
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono text-muted-foreground tabular-nums">
                              {item.totalUnits > 0 ? money(item.cost / item.totalUnits) : '—'}
                            </span>
                          </div>
                          <div>
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={item.cost}
                              onChange={(e) => handleUpdateItemCost(item.id, e.target.value)}
                              className="h-8 text-right font-mono font-semibold text-foreground border-border"
                            />
                          </div>
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Difference calculations */}
                    <div className="bg-muted/20 px-3 py-2 border-t border-border flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total de la Boleta:</span>
                        <span className="font-semibold text-foreground tabular-nums">{money(Number(totalInvoiceAmount) || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Suma de Items:</span>
                        <span className="font-semibold text-foreground tabular-nums">{money(items.reduce((s, it) => s + it.cost, 0))}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/50 pt-1 font-bold">
                        <span>Diferencia:</span>
                        <span className={cn(
                          "tabular-nums font-black",
                          (Number(totalInvoiceAmount) || 0) - items.reduce((s, it) => s + it.cost, 0) === 0 ? "text-success" : "text-destructive"
                        )}>
                          {(Number(totalInvoiceAmount) || 0) - items.reduce((s, it) => s + it.cost, 0) === 0 
                            ? "Sin diferencias" 
                            : money((Number(totalInvoiceAmount) || 0) - items.reduce((s, it) => s + it.cost, 0))}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex gap-2 pt-2 border-t border-border/60">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Volver al Paso 1
                </Button>
                <Button className="flex-1 font-bold" onClick={submitReceive} disabled={items.length === 0}>
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Pagar */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pago" variant="center">
        <div className="space-y-4">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Saldo a pagar</p>
            <p className="font-heading text-xl font-bold tabular-nums text-destructive">{money(balance)}</p>
          </div>
          <div>
            <Label htmlFor="pay-amount">Monto a pagar</Label>
            <Input
              id="pay-amount"
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setPayAmount(String(balance))}
              className="mt-1.5 inline-flex min-h-[44px] items-center text-xs font-medium text-primary hover:underline"
            >
              Pagar todo ({money(balance)})
            </button>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3.5">
            <input
              type="checkbox"
              checked={fromCash}
              onChange={(e) => setFromCash(e.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
            <div>
              <p className="text-sm font-medium">Descontar de caja</p>
              <p className="text-xs text-muted-foreground">
                {cashOpen ? 'Registra un egreso en la caja actual' : 'Sin caja abierta'}
              </p>
            </div>
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setPayOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submitPay} disabled={!Number(payAmount)}>
            Confirmar pago
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title="Detalle de Factura de Compra"
        variant="large"
      >
        {selectedInvoice && (() => {
          const { text, invoiceNumber: num, invoiceDate: invDate, invoiceDueDate: invDueDate, notes: note, isSimplified } = parseInvoiceDetail(selectedInvoice.detail)
          return (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/40 p-4 border border-border/40 text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Importe Total</span>
                <span className="font-heading text-3xl font-black text-destructive tabular-nums mt-1">
                  {money(selectedInvoice.amount)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {selectedInvoice.paidCash ? '✓ Pago Contado (Efectivo)' : '🔴 Registrado a Cuenta'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Información general</p>
                <div className="rounded-xl border border-border bg-card p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distribuidora:</span>
                    <span className="font-medium text-foreground">{supplier.name}</span>
                  </div>
                  {num && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nro. de Boleta:</span>
                      <span className="font-medium text-foreground">{num}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha de Carga:</span>
                    <span className="font-mono text-foreground">{formatDateTime(selectedInvoice.date)}</span>
                  </div>
                  {invDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha de Emisión:</span>
                      <span className="font-mono text-foreground">{invDate}</span>
                    </div>
                  )}
                  {invDueDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                      <span className="font-mono text-foreground">{invDueDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {note && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notas / Observaciones</p>
                  <div className="rounded-xl border border-border bg-card p-3 text-sm">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detalle de compra</p>
                {isSimplified ? (
                  <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground italic">
                    Esta factura fue registrada mediante Carga Simplificada (sin desglose de productos).
                  </div>
                ) : selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden bg-card text-sm">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider grid grid-cols-[1fr_80px_100px] gap-2 border-b border-border">
                      <span>Producto</span>
                      <span className="text-center">Cant.</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="divide-y divide-border/60 max-h-[40vh] overflow-y-auto">
                      {selectedInvoice.items.map((it, idx) => (
                        <div key={idx} className="px-3 py-2 grid grid-cols-[1fr_80px_100px] gap-2 items-center">
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-foreground leading-tight">{it.name}</p>
                            {!it.isCustom && (
                              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                                Equivalente a {it.totalUnits} un. (x{it.unitSize})
                              </p>
                            )}
                          </div>
                          <div className="text-center font-medium text-foreground">
                            {it.qty} {it.isCustom ? 'un.' : it.unitSize === 1 ? 'un.' : 'bulto'}{it.qty > 1 && it.unitSize !== 1 ? 's' : ''}
                          </div>
                          <div className="text-right font-mono font-semibold text-foreground">
                            {money(it.cost)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-3 text-sm">
                    <p className="font-medium text-foreground leading-snug">{text}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 italic">
                      Esta factura fue registrada de manera resumida sin desglose de productos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
        <div className="mt-5">
          <Button className="w-full h-11 bg-primary text-primary-foreground font-bold" onClick={() => setSelectedInvoice(null)}>
            Cerrar detalle
          </Button>
        </div>
      </Modal>
    </div>
  )
}
