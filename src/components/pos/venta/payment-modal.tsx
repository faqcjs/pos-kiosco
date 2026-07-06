'use client'

import { Banknote, QrCode, NotebookPen, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Modal, Select } from '@/components/ui/kit'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { PaymentMethod } from '@/lib/types'
import { cn } from '@/lib/utils'

const QUICK_BILLS = [2000, 10000, 20000]

export function PaymentModal({
  open,
  onClose,
  total,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  total: number
  onConfirm: (args: { method: PaymentMethod; customerId?: string; cashReceived?: number; change?: number }) => void
}) {
  const { state, addCustomer } = useStore()
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [cash, setCash] = useState<number>(0)
  const [customerId, setCustomerId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const change = useMemo(() => Math.max(0, cash - total), [cash, total])
  const canPayCash = cash >= total

  function reset() {
    setMethod('efectivo')
    setCash(0)
    setCustomerId('')
    setCreating(false)
    setNewName('')
    setNewPhone('')
  }

  function handleConfirm() {
    if (method === 'efectivo') {
      onConfirm({ method, cashReceived: cash, change })
    } else if (method === 'qr') {
      onConfirm({ method })
    } else {
      let cid = customerId
      if (creating && newName.trim()) {
        const c = addCustomer(newName.trim(), newPhone.trim())
        cid = c.id
      }
      if (!cid) return
      onConfirm({ method, customerId: cid })
    }
    reset()
  }

  const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'qr', label: 'QR / Transf.', icon: QrCode },
    { id: 'fiado', label: 'Fiado', icon: NotebookPen },
  ]

  const disabled =
    (method === 'efectivo' && !canPayCash) ||
    (method === 'fiado' && !customerId && !(creating && newName.trim()))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cobrar ${money(total)}`}
      footer={
        <Button
          onClick={handleConfirm}
          disabled={disabled}
          className="h-12 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
        >
          Confirmar venta
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {methods.map((m) => {
          const Icon = m.icon
          const activeM = method === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-colors',
                activeM
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-5" />
              {m.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {method === 'efectivo' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cash">Paga con</Label>
              <Input
                id="cash"
                type="number"
                inputMode="numeric"
                value={cash || ''}
                onChange={(e) => setCash(Number(e.target.value) || 0)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_BILLS.map((b) => (
                <button
                  key={b}
                  onClick={() => setCash((c) => c + b)}
                  className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="size-3.5" />
                  {money(b)}
                </button>
              ))}
              <button
                onClick={() => setCash(total)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-muted"
              >
                Justo
              </button>
              <button
                onClick={() => setCash(0)}
                className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Limpiar
              </button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Vuelto</span>
              <span
                className={cn(
                  'font-heading text-xl font-bold tabular-nums',
                  canPayCash ? 'text-success' : 'text-destructive',
                )}
              >
                {money(change)}
              </span>
            </div>
            {!canPayCash && cash > 0 && (
              <p className="text-sm text-destructive">Falta {money(total - cash)}</p>
            )}
          </div>
        )}

        {method === 'qr' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-40 items-center justify-center rounded-2xl border border-border bg-muted">
              <QrCode className="size-24 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              El cliente escanea y transfiere. Al confirmar se registra la venta por {money(total)}.
            </p>
          </div>
        )}

        {method === 'fiado' && (
          <div className="space-y-4">
            {!creating && (
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  id="customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Seleccionar cliente...</option>
                  {state.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {!creating ? (
              <Button variant="outline" className="h-10 w-full" onClick={() => setCreating(true)}>
                <UserPlus className="size-4" />
                Nuevo cliente
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div>
                  <Label htmlFor="nn">Nombre</Label>
                  <Input id="nn" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre y apellido" autoFocus />
                </div>
                <div>
                  <Label htmlFor="np">Teléfono</Label>
                  <Input id="np" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Opcional" inputMode="tel" />
                </div>
                <Button
                  variant="ghost"
                  className="h-9 w-full"
                  onClick={() => {
                    setCreating(false)
                    setNewName('')
                    setNewPhone('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground text-pretty">
              Se sumará {money(total)} a la cuenta corriente del cliente.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
