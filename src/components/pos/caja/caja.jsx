'use client'

import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/pos/page-header'
import { useStore } from '@/lib/store'
import { ClosedShiftView } from './closed-shift-view'
import { OpenShiftView } from './open-shift-view'
import { ShiftHistory } from './shift-history'

export function Caja() {
  // useStore is the app's composite hook (React Query + Zustand), not a raw Zustand store.
  const { state, openShift, closeShift, addMovement, openShiftPending, closeShiftPending } = useStore()
  const toast = useToast()
  const shift = state.currentShift

  return (
    <section className="mx-auto max-w-4xl space-y-5 p-1.5 lg:p-6">
      <PageHeader title="Caja" description="Control del flujo de efectivo por turno." />
      {shift ? (
        <OpenShiftView
          shift={shift}
          sales={state.sales}
          currentUser={state.currentUser}
          onClose={closeShift}
          onMovement={addMovement}
          toast={toast}
          closeShiftPending={closeShiftPending}
        />
      ) : (
        <ClosedShiftView onOpen={openShift} toast={toast} openShiftPending={openShiftPending} />
      )}
      <ShiftHistory history={state.shiftHistory} currentUser={state.currentUser} />
    </section>
  )
}
