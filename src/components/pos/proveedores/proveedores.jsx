'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, PackagePlus, Plus, Search, Truck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Label, Modal, StatCard } from '@/components/ui/kit'
import { PageHeader } from '@/components/pos/page-header'
import { supplierBalance, useStore } from '@/lib/store'
import { formatDateTime, money } from '@/lib/format'
import { useToast } from '@/components/ui/toast'

export function Proveedores() {
  const { state, addSupplier, receiveGoods, registerSupplierPayment } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const suppliers = state.suppliers
  const selected = suppliers.find((s) => s.id === selectedId) ?? null

  const totalDebt = useMemo(
    () => suppliers.reduce((sum, s) => sum + Math.max(0, supplierBalance(s)), 0),
    [suppliers],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? suppliers.filter((s) => s.name.toLowerCase().includes(q)) : suppliers
    return [...list].sort((a, b) => supplierBalance(b) - supplierBalance(a))
  }, [suppliers, query])

  function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine
    const sup = addSupplier(name)
    setNewName('')
    setNewOpen(false)
    setSelectedId(sup.id)
    if (!isOnline) {
      toast('Proveedor agregado localmente (Modo Offline)', 'warning')
    } else {
      toast('Proveedor agregado', 'success')
    }
  }

  if (selected) {
    return (
      <SupplierDetail
        supplier={selected}
        onBack={() => setSelectedId(null)}
        onReceive={receiveGoods}
        onPay={registerSupplierPayment}
        cashOpen={state.currentShift?.status === 'open'}
        isAdmin={state.currentUser?.role === 'administrador'}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-1.5 lg:p-6">
      <PageHeader
        title="Proveedores"
        subtitle="Cuenta corriente con tus proveedores"
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> Nuevo
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label="Deuda total" value={money(totalDebt)} tone="danger" icon={<Wallet className="size-4" />} />
        <StatCard label="Proveedores" value={String(suppliers.length)} icon={<Truck className="size-4" />} />
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar proveedor..."
          className="pl-10"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Truck className="size-8" />}
            title="Sin proveedores"
            description="Agregá tu primer proveedor para registrar mercadería y pagos."
          />
        ) : (
          filtered.map((s) => {
            const balance = supplierBalance(s)
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-base font-bold text-primary">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.entries.length} movimientos</p>
                </div>
                <div className="text-right">
                  {balance > 0 ? (
                    <>
                      <p className="font-heading text-base font-bold tabular-nums text-destructive">
                        {money(balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">a pagar</p>
                    </>
                  ) : (
                    <Badge tone="success">Al día</Badge>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo proveedor" variant="center">
        <div>
          <Label htmlFor="sup-name">Nombre del proveedor</Label>
          <Input
            id="sup-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Distribuidora del Sur"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreate()
            }}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={!newName.trim()}>
            Agregar
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
  cashOpen,
  isAdmin,
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
    if (!isAdmin) {
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
    if (!isAdmin) {
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
    <div className="mx-auto max-w-3xl p-1.5 lg:p-6">
      <button
        onClick={onBack}
        className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </button>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xl font-bold text-primary">
            {supplier.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-bold text-balance">{supplier.name}</h2>
            <p className="text-sm text-muted-foreground">Cuenta corriente</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-muted/50 p-4 text-center">
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setReceiveOpen(true)}>
              <PackagePlus className="size-4" /> Recibir
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setPayOpen(true)} disabled={balance <= 0}>
              <Wallet className="size-4" /> Pagar
            </Button>
          )}
        </div>
      </Card>

      <h3 className="mb-2 mt-6 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
                  <p className="truncate text-sm font-medium">{e.detail}</p>
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
