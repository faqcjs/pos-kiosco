'use client'

import { ArrowLeft, HandCoins, Phone, Plus, ShoppingBag, UserPlus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, Card, EmptyState, Input, Label, Modal } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { formatDateTime, money } from '@/lib/format'
import { customerBalance, useStore } from '@/lib/store'
import type { Customer } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Clientes() {
  const { state, addCustomer, registerCustomerPayment } = useStore()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const selected = state.customers.find((c) => c.id === selectedId) ?? null

  const totalDebt = useMemo(
    () => state.customers.reduce((s, c) => s + Math.max(0, customerBalance(c)), 0),
    [state.customers],
  )

  const sorted = useMemo(
    () => [...state.customers].sort((a, b) => customerBalance(b) - customerBalance(a)),
    [state.customers],
  )

  if (selected) {
    return (
      <CustomerDetail
        customer={selected}
        onBack={() => setSelectedId(null)}
        onPay={(amount) => {
          registerCustomerPayment(selected.id, amount)
          toast(`Pago registrado: ${money(amount)}`)
        }}
        hasOpenShift={state.currentShift?.status === 'open'}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-1.5 lg:p-6">
      <PageHeader
        title="Fiar / Clientes"
        description="Cuentas corrientes de clientes."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <UserPlus className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <Card className="flex items-center justify-between bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">Deuda total en la calle</span>
        </div>
        <span className="font-heading text-2xl font-bold tabular-nums text-primary">{money(totalDebt)}</span>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState icon="📓" title="Sin clientes" description="Agregá clientes para llevar sus cuentas de fiado." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((c) => {
            const bal = customerBalance(c)
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-heading font-bold text-secondary-foreground">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.phone && <p className="truncate text-xs text-muted-foreground">{c.phone}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'font-heading text-lg font-bold tabular-nums',
                      bal > 0 ? 'text-destructive' : 'text-success',
                    )}
                  >
                    {money(bal)}
                  </p>
                  <p className="text-xs text-muted-foreground">{bal > 0 ? 'debe' : 'al día'}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Nuevo cliente"
        variant="center"
        footer={
          <Button
            className="h-11 w-full"
            disabled={!name.trim()}
            onClick={() => {
              addCustomer(name.trim(), phone.trim())
              toast('Cliente agregado')
              setName('')
              setPhone('')
              setNewOpen(false)
            }}
          >
            Agregar cliente
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="cname">Nombre</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" autoFocus />
          </div>
          <div>
            <Label htmlFor="cphone">Teléfono</Label>
            <Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" inputMode="tel" />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CustomerDetail({
  customer,
  onBack,
  onPay,
  hasOpenShift,
}: {
  customer: Customer
  onBack: () => void
  onPay: (amount: number) => void
  hasOpenShift: boolean
}) {
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const balance = customerBalance(customer)
  const entries = [...customer.entries].sort((a, b) => +new Date(b.date) - +new Date(a.date))

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-1.5 lg:p-6">
      <button
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a clientes
      </button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary font-heading text-xl font-bold text-secondary-foreground">
              {customer.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="font-heading text-xl font-bold">{customer.name}</h1>
              {customer.phone && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  {customer.phone}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Deuda actual</p>
            <p
              className={cn(
                'font-heading text-2xl font-bold tabular-nums',
                balance > 0 ? 'text-destructive' : 'text-success',
              )}
            >
              {money(balance)}
            </p>
          </div>
        </div>
        <Button
          className="mt-4 h-11 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
          disabled={balance <= 0}
          onClick={() => {
            setAmount(String(balance))
            setPayOpen(true)
          }}
        >
          <HandCoins className="size-5" />
          Registrar pago
        </Button>
      </Card>

      <div>
        <h2 className="mb-2 font-heading text-base font-bold">Movimientos</h2>
        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos.</p>
          ) : (
            entries.map((e) => {
              const isPago = e.type === 'pago'
              return (
                <Card key={e.id} className="flex items-center gap-3 p-3">
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      isPago ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {isPago ? <HandCoins className="size-4.5" /> : <ShoppingBag className="size-4.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{isPago ? 'Pago' : e.detail}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(e.date)}</p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      isPago ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {isPago ? '-' : '+'}
                    {money(e.amount)}
                  </span>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago"
        variant="center"
        footer={
          <Button
            className="h-11 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
            disabled={!Number(amount) || Number(amount) <= 0}
            onClick={() => {
              onPay(Number(amount))
              setPayOpen(false)
              setAmount('')
            }}
          >
            Confirmar pago
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Deuda actual</span>
            <span className="font-heading text-lg font-bold tabular-nums">{money(balance)}</span>
          </div>
          <div>
            <Label htmlFor="payamt">Monto que entrega</Label>
            <Input
              id="payamt"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAmount(String(balance))}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-muted"
            >
              Pagar todo ({money(balance)})
            </button>
          </div>
          <p
            className={cn(
              'rounded-xl px-4 py-3 text-sm text-pretty',
              hasOpenShift ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning-foreground',
            )}
          >
            {hasOpenShift ? (
              <span className="flex items-center gap-1.5">
                <Plus className="size-4" /> El pago ingresa a la caja activa.
              </span>
            ) : (
              'La caja está cerrada: el pago se registra pero no impacta en un turno de caja.'
            )}
          </p>
        </div>
      </Modal>
    </div>
  )
}
