import { useState } from 'react'
import { LayoutGrid, ShoppingBag, TrendingUp, CreditCard, Inbox, Scale } from 'lucide-react'
import { ReportsHeader } from './reports-header'
import { ReportsKpis, ReportsKpisSkeleton } from './reports-kpis'
import { TabResumen } from './tab-resumen'
import { TabVentas } from './tab-ventas'
import { TabProductos } from './tab-productos'
import { TabMetodosPago } from './tab-metodos-pago'
import { TabHistorialCaja } from './tab-historial-caja'
import { TabResultados } from './tab-resultados'
import { cn } from '@/lib/utils'
import { useReportsData } from './use-reports-data'

const DEFAULT_TAB = 'resumen'

const REPORT_TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
  { id: 'ventas', label: 'Ventas', icon: ShoppingBag },
  { id: 'productos', label: 'Productos', icon: TrendingUp },
  { id: 'metodos-pago', label: 'Métodos de pago', icon: CreditCard },
  { id: 'historial-caja', label: 'Historial de Caja', icon: Inbox },
  { id: 'resultados', label: 'Resultados', icon: Scale },
]

function ReportsContentSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4 p-6 bg-card/60 rounded-2xl border border-border/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 bg-muted/60 rounded-md animate-pulse" />
            <div className="h-4 w-24 bg-muted/40 rounded-md animate-pulse" />
          </div>
          <div className="h-56 w-full bg-muted/40 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4 p-6 bg-card/60 rounded-2xl border border-border/40 shadow-2xs">
          <div className="h-5 w-32 bg-muted/60 rounded-md animate-pulse" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-10 w-full bg-muted/40 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
      <div className="space-y-4 p-6 bg-card/60 rounded-2xl border border-border/40 shadow-2xs">
        <div className="h-5 w-48 bg-muted/60 rounded-md animate-pulse" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ReportsModule({
  sales = [],
  products = [],
  shifts = [],
  expenses = [],
  isLoading = false,
  onRefresh,
  dateFrom: externalDateFrom,
  dateTo: externalDateTo,
  onDateFromChange,
  onDateToChange,
  onApplyPreset,
  paymentMethod = 'todos',
}) {
  const [reportTab, setReportTab] = useState(DEFAULT_TAB)
  const data = useReportsData({
    sales,
    products,
    shifts,
    paymentMethod,
    dateFrom: externalDateFrom,
    dateTo: externalDateTo,
    onDateFromChange,
    onDateToChange,
    onApplyPreset,
  })
  const { dateFrom, dateTo, filteredSales, kpis } = data

  return (
    <div className="space-y-6">
      {/* Date filters, unless the parent renders them in its PageHeader */}
      {!data.isExternalHeader && (
        <ReportsHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={data.setDateFrom}
          onDateToChange={data.setDateTo}
          onApplyPreset={data.applyPreset}
          onRefresh={onRefresh}
        />
      )}

      {isLoading ? (
        <ReportsKpisSkeleton />
      ) : (
        <ReportsKpis
          revenue={kpis.revenue}
          profit={kpis.profit}
          uncostedRevenue={kpis.uncostedRevenue}
          totalSales={kpis.totalSales}
          averageTicket={kpis.averageTicket}
        />
      )}

      <nav
        aria-label="Secciones de reportes"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1.5 bg-muted/50 rounded-2xl border border-border/60 shadow-2xs"
      >
        {REPORT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setReportTab(id)}
            aria-current={reportTab === id ? 'page' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-2 py-2 sm:px-3 text-xs font-semibold rounded-xl transition-all',
              reportTab === id
                ? 'text-primary-foreground bg-primary shadow-sm'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </nav>

      {isLoading ? (
        <ReportsContentSkeleton />
      ) : (
        <section className="animate-in fade-in-50 duration-300">
          {reportTab === 'resumen' && (
            <TabResumen
              sales={filteredSales}
              products={products}
              dailyData={data.dailyData}
              paymentMethodsData={data.paymentMethodsData}
              isSingleDay={data.isSingleDay}
            />
          )}
          {reportTab === 'ventas' && (
            <TabVentas sales={filteredSales} shifts={data.filteredShifts} productsMap={data.productsMap} />
          )}
          {reportTab === 'productos' && <TabProductos sales={filteredSales} products={products} />}
          {reportTab === 'metodos-pago' && <TabMetodosPago sales={filteredSales} products={products} />}
          {reportTab === 'historial-caja' && <TabHistorialCaja shifts={data.filteredShifts} />}
          {reportTab === 'resultados' && (
            <TabResultados
              sales={data.dateFilteredSales}
              productsMap={data.productsMap}
              expenses={expenses}
              shifts={shifts}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          )}
        </section>
      )}
    </div>
  )
}
