import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/pos/page-header'
import { useStore, useSalesQuery } from '@/lib/store'
import { toLocalDateStr } from '@/lib/reports-data'
import { cn } from '@/lib/utils'
import { ReportsModule } from './reports-module'
import { ReportsHeader } from './reports-header'
import { GastosSection } from './gastos/gastos-section'

const ADMIN_TABS = [
  { id: 'stats', label: 'Estadísticas' },
  { id: 'gastos', label: 'Gastos' },
]
const DEFAULT_TAB = 'stats'
const ALL_PAYMENT_METHODS = 'todos'

const firstOfMonth = (now) => new Date(now.getFullYear(), now.getMonth(), 1)
const firstOfYear = (now) => new Date(now.getFullYear(), 0, 1)

// Preset id -> range start; every preset ends today
const PRESET_STARTS = {
  hoy: (now) => now,
  mes: firstOfMonth,
  anio: firstOfYear,
}

function AdminTabs({ value, onChange }) {
  return (
    <nav
      aria-label="Secciones del panel"
      className="flex items-center p-1 w-full h-10 sm:w-[240px] shrink-0 box-border bg-muted/50 rounded-xl border border-border shadow-2xs"
    >
      {ADMIN_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={value === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex flex-1 items-center justify-center h-full text-xs font-semibold rounded-lg transition-all duration-200 ease-out cursor-pointer',
            value === tab.id ? 'font-bold text-foreground bg-card shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export function Admin() {
  const { state } = useStore()
  const [adminTab, setAdminTab] = useState(DEFAULT_TAB)
  const [dateFrom, setDateFrom] = useState(() => toLocalDateStr(firstOfMonth(new Date())))
  const [dateTo, setDateTo] = useState(() => toLocalDateStr(new Date()))
  const [paymentMethod, setPaymentMethod] = useState(ALL_PAYMENT_METHODS)

  // Every sale of the selected range, straight from Supabase
  const { data: sales = [], isLoading: loadingSales, isFetching: fetchingSales } = useSalesQuery({ dateFrom, dateTo })
  const isReportsLoading = loadingSales || fetchingSales

  const handleApplyPreset = (preset) => {
    const getStart = PRESET_STARTS[preset]
    if (!getStart) return
    const now = new Date()
    setDateFrom(toLocalDateStr(getStart(now)))
    setDateTo(toLocalDateStr(now))
  }

  const shifts = useMemo(
    () => [...(state.currentShift ? [state.currentShift] : []), ...(state.shiftHistory ?? [])],
    [state.currentShift, state.shiftHistory],
  )

  return (
    <section className="flex flex-col justify-center mx-auto p-1.5 py-6 space-y-5 lg:p-6 max-w-6xl min-h-[80vh] animate-in fade-in duration-500">
      <PageHeader title="Panel de administración" description="Resumen del negocio en tiempo real" />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <AdminTabs value={adminTab} onChange={setAdminTab} />
        {adminTab === 'stats' && (
          <ReportsHeader
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApplyPreset={handleApplyPreset}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
          />
        )}
      </div>

      {adminTab === 'gastos' && <GastosSection />}

      {adminTab === 'stats' && (
        <ReportsModule
          sales={sales}
          expenses={state.expenses}
          products={state.products}
          shifts={shifts}
          isLoading={isReportsLoading}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApplyPreset={handleApplyPreset}
          paymentMethod={paymentMethod}
        />
      )}
    </section>
  )
}
