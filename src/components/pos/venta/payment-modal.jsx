'use client'

import { Banknote, QrCode, NotebookPen, UserPlus, CheckCircle2, Printer, ArrowRight, ShoppingBag } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Modal, Select } from '@/components/ui/kit'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function PaymentModal({
  open,
  onClose,
  total,
  items = [],
  onConfirm,
  onFinish,
  isSaving,
}) {
  const { state, addCustomer } = useStore()
  const toast = useToast()

  const [step, setStep] = useState('pay') // 'pay' | 'summary'
  const [method, setMethod] = useState('efectivo')
  const [cash, setCash] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [lastSaleSummary, setLastSaleSummary] = useState(null)

  const dynamicBills = useMemo(() => {
    if (total < 20000) {
      return [1000, 2000, 5000, 10000, 20000].filter((b) => b >= total)
    } else {
      const m10_1 = Math.ceil(total / 10000) * 10000
      const m10_2 = m10_1 + 10000
      const m20_1 = Math.ceil(total / 20000) * 20000
      const m20_2 = m20_1 + 20000
      return Array.from(new Set([m10_1, m10_2, m20_1, m20_2]))
        .filter((b) => b >= total)
        .sort((a, b) => a - b)
        .slice(0, 3)
    }
  }, [total])

  const change = useMemo(() => Math.max(0, cash - total), [cash, total])
  const canPayCash = cash >= total

  function reset() {
    setStep('pay')
    setMethod('efectivo')
    setCash(0)
    setCustomerId('')
    setCreating(false)
    setNewName('')
    setNewPhone('')
    setLastSaleSummary(null)
  }

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open])

  // Keyboard shortcut: Pressing Enter on summary step finishes sale & prepares next sale
  useEffect(() => {
    if (step !== 'summary') return
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleFinish()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step])

  async function handleConfirm() {
    let payload = {}
    let customerName = null

    if (method === 'efectivo') {
      payload = { method, cashReceived: cash, change }
    } else if (method === 'qr') {
      payload = { method }
    } else {
      let cid = customerId
      if (creating && newName.trim()) {
        try {
          const c = await addCustomer(newName.trim(), newPhone.trim())
          cid = c.id
          customerName = newName.trim()
        } catch (err) {
          console.error(err)
          toast('Error al crear el cliente. Intentá de nuevo.', 'destructive')
          return
        }
      }
      if (!cid) return
      if (!customerName) {
        customerName = state.customers.find((c) => c.id === cid)?.name || 'Cliente'
      }
      payload = { method, customerId: cid }
    }

    const success = await onConfirm(payload)
    if (success) {
      setLastSaleSummary({
        total,
        method,
        cashReceived: cash,
        change,
        customerName,
        items: [...items],
      })
      setStep('summary')
    }
  }

  function handleFinish() {
    onFinish?.()
    reset()
    onClose()
  }

  function handlePrintTicket() {
    window.print()
  }

  const methods = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'qr', label: 'QR / Transf.', icon: QrCode },
    { id: 'fiado', label: 'Fiado', icon: NotebookPen },
  ]

  const disabled =
    (method === 'efectivo' && !canPayCash) ||
    (method === 'fiado' && !customerId && !(creating && newName.trim()))

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + (item.qty || 1), 0),
    [items]
  )

  return (
    <Modal
      open={open}
      onClose={step === 'summary' ? handleFinish : onClose}
      title={step === 'pay' ? `Cobrar ${money(total)}` : '✓ Resumen de Venta'}
      footer={
        step === 'pay' ? (
          <Button
            onClick={handleConfirm}
            disabled={disabled || isSaving}
            className="h-12 w-full bg-success text-base font-bold text-success-foreground hover:bg-success/90"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <span className="animate-spin text-lg">⏳</span>
                <span>Guardando...</span>
              </div>
            ) : (
              'Confirmar venta'
            )}
          </Button>
        ) : (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handlePrintTicket}
              className="h-12 flex-none px-4 gap-2 border-border hover:bg-muted"
            >
              <Printer className="size-4" />
              <span>Ticket</span>
            </Button>
            <Button
              onClick={handleFinish}
              className="h-12 flex-1 bg-success text-base font-bold text-success-foreground hover:bg-success/90 gap-2"
            >
              <span>Nueva Venta [Enter]</span>
              <ArrowRight className="size-5" />
            </Button>
          </div>
        )
      }
    >
      {step === 'pay' ? (
        /* ── STEP 1: PAYMENT FORM ── */
        <div className="space-y-5">
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

          <div>
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
                  {dynamicBills.map((b) => (
                    <button
                      key={b}
                      onClick={() => setCash(b)}
                      className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-muted"
                    >
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
                    className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-muted"
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
                <div className="flex size-36 items-center justify-center rounded-2xl border border-border bg-muted">
                  <QrCode className="size-20 text-muted-foreground" />
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
        </div>
      ) : (
        /* ── STEP 2: SALE SUMMARY ── */
        <div className="space-y-5 text-center py-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-foreground">¡Venta Registrada!</h3>
            <p className="text-xs text-muted-foreground">
              Comprobante procesado correctamente
            </p>
          </div>

          {/* Cash Change Banner */}
          {lastSaleSummary?.method === 'efectivo' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Vuelto a Entregar
              </span>
              <div className="font-heading text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {money(lastSaleSummary.change)}
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 pt-1 font-medium">
                Paga con: <strong>{money(lastSaleSummary.cashReceived)}</strong> · Total: {money(lastSaleSummary.total)}
              </p>
            </div>
          )}

          {/* Non-cash summary info */}
          {lastSaleSummary?.method === 'qr' && (
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Método de Cobro</span>
              <p className="text-lg font-bold text-foreground">QR / Transferencia Bancaria</p>
              <p className="text-sm font-bold text-primary">{money(lastSaleSummary.total)}</p>
            </div>
          )}

          {lastSaleSummary?.method === 'fiado' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Anotado en Cuenta Corriente</span>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-300">{lastSaleSummary.customerName}</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{money(lastSaleSummary.total)}</p>
            </div>
          )}

          {/* Itemized summary */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center justify-between font-semibold border-b border-border/60 pb-2">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-muted-foreground" />
                <span>{lastSaleSummary?.items?.length || 0} producto(s) ({totalQuantity} u.)</span>
              </span>
              <span className="font-bold text-foreground">{money(lastSaleSummary?.total || 0)}</span>
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-muted-foreground">
              {lastSaleSummary?.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="truncate pr-2">{item.qty || 1}x {item.name}</span>
                  <span className="font-mono text-foreground shrink-0">{money((item.price || 0) * (item.qty || 1))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
