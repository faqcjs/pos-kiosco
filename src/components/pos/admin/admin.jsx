
import { useMemo, useState } from 'react'
import {
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Badge, Card, EmptyState, Modal, Input, Label, Select, Pagination } from '@/components/ui/kit'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/pos/page-header'
import { useToast } from '@/components/ui/toast'
import { ReportsModule } from './reports-module'
import { ReportsHeader } from './reports-header'
import { useStore } from '@/lib/store'
import { money, formatDate, formatTime } from '@/lib/format'

function toLocalDateStr(d = new Date()) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function Admin() {
  const { state, createUser, deleteUser } = useStore()
  const [adminTab, setAdminTab] = useState('stats')
  const [, setIsLoading] = useState(false)

  const todayStr = useMemo(() => toLocalDateStr(new Date()), [])
  const firstOfMonthStr = useMemo(() => {
    const d = new Date()
    return toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [])

  const [dateFrom, setDateFrom] = useState(firstOfMonthStr)
  const [dateTo, setDateTo] = useState(todayStr)
  const [paymentMethod, setPaymentMethod] = useState('todos')

  const handleApplyPreset = (preset) => {
    const now = new Date()
    if (preset === 'hoy') {
      const str = toLocalDateStr(now)
      setDateFrom(str)
      setDateTo(str)
    } else if (preset === 'mes') {
      const start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
      const end = toLocalDateStr(now)
      setDateFrom(start)
      setDateTo(end)
    } else if (preset === 'anio') {
      const start = toLocalDateStr(new Date(now.getFullYear(), 0, 1))
      const end = toLocalDateStr(now)
      setDateFrom(start)
      setDateTo(end)
    }
  }

  const shifts = useMemo(() => {
    return [
      ...(state.currentShift ? [state.currentShift] : []),
      ...(state.shiftHistory || []),
    ]
  }, [state.currentShift, state.shiftHistory])

  return (
    <div className="mx-auto max-w-6xl min-h-[80vh] flex flex-col justify-center p-1.5 py-6 space-y-5 lg:p-6 animate-in fade-in duration-500">
      <PageHeader
        title="Panel de administración"
        description="Resumen del negocio en tiempo real"
      />

      {/* Barra de control: Pestañas a la izquierda, Filtros a la derecha */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex h-10 items-center rounded-xl border border-border p-1 bg-muted/50 w-full sm:w-[240px] shrink-0 box-border shadow-2xs">
          <button
            onClick={() => setAdminTab('stats')}
            className={`flex-1 h-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-200 ease-out cursor-pointer ${
              adminTab === 'stats'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setAdminTab('empleados')}
            className={`flex-1 h-full flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-200 ease-out cursor-pointer ${
              adminTab === 'empleados'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Empleados
          </button>
        </div>

        {adminTab === 'stats' && (
          <ReportsHeader
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApplyPreset={handleApplyPreset}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onRefresh={() => {
              setIsLoading(true)
              setTimeout(() => setIsLoading(false), 400)
            }}
          />
        )}
      </div>

      {adminTab === 'empleados' ? (
        <UsersTab state={state} createUser={createUser} deleteUser={deleteUser} />
      ) : (
        <ReportsModule
          sales={state.sales}
          products={state.products}
          shifts={shifts}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApplyPreset={handleApplyPreset}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onRefresh={() => {
            setIsLoading(true)
            setTimeout(() => setIsLoading(false), 400)
          }}
        />
      )}
    </div>
  )
}

function UsersTab({ state, createUser, deleteUser }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('cajero')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [empSalesPage, setEmpSalesPage] = useState(1)
  const EMP_SALES_PER_PAGE = 5

  const handleSelectEmp = (empName) => {
    setSelectedEmp(empName)
    setEmpSalesPage(1)
  }

  // Obtener ventas asociadas al empleado seleccionado
  const selectedEmpSales = useMemo(() => {
    if (!selectedEmp) return []
    const allShifts = state.shiftHistory || []
    const empShifts = new Set(
      allShifts.filter((s) => s.openedBy === selectedEmp).map((s) => s.id)
    )
    return (state.sales || [])
      .filter((s) => empShifts.has(s.shiftId))
      .sort((a, b) => getSaleMs(b) - getSaleMs(a))
  }, [selectedEmp, state.sales, state.shiftHistory])

  const totalEmpSalesPages = Math.ceil((selectedEmpSales?.length || 0) / EMP_SALES_PER_PAGE) || 1
  const currentEmpSalesPage = Math.min(empSalesPage, totalEmpSalesPages)

  const paginatedEmpSales = useMemo(() => {
    const start = (currentEmpSalesPage - 1) * EMP_SALES_PER_PAGE
    return (selectedEmpSales || []).slice(start, start + EMP_SALES_PER_PAGE)
  }, [selectedEmpSales, currentEmpSalesPage])

  const selectedEmpTotal = useMemo(() => {
    return selectedEmpSales.reduce((sum, s) => sum + s.total, 0)
  }, [selectedEmpSales])

  const activeUsers = useMemo(() => {
    return (state.users || []).filter((u) => u.role !== 'administrador')
  }, [state.users])

  // Calculate metrics for each user
  const userMetrics = useMemo(() => {
    const metrics = {}
    
    // Initialize
    for (const u of activeUsers) {
      metrics[u.username] = {
        totalSales: 0,
        salesCount: 0,
        totalDiff: 0,
      }
    }
    
    // Sum sales
    for (const sale of state.sales || []) {
      const u = sale.soldBy || 'admin'
      if (metrics[u]) {
        metrics[u].totalSales += sale.total
        metrics[u].salesCount += 1
      }
    }
    
    // Sum shift differences.
    for (const shift of state.shiftHistory || []) {
      const closedByUser = (state.users || []).find((u) => u.name === shift.closedBy)
      if (closedByUser && metrics[closedByUser.username]) {
        metrics[closedByUser.username].totalDiff += (shift.difference || 0)
      }
    }
    
    return metrics
  }, [activeUsers, state.sales, state.shiftHistory, state.users])

  // Calcular métricas agrupadas por el nombre tipeado en los turnos de caja
  const employeeMetrics = useMemo(() => {
    const metrics = {}
    
    const excludeNames = new Set(['admin', 'desarrollo', 'TodoPasa', 'Todo Pasa', 'Desarrollo', 'admin@kiosko.com', 'cajero@kiosko.com'])
    const allShifts = state.shiftHistory || []
    
    for (const shift of allShifts) {
      if (shift.openedBy && !excludeNames.has(shift.openedBy)) {
        metrics[shift.openedBy] = { name: shift.openedBy, totalSales: 0, salesCount: 0, shiftsCount: 0, totalDiff: 0 }
      }
      if (shift.closedBy && !excludeNames.has(shift.closedBy)) {
        metrics[shift.closedBy] = { name: shift.closedBy, totalSales: 0, salesCount: 0, shiftsCount: 0, totalDiff: 0 }
      }
    }
    
    for (const shift of allShifts) {
      const opName = shift.openedBy
      const clName = shift.closedBy
      
      if (opName && metrics[opName]) {
        metrics[opName].shiftsCount += 1
      }
      if (clName && metrics[clName]) {
        metrics[clName].totalDiff += (shift.difference || 0)
      }
    }
    
    const shiftsMap = {}
    for (const shift of allShifts) {
      shiftsMap[shift.id] = shift.openedBy
    }
    
    for (const sale of state.sales || []) {
      const shiftOwner = shiftsMap[sale.shiftId]
      if (shiftOwner && metrics[shiftOwner]) {
        metrics[shiftOwner].totalSales += sale.total
        metrics[shiftOwner].salesCount += 1
      }
    }
    
    return Object.values(metrics).sort((a, b) => b.totalSales - a.totalSales)
  }, [state.shiftHistory, state.sales])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) return
    setIsSubmitting(true)
    createUser(username.trim(), password.trim(), name.trim(), role, {
      onSuccess: () => {
        toast('Usuario creado con éxito', 'success')
        setName('')
        setUsername('')
        setPassword('')
        setRole('cajero')
        setIsSubmitting(false)
        setIsCreateModalOpen(false)
      },
      onError: (err) => {
        console.error('Error al crear usuario:', err)
        toast(`Error al crear usuario: ${err.message || 'Intenta con otro usuario'}`, 'error')
        setIsSubmitting(false)
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-350">
      {/* Tarjeta 1: Desempeño por Nombre de Turno (Tipeado por empleados) */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Rendimiento por Turno de Empleado</h3>
          <p className="text-xs text-muted-foreground">
            Métricas consolidadas por el nombre ingresado al abrir y cerrar la caja (cajeros con cuenta compartida).
          </p>
        </div>

        {employeeMetrics.length === 0 ? (
          <EmptyState 
            title="Sin turnos registrados" 
            description="Las estadísticas aparecerán cuando los empleados abran y cierren turnos en la caja." 
          />
        ) : (
          <div className="space-y-4">
            {/* Mobile layout (cards) - visible on < md */}
            <div className="grid gap-3 md:hidden">
              {employeeMetrics.map((emp) => {
                const diffColor = emp.totalDiff < 0 ? 'text-destructive font-bold' : emp.totalDiff > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                return (
                  <div 
                    key={emp.name} 
                    className="rounded-xl border border-border p-4 space-y-2 bg-muted/10 hover:bg-muted/20 active:scale-[0.99] transition-all cursor-pointer select-none"
                    onClick={() => handleSelectEmp(emp.name)}
                  >
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h4 className="font-semibold text-foreground text-base">{emp.name}</h4>
                      <Badge tone="muted" className="text-[10px] px-1.5 py-0.5">
                        {emp.shiftsCount} {emp.shiftsCount === 1 ? 'Turno' : 'Turnos'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div>
                        <p className="text-muted-foreground font-medium">Ventas</p>
                        <p className="font-semibold text-foreground mt-0.5">{money(emp.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Operac.</p>
                        <p className="font-semibold text-foreground mt-0.5">{emp.salesCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Diff. Caja</p>
                        <p className={`font-semibold mt-0.5 ${diffColor}`}>
                          {emp.totalDiff === 0 ? '$0' : (emp.totalDiff > 0 ? '+' : '') + money(emp.totalDiff)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop layout (table) - visible on >= md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-muted/20">
                    <th className="py-3 px-4 whitespace-nowrap">Empleado (Caja)</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Turnos Trab.</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Total Ventas</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Operaciones</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Diferencia Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employeeMetrics.map((emp) => {
                    const diffColor = emp.totalDiff < 0 ? 'text-destructive font-bold' : emp.totalDiff > 0 ? 'text-success font-bold' : 'text-muted-foreground'
                    return (
                      <tr 
                        key={emp.name} 
                        className="hover:bg-muted/20 active:bg-muted/30 transition-colors cursor-pointer select-none"
                        onClick={() => handleSelectEmp(emp.name)}
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">{emp.name}</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">{emp.shiftsCount}</td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">{money(emp.totalSales)}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground">{emp.salesCount}</td>
                        <td className={`py-3 px-4 text-right ${diffColor}`}>
                          {emp.totalDiff === 0 ? '$0' : (emp.totalDiff > 0 ? '+' : '') + money(emp.totalDiff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Tarjeta 2: Cuentas Registradas */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-lg">Usuarios Registrados</h3>
            <p className="text-xs text-muted-foreground">
              Lista de cuentas de usuarios registradas en el sistema.
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            size="sm" 
            className="gap-1.5 font-bold shrink-0 self-start sm:self-auto h-9"
          >
            <UserPlus className="size-4" />
            Nuevo Usuario
          </Button>
        </div>
        {activeUsers.length === 0 ? (
          <EmptyState title="Sin usuarios" description="No hay usuarios registrados todavía." />
        ) : (
          <div className="space-y-4">
            {/* Mobile layout (cards) - visible on < md */}
            <div className="grid gap-3 md:hidden">
              {activeUsers.map((c) => {
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground text-base">{c.name}</h4>
                        <p className="text-xs text-muted-foreground">@{c.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={c.role === 'repositor' ? 'accent' : 'muted'} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                          {c.role === 'repositor' ? 'Repositor' : 'Empleado'}
                        </Badge>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que querés eliminar el usuario "${c.name}"?`)) {
                              deleteUser(c.id, {
                                onSuccess: () => toast('Usuario eliminado', 'info'),
                                onError: (err) => toast(`Error: ${err.message || 'No se pudo eliminar'}`, 'error')
                              })
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all inline-flex items-center justify-center"
                          title="Eliminar usuario"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop layout (table) - visible on >= md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-muted/20">
                    <th className="py-3 px-4 whitespace-nowrap">Nombre</th>
                    <th className="py-3 px-4 whitespace-nowrap">Usuario</th>
                    <th className="py-3 px-4 whitespace-nowrap">Rol</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeUsers.map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{c.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{c.username}</td>
                        <td className="py-3 px-4">
                          <Badge tone={c.role === 'repositor' ? 'accent' : 'muted'} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                            {c.role === 'repositor' ? 'Repositor' : 'Empleado'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Estás seguro de que querés eliminar el usuario "${c.name}"?`)) {
                                deleteUser(c.id, {
                                  onSuccess: () => toast('Usuario eliminado', 'info'),
                                  onError: (err) => toast(`Error: ${err.message || 'No se pudo eliminar'}`, 'error')
                                })
                              }
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all inline-flex items-center justify-center"
                            title="Eliminar usuario"
                            aria-label="Eliminar usuario"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalle de Ventas por Empleado */}
      <Modal
        open={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        title={selectedEmp ? `Detalle de Ventas - ${selectedEmp}` : ''}
        variant="large"
      >
        {selectedEmp && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm font-medium text-muted-foreground">Total facturado:</span>
              <span className="font-heading text-lg font-bold text-success">{money(selectedEmpTotal)}</span>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedEmpSales.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">
                  No hay ventas registradas para este empleado.
                </p>
              ) : (
                paginatedEmpSales.map((sale) => {
                  const label = { efectivo: 'Efectivo', qr: 'QR', fiado: 'Fiado' }[sale.method]
                  const tone = sale.method === 'efectivo' ? 'success' : sale.method === 'qr' ? 'default' : 'warning'
                  
                  return (
                    <div key={sale.id} className="rounded-xl border border-border p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{formatDate(sale.date || sale.created_at || sale.createdAt)} - {formatTime(sale.date || sale.created_at || sale.createdAt)}</span>
                        <Badge tone={tone} className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                          {label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="font-medium text-foreground">
                          {sale.itemsCount} {sale.itemsCount === 1 ? 'producto' : 'productos'}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {money(sale.total)}
                        </span>
                      </div>
                      <div className="pl-2 border-l border-border space-y-1">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{item.name} (x{item.qty})</span>
                            <span className="text-muted-foreground tabular-nums">
                              {money(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Pagination
              page={currentEmpSalesPage}
              totalPages={totalEmpSalesPages}
              onPageChange={setEmpSalesPage}
              totalItems={selectedEmpSales.length}
              itemsPerPage={EMP_SALES_PER_PAGE}
            />
          </div>
        )}
      </Modal>

      {/* Modal para Crear Nuevo Usuario */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nuevo Usuario"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee-name">Nombre Completo</Label>
            <Input
              id="employee-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div>
            <Label htmlFor="employee-username">Usuario</Label>
            <Input
              id="employee-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. juan.empleado"
            />
          </div>
          <div>
            <Label htmlFor="employee-password">Contraseña</Label>
            <Input
              id="employee-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de acceso"
            />
          </div>
          <div>
            <Label htmlFor="employee-role">Rol</Label>
            <Select
              id="employee-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="cajero">Empleado</option>
              <option value="repositor">Repositor</option>
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full h-11 font-bold">
            {isSubmitting ? 'Registrando...' : 'Registrar Usuario'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      {label && <p className="mb-1 text-xs font-semibold capitalize">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{unit ? `${p.value}${unit}` : money(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
