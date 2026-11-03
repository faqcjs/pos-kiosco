import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Modal } from '@/components/ui/kit'
import { computeCloseDifference } from '@/lib/cash-movements'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'

function getDifferenceToastLabel(diff) {
  if (diff === 0) return 'Caja perfecta'
  return diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(Math.abs(diff))}`
}

function getDifferenceStatus(diff) {
  if (diff === 0) return { label: 'Caja perfecta', className: 'bg-success/10 text-success' }
  if (diff > 0) return { label: 'Sobrante', className: 'bg-warning/10 text-warning' }
  return { label: 'Faltante', className: 'bg-destructive/10 text-destructive' }
}

export function CloseShiftModal({ open, onDismiss, shift, theoretical, onCloseShift, toast, pending }) {
  const [counted, setCounted] = useState('')
  const countedNum = Number(counted)
  const diff = computeCloseDifference(countedNum, theoretical)
  const status = getDifferenceStatus(diff)

  async function confirmClose() {
    try {
      await onCloseShift(countedNum, shift.openedBy)
      toast(`Caja cerrada. ${getDifferenceToastLabel(diff)}`, diff === 0 ? 'success' : 'info')
      onDismiss()
      setCounted('')
    } catch (err) {
      console.error(err)
      toast(err?.message || 'Error al cerrar la caja. Intentá de nuevo.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onDismiss}
      title="Cierre de caja"
      variant="center"
      footer={
        <Button
          className="h-12 w-full text-base font-bold bg-success text-success-foreground hover:bg-success/90"
          disabled={counted === '' || pending}
          onClick={confirmClose}
        >
          Confirmar cierre
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted">
          <div>
            <span className="text-sm text-muted-foreground">Total teórico</span>
            <p className="text-xs text-muted-foreground/70">Incluye ventas en efectivo y QR</p>
          </div>
          <span className="font-heading text-lg font-bold tabular-nums">{money(theoretical)}</span>
        </div>
        <div>
          <Label htmlFor="counted">Total contado (efectivo + QR/transferencia)</Label>
          <Input
            id="counted"
            type="number"
            inputMode="numeric"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder="Ingresá efectivo + lo cobrado por QR"
          />
        </div>
        {counted !== '' && (
          <div
            className={cn(
              'flex items-center justify-between px-4 py-3 font-semibold rounded-xl',
              status.className,
            )}
          >
            <span>{status.label}</span>
            <span className="tabular-nums">{money(Math.abs(diff))}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
