'use client'

import { useState, useMemo } from 'react'
import {
  Package,
  Tag,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lock,
  User,
} from 'lucide-react'
import { Modal, Select } from '@/components/ui/kit'
import { money } from '@/lib/format'

export function TabProductos({ sales, products }) {
  // Estado para filtros de Productos
  const [productFilter, setProductFilter] = useState('ingreso') // 'ingreso' | 'vendido' | 'ganancia'
  const [productSearch, setProductSearch] = useState('')

  // Estado para filtros de Categorías
  const [categoryFilter, setCategoryFilter] = useState('ingreso') // 'ingreso' | 'vendido'
  const [categorySearch, setCategorySearch] = useState('')

  // Estado para Modal de Auditoría de Stock
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [auditFilterCajero, setAuditFilterCajero] = useState('Todos')

  // Auditoría de Control de Stock
  const auditStats = useMemo(() => {
    let itemsCatalogCount = 0
    let itemsManualCount = 0
    let catalogRevenue = 0
    let manualRevenue = 0
    const manualItemsList = []

    if (sales) {
      for (const s of sales) {
        for (const item of s.items || []) {
          const itemTotal = (item.price || 0) * (item.qty || 1)
          if (item.productId) {
            itemsCatalogCount += item.qty || 1
            catalogRevenue += itemTotal
          } else {
            itemsManualCount += item.qty || 1
            manualRevenue += itemTotal
            manualItemsList.push({
              saleId: s.id,
              date: s.date,
              soldBy: s.userName || s.user || 'Desconocido',
              name: item.name,
              price: item.price,
              qty: item.qty,
              total: itemTotal,
            })
          }
        }
      }
    }

    const totalRevenue = catalogRevenue + manualRevenue
    const catalogPct = totalRevenue > 0 ? (catalogRevenue / totalRevenue) * 100 : 100
    const manualPct = totalRevenue > 0 ? (manualRevenue / totalRevenue) * 100 : 0
    const cajeros = ['Todos', ...new Set(manualItemsList.map((i) => i.soldBy))]

    return {
      itemsCatalogCount,
      itemsManualCount,
      catalogRevenue,
      manualRevenue,
      totalRevenue,
      catalogPct,
      manualPct,
      manualItemsList,
      cajeros,
    }
  }, [sales])

  // Ranking de Productos
  const rankedProducts = useMemo(() => {
    if (!sales) return []
    const map = new Map()

    const prodCatalogMap = new Map()
    if (products) {
      products.forEach((p) => {
        if (p.id) prodCatalogMap.set(p.id, p)
        if (p.name) prodCatalogMap.set(p.name, p)
      })
    }

    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const key = item.name
        const prev = map.get(key) || { name: item.name, qty: 0, revenue: 0, cost: 0 }
        const itemQty = Number(item.qty) || 1
        const itemPrice = Number(item.price) || 0
        const prodObj = prodCatalogMap.get(item.productId) || prodCatalogMap.get(item.name)
        const unitCost = item.cost ?? prodObj?.cost ?? 0
        const itemRev = itemPrice * itemQty
        const itemCost = unitCost * itemQty

        prev.qty += itemQty
        prev.revenue += itemRev
        prev.cost += itemCost
        map.set(key, prev)
      })
    })

    let list = Array.from(map.values()).map((p) => ({
      ...p,
      profit: p.revenue - p.cost,
    }))

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (productFilter === 'ingreso') {
      list.sort((a, b) => b.revenue - a.revenue)
    } else if (productFilter === 'vendido') {
      list.sort((a, b) => b.qty - a.qty)
    } else if (productFilter === 'ganancia') {
      list.sort((a, b) => b.profit - a.profit)
    }

    return list
  }, [sales, products, productFilter, productSearch])

  const maxProductVal = useMemo(() => {
    if (rankedProducts.length === 0) return 1
    if (productFilter === 'ingreso') return Math.max(...rankedProducts.map((p) => p.revenue))
    if (productFilter === 'vendido') return Math.max(...rankedProducts.map((p) => p.qty))
    return Math.max(...rankedProducts.map((p) => Math.max(0, p.profit)))
  }, [rankedProducts, productFilter])

  // Ranking de Categorías
  const rankedCategories = useMemo(() => {
    if (!sales) return []
    const map = new Map()

    const prodCatalogMap = new Map()
    if (products) {
      products.forEach((p) => {
        if (p.id) prodCatalogMap.set(p.id, p)
        if (p.name) prodCatalogMap.set(p.name, p)
      })
    }

    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const prodObj = prodCatalogMap.get(item.productId) || prodCatalogMap.get(item.name)
        const cat = item.category || prodObj?.category || 'Varios'
        const prev = map.get(cat) || { name: cat, qty: 0, revenue: 0 }
        const itemQty = Number(item.qty) || 1
        const itemPrice = Number(item.price) || 0
        prev.qty += itemQty
        prev.revenue += itemPrice * itemQty
        map.set(cat, prev)
      })
    })

    let list = Array.from(map.values())

    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q))
    }

    if (categoryFilter === 'ingreso') {
      list.sort((a, b) => b.revenue - a.revenue)
    } else if (categoryFilter === 'vendido') {
      list.sort((a, b) => b.qty - a.qty)
    }

    return list
  }, [sales, products, categoryFilter, categorySearch])

  const maxCategoryVal = useMemo(() => {
    if (rankedCategories.length === 0) return 1
    if (categoryFilter === 'ingreso') return Math.max(...rankedCategories.map((c) => c.revenue))
    return Math.max(...rankedCategories.map((c) => c.qty))
  }, [rankedCategories, categoryFilter])

  return (
    <div className="space-y-6">
      {/* Grid 2 Columnas (Mobile 1 columna) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Ranking Productos */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">Productos</h3>
                <span className="text-xs text-muted-foreground">
                  {rankedProducts.length} productos vendidos en el período
                </span>
              </div>
            </div>

            {/* Toggle de Filtros (Sin contenedor de fondo) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setProductFilter('ingreso')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  productFilter === 'ingreso'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Mayor ingreso
              </button>
              <button
                type="button"
                onClick={() => setProductFilter('vendido')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  productFilter === 'vendido'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Más vendido
              </button>
              <button
                type="button"
                onClick={() => setProductFilter('ganancia')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  productFilter === 'ganancia'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Más ganancia
              </button>
            </div>
          </div>

          {/* Buscador de Producto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Lista Ranking con Barras */}
          <div className="space-y-3 pt-1">
            {rankedProducts.length > 0 ? (
              rankedProducts.slice(0, 10).map((prod, idx) => {
                const currentVal =
                  productFilter === 'ingreso'
                    ? prod.revenue
                    : productFilter === 'vendido'
                    ? prod.qty
                    : Math.max(0, prod.profit)
                const pct = Math.round((currentVal / maxProductVal) * 100)

                return (
                  <div key={prod.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate max-w-[200px] sm:max-w-xs text-foreground">
                        <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                        {prod.name}
                      </span>
                      <div className="text-right">
                        <span className="text-foreground font-bold">
                          {productFilter === 'vendido' ? `${prod.qty} uni.` : money(prod.revenue)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {prod.qty} uni.
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay productos registrados en este filtro.
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Ranking Categorías */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-2xs space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">Categorías</h3>
                <span className="text-xs text-muted-foreground">
                  {rankedCategories.length} categorías en el período
                </span>
              </div>
            </div>

            {/* Toggle Filtros Categorías (Sin contenedor de fondo) */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter('ingreso')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  categoryFilter === 'ingreso'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Mayor ingreso
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('vendido')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  categoryFilter === 'vendido'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                Más vendido
              </button>
            </div>
          </div>

          {/* Buscador de Categoría */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Lista Categorías con Barras */}
          <div className="space-y-3 pt-1">
            {rankedCategories.length > 0 ? (
              rankedCategories.slice(0, 10).map((cat, idx) => {
                const currentVal = categoryFilter === 'ingreso' ? cat.revenue : cat.qty
                const pct = Math.round((currentVal / maxCategoryVal) * 100)

                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate text-foreground flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        {cat.name}
                      </span>
                      <div className="text-right">
                        <span className="text-foreground font-bold">{money(cat.revenue)}</span>
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          {cat.qty} ventas
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No hay categorías registradas en este filtro.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget de Auditoría de Control de Stock (Pasado al final) */}
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <Lock className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">
                Auditoría de Control de Stock
              </h3>
              {auditStats.manualPct > 30 && (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Atención: {auditStats.manualPct.toFixed(0)}% Monto Libre
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAuditModalOpen(true)}
            className="self-start sm:self-auto rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-2xs"
          >
            Ver auditoría completa
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Catálogo: {auditStats.catalogPct.toFixed(1)}% ({auditStats.itemsCatalogCount} art.)
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="size-3.5 text-amber-500" />
              Monto Libre: {auditStats.manualPct.toFixed(1)}% ({auditStats.itemsManualCount} art.)
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-900/40 flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${auditStats.catalogPct}%` }}
              title={`Catálogo: ${auditStats.catalogPct.toFixed(1)}%`}
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${auditStats.manualPct}%` }}
              title={`Monto Libre: ${auditStats.manualPct.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>
      {/* Modal de Auditoría Completa de Stock */}
      <Modal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        title="Auditoría Completa de Ventas por Monto Libre"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              Ítems sin código registraron <strong>{money(auditStats.manualRevenue)}</strong> en
              ventas libres.
            </span>
          </div>

          {auditStats.cajeros.length > 2 && (
            <div className="flex items-center gap-2 text-xs">
              <User className="size-4 text-muted-foreground" />
              <span>Filtrar por cajero:</span>
              <Select
                value={auditFilterCajero}
                onChange={(e) => setAuditFilterCajero(e.target.value)}
                className="h-8 text-xs"
              >
                {auditStats.cajeros.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Cajero</th>
                  <th className="p-2.5">Descripción</th>
                  <th className="p-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {auditStats.manualItemsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No hay registros de ventas libres.
                    </td>
                  </tr>
                ) : (
                  auditStats.manualItemsList
                    .filter(
                      (i) => auditFilterCajero === 'Todos' || i.soldBy === auditFilterCajero,
                    )
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('es-AR')}
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">{item.soldBy}</td>
                        <td className="p-2.5 text-foreground">{item.name}</td>
                        <td className="p-2.5 text-right font-bold text-amber-600">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
