import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, Input, Label, Select } from '@/components/ui/kit'

const DEFAULT_MOVEMENT_TYPE = 'ingreso'

export function MovementForm({ onMovement, toast }) {
  const [movType, setMovType] = useState(DEFAULT_MOVEMENT_TYPE)
  const [movAmount, setMovAmount] = useState('')
  const [movReason, setMovReason] = useState('')

  function submitMovement() {
    const n = Number(movAmount)
    if (!n || n <= 0 || !movReason.trim()) {
      toast('Completá monto y motivo', 'error')
      return
    }
    onMovement(movType, n, movReason.trim())
    toast(movType === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
    setMovAmount('')
    setMovReason('')
  }

  return (
    <section>
      <Card className="p-4">
        <h3 className="font-heading text-base font-bold">Registrar movimiento</h3>
        <div className="grid gap-3 mt-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="movtype">Tipo</Label>
            <Select id="movtype" value={movType} onChange={(e) => setMovType(e.target.value)}>
              <option value="ingreso">Ingreso (+)</option>
              <option value="egreso">Egreso (-)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="movamount">Monto</Label>
            <Input
              id="movamount"
              type="number"
              inputMode="numeric"
              value={movAmount}
              onChange={(e) => setMovAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="movreason">Motivo</Label>
            <Input
              id="movreason"
              value={movReason}
              onChange={(e) => setMovReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) submitMovement()
              }}
              placeholder="Ej: pago delivery"
            />
          </div>
          <Button className="h-11 w-full sm:w-auto" onClick={submitMovement}>
            Registrar
          </Button>
        </div>
      </Card>
    </section>
  )
}
