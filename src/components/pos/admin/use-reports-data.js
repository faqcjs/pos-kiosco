import { useMemo, useState } from 'react'
import { buildProductsMap } from '@/lib/sale-cost'
import {
  buildChartData,
  buildKpis,
  buildPaymentMethodsData,
  filterSalesByDate,
  filterSalesByMethod,
  filterShiftsByDate,
  toLocalDateStr,
} from '@/lib/reports-data'

const firstOfMonth = (now) => new Date(now.getFullYear(), now.getMonth(), 1)
const firstOfYear = (now) => new Date(now.getFullYear(), 0, 1)

// Preset id -> range start; every preset ends today
const PRESET_STARTS = {
  hoy: (now) => now,
  mes: firstOfMonth,
  anio: firstOfYear,
}

/**
 * Date range state (own or controlled by the parent) and every derived dataset of the Reportes screen.
 */
export function useReportsData({
  sales = [],
  products = [],
  shifts = [],
  paymentMethod,
  dateFrom: externalDateFrom,
  dateTo: externalDateTo,
  onDateFromChange,
  onDateToChange,
  onApplyPreset,
}) {
  const [internalDateFrom, setInternalDateFrom] = useState(() => toLocalDateStr(firstOfMonth(new Date())))
  const [internalDateTo, setInternalDateTo] = useState(() => toLocalDateStr(new Date()))

  const isExternalHeader = externalDateFrom !== undefined
  const dateFrom = externalDateFrom ?? internalDateFrom
  const dateTo = externalDateTo ?? internalDateTo
  const setDateFrom = onDateFromChange ?? setInternalDateFrom
  const setDateTo = onDateToChange ?? setInternalDateTo

  function applyPreset(preset) {
    if (onApplyPreset) {
      onApplyPreset(preset)
      return
    }
    const getStart = PRESET_STARTS[preset]
    if (!getStart) return
    const now = new Date()
    setDateFrom(toLocalDateStr(getStart(now)))
    setDateTo(toLocalDateStr(now))
  }

  const productsMap = useMemo(() => buildProductsMap(products), [products])
  // Every payment method: the monthly result needs all sales of the period
  const dateFilteredSales = useMemo(() => filterSalesByDate(sales, dateFrom, dateTo), [sales, dateFrom, dateTo])
  const filteredSales = useMemo(
    () => filterSalesByMethod(dateFilteredSales, paymentMethod),
    [dateFilteredSales, paymentMethod],
  )
  const filteredShifts = useMemo(() => filterShiftsByDate(shifts, dateFrom, dateTo), [shifts, dateFrom, dateTo])
  const kpis = useMemo(() => buildKpis(filteredSales, productsMap), [filteredSales, productsMap])
  const dailyData = useMemo(
    () => buildChartData(filteredSales, productsMap, dateFrom, dateTo),
    [filteredSales, productsMap, dateFrom, dateTo],
  )
  const paymentMethodsData = useMemo(() => buildPaymentMethodsData(filteredSales), [filteredSales])

  return {
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    applyPreset,
    isExternalHeader,
    isSingleDay: Boolean(dateFrom && dateTo && dateFrom === dateTo),
    productsMap,
    dateFilteredSales,
    filteredSales,
    filteredShifts,
    kpis,
    dailyData,
    paymentMethodsData,
  }
}
