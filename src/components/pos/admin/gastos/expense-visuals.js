// Icon and color of each expense category and payment origin.
// Colors reuse the chart palette so Gastos matches the Reportes charts.
import { ArrowLeftRight, Ellipsis, House, Landmark, PiggyBank, Users, Wallet, Zap } from 'lucide-react'

export const CATEGORY_VISUALS = {
  sueldos: { icon: Users, swatch: 'bg-chart-3', tile: 'text-chart-3 bg-chart-3/12' },
  alquiler: { icon: House, swatch: 'bg-chart-4', tile: 'text-chart-4 bg-chart-4/12' },
  servicios: { icon: Zap, swatch: 'bg-chart-2', tile: 'text-chart-2 bg-chart-2/15' },
  impuestos: { icon: Landmark, swatch: 'bg-chart-5', tile: 'text-chart-5 bg-chart-5/12' },
  otros: { icon: Ellipsis, swatch: 'bg-muted-foreground/60', tile: 'text-muted-foreground bg-muted' },
}

export const ORIGIN_ICONS = {
  turno: Wallet,
  efectivo_acumulado: PiggyBank,
  transferencia: ArrowLeftRight,
}

export const getCategoryVisual = (category) => CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.otros
