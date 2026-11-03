import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Input, Label } from '@/components/ui/kit'

export function ClosedShiftView({ onOpen, toast, openShiftPending }) {
  const [amount, setAmount] = useState('')
  const [cashierName, setCashierName] = useState('')

  function handleOpen() {
    const n = Number(amount)
    if (n < 0 || Number.isNaN(n)) return
    onOpen(n, cashierName.trim())
    toast('Caja abierta')
    setAmount('')
    setCashierName('')
  }

  return (
    <Card className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-destructive/10 text-destructive">
        <Lock className="size-7" />
      </div>
      <header>
        <h2 className="font-heading text-lg font-bold">La caja está cerrada</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Ingresá tu nombre y el monto de efectivo inicial en caja para abrir el turno.
        </p>
      </header>
      <div className="space-y-3 w-full max-w-xs text-left">
        <div>
          <Label htmlFor="cashier-name">Nombre del cajero/a</Label>
          <Input
            id="cashier-name"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            placeholder="Ej: Juan"
            required
          />
        </div>
        <div>
          <Label htmlFor="opening">Monto de apertura</Label>
          <Input
            id="opening"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </div>
      </div>
      <Button
        className="h-12 w-full max-w-xs text-base font-bold bg-success text-success-foreground hover:bg-success/90"
        disabled={openShiftPending || !cashierName.trim()}
        onClick={handleOpen}
      >
        <LockOpen className="size-5" />
        Abrir caja
      </Button>
    </Card>
  )
}
