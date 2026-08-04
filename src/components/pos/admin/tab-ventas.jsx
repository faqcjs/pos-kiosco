'use client'

import { useState, useMemo } from 'react'
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import { Badge } from '@/components/ui/kit'
import { money, formatDate, formatTime } from '@/lib/format'

export function TabVentas({ sales }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedSales, setSelectedSales] = useState([])

  const filteredSales = useMemo(() => {
    if (!sales) return []
    return sales.filter((s) => {
      if (!search.trim()) return true
      const query = search.toLowerCase()
      const idMatch = s.id?.toLowerCase().includes(query)
      const userMatch = s.userName?.toLowerCase().includes(query) || s.user?.toLowerCase().includes(query)
      const customerMatch = s.customerName?.toLowerCase().includes(query)
      const itemMatch = s.items?.some((i) => i.name.toLowerCase().includes(query))
      return idMatch || userMatch || customerMatch || itemMatch
    })
  }, [sales, search])

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize))
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSales.slice(start, start + pageSize)
  }, [filteredSales, currentPage, pageSize])

  const toggleSelectAll = () => {
    if (selectedSales.length === paginatedSales.length) {
      setSelectedSales([])
    } else {
      setSelectedSales(paginatedSales.map((s) => s.id))
    }
  }

  const toggleSelectSale = (id) => {
    if (selectedSales.includes(id)) {
      setSelectedSales(selectedSales.filter((item) => item !== id))
    } else {
      setSelectedSales([...selectedSales, id])
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Header de la sección */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="size-5 text-primary" />
            <h3 className="text-base font-bold text-foreground font-heading">Ventas Realizadas</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resumen de las ventas realizadas en el período seleccionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs">
            <MoreHorizontal className="size-4 text-muted-foreground" />
            <span>Acciones</span>
          </button>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente, producto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Tabla Adaptable Mobile First */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-left text-xs text-foreground">
          <thead className="border-b border-border/60 bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
            <tr>
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={paginatedSales.length > 0 && selectedSales.length === paginatedSales.length}
                  onChange={toggleSelectAll}
                  className="rounded-xs border-border"
                />
              </th>
              <th className="p-3">ID</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Productos</th>
              <th className="p-3">Método de Pago</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Estado</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-medium">
            {paginatedSales.length > 0 ? (
              paginatedSales.map((sale) => {
                const isSelected = selectedSales.includes(sale.id)
                const itemsSummary =
                  sale.items?.map((i) => `${i.name} x${i.qty}`).join(', ') || 'Sin items'
                const displayId = String(sale.id).slice(0, 8).toUpperCase()
                const formattedDate = sale.date
                  ? `${new Date(sale.date).toLocaleDateString('es-AR')} ${new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : '-'

                return (
                  <tr key={sale.id} className={isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSale(sale.id)}
                        className="rounded-xs border-border"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-muted-foreground text-[11px]">
                      <span className="rounded-md bg-muted px-1.5 py-0.5">{displayId}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{formattedDate}</td>
                    <td className="p-3 text-foreground font-semibold">{sale.userName || sale.user || 'Sistema'}</td>
                    <td className="p-3 text-muted-foreground">{sale.customerName || 'Cliente general'}</td>
                    <td className="p-3 max-w-xs truncate text-muted-foreground" title={itemsSummary}>
                      {itemsSummary}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground capitalize">
                        {sale.method || 'Efectivo'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-foreground font-heading">
                      {money(sale.total)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold">
                        Completada
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-xs text-muted-foreground">
                  No se encontraron ventas para la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Mostrando</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-hidden"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>de {filteredSales.length} ventas</span>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            <span>Atrás</span>
          </button>

          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs">
            {currentPage}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
          >
            <span>Siguiente</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
