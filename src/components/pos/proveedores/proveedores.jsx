'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, PackagePlus, Plus, Search, Truck, Wallet, Pencil, MessageCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Label, Modal, Select, StatCard } from '@/components/ui/kit'
import { PageHeader } from '@/components/pos/page-header'
import { supplierBalance, useStore } from '@/lib/store'
import { formatDateTime, money } from '@/lib/format'
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
  const { state, addSupplier, updateSupplier, receiveGoods, registerSupplierPayment } = useStore()
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
        cashOpen={state.currentShift?.status === 'open'}
        canReceive={
          state.currentUser?.role === 'administrador' ||
          state.currentUser?.role === 'repositor' ||
          state.currentUser?.role === 'cajero'
        }
        canPay={state.currentUser?.role === 'administrador' || state.currentUser?.role === 'cajero'}
        canEdit={state.currentUser?.role === 'administrador' || state.currentUser?.role === 'repositor'}
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

function SupplierDetail({
  supplier,
  onBack,
  onReceive,
  onPay,
  onEdit,
  cashOpen,
  canReceive,
  canPay,
  canEdit,
}) {
  const toast = useToast()
  const balance = supplierBalance(supplier)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const [amount, setAmount] = useState('')
  const [detail, setDetail] = useState('')
  const [paidCash, setPaidCash] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [fromCash, setFromCash] = useState(true)

  const entries = [...supplier.entries].reverse()

  function submitReceive() {
    if (!canReceive) {
      toast('No tenés permisos para realizar esta acción.', 'destructive')
      return
    }
    const value = Number(amount)
    if (!value || value <= 0) return
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine
    onReceive(supplier.id, value, detail.trim() || 'Mercadería', paidCash)
    setAmount('')
    setDetail('')
    setPaidCash(false)
    setReceiveOpen(false)
    if (!isOnline) {
      toast(
        paidCash
          ? 'Mercadería recibida y pagada localmente (Modo Offline)'
          : 'Mercadería recibida a cuenta localmente (Modo Offline)',
        'warning',
      )
    } else {
      toast(paidCash ? 'Mercadería recibida y pagada' : 'Mercadería recibida a cuenta', 'success')
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
              return (
                <Card key={e.id} className="flex items-center gap-3 p-3.5">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                      isInvoice ? 'bg-destructive/12 text-destructive' : 'bg-success/15 text-success'
                    }`}
                  >
                    {isInvoice ? <PackagePlus className="size-4" /> : <Wallet className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.detail}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.date)}</p>
                  </div>
                  <p
                    className={`font-heading text-sm font-bold tabular-nums ${
                      isInvoice ? 'text-destructive' : 'text-success'
                    }`}
                  >
                    {isInvoice ? '+' : '−'}
                    {money(e.amount)}
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Recibir mercadería */}
      <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Recibir mercadería">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rec-amount">Importe de la factura</Label>
            <Input
              id="rec-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="rec-detail">Detalle</Label>
            <Input
              id="rec-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ej: Bebidas y golosinas"
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
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setReceiveOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submitReceive} disabled={!Number(amount)}>
            Confirmar
          </Button>
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
    </div>
  )
}
