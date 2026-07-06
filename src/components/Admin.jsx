import React, { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'
import ScannerModal from './ScannerModal'

export default function Admin() {
  const {
    adminPassword,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    changeAdminPassword,
    historialCajas,
    mostrarNotificacion,
    productos,
    agregarOEditarProducto,
    eliminarProducto,
    actualizarStock,
  } = useKioskoStore()

  // State local
  const [passwordInput, setPasswordInput] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  // State local para Inventario / Stock
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard')
  const [buscarStock, setBuscarStock] = useState('')
  const [filtroStockMinimo, setFiltroStockMinimo] = useState(false)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [modalStockAbierto, setModalStockAbierto] = useState(false)
  const [scannerStockAbierto, setScannerStockAbierto] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)

  // State para formulario de producto
  const [formId, setFormId] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formPrecioCompra, setFormPrecioCompra] = useState('')
  const [formPrecioVenta, setFormPrecioVenta] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formStockMinimo, setFormStockMinimo] = useState('')
  const [formCategoria, setFormCategoria] = useState('')
  const [editando, setEditando] = useState(false)

  const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)))

  // Filtrado de productos para sección Stock de Admin
  const matchFiltro = productos.filter((p) => {
    const matchesBuscar =
      p.nombre.toLowerCase().includes(buscarStock.toLowerCase()) ||
      p.id.toLowerCase().includes(buscarStock.toLowerCase())
    const matchesCategoria = categoriaSeleccionada ? p.categoria === categoriaSeleccionada : true
    const matchesStockMin = filtroStockMinimo ? p.stock <= p.stockMinimo : true
    return matchesBuscar && matchesCategoria && matchesStockMin
  })

  const productosFiltrados = matchFiltro.slice(0, visibleCount)

  const handleScrollStock = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setVisibleCount((prev) => Math.min(prev + 12, matchFiltro.length))
    }
  }

  const abrirFormularioNuevo = () => {
    setFormId('')
    setFormNombre('')
    setFormPrecioCompra('')
    setFormPrecioVenta('')
    setFormStock('')
    setFormStockMinimo('')
    setFormCategoria('')
    setEditando(false)
    setModalStockAbierto(true)
  }

  const abrirFormularioEditar = (p) => {
    setFormId(p.id)
    setFormNombre(p.nombre)
    setFormPrecioCompra(p.precioCompra)
    setFormPrecioVenta(p.precioVenta)
    setFormStock(p.stock)
    setFormStockMinimo(p.stockMinimo)
    setFormCategoria(p.categoria || '')
    setEditando(true)
    setModalStockAbierto(true)
  }

  const verificarProductoExistente = (codigo) => {
    if (editando || !codigo) return
    const existing = productos.find((p) => p.id === codigo.trim())
    if (existing) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Producto Existente',
        mensaje: `El código "${codigo.trim()}" ya pertenece a:\n"${existing.nombre}"\n\n¿Querés cargar los datos de este producto existente para editarlo o sumarle stock?`,
        alAceptar: () => {
          setFormNombre(existing.nombre)
          setFormPrecioCompra(existing.precioCompra)
          setFormPrecioVenta(existing.precioVenta)
          setFormStock(existing.stock)
          setFormStockMinimo(existing.stockMinimo)
          setFormCategoria(existing.categoria || '')
          setEditando(true)
        },
        alCancelar: () => {
          setFormId('')
        }
      })
    }
  }

  const guardarProducto = (e) => {
    e.preventDefault()
    if (!formId.trim() || !formNombre.trim() || !formPrecioVenta || !formStock) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Campos Obligatorios',
        mensaje: 'Por favor completa todos los campos obligatorios.'
      })
      return
    }

    agregarOEditarProducto({
      id: formId.trim(),
      nombre: formNombre.trim(),
      precioCompra: Number(formPrecioCompra) || 0,
      precioVenta: Number(formPrecioVenta),
      stock: Number(formStock),
      stockMinimo: Number(formStockMinimo) || 0,
      categoria: formCategoria.trim() || 'General',
    })

    setModalStockAbierto(false)
  }

  const handleScanSuccessStock = (codigo) => {
    setFormId(codigo)
    setScannerStockAbierto(false)
    verificarProductoExistente(codigo)
  }

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsSubmittingLogin(true)
    try {
      const success = await loginAdmin(passwordInput)
      if (success) {
        mostrarNotificacion({
          tipo: 'success',
          titulo: 'Acceso Permitido',
          mensaje: 'Has iniciado sesión como administrador correctamente.',
        })
        setPasswordInput('')
      } else {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Acceso Denegado',
          mensaje: 'Contraseña incorrecta. Intentalo de nuevo.',
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingLogin(false)
    }
  }

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!newPassword.trim()) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Campo Requerido',
        mensaje: 'La nueva contraseña no puede estar vacía.',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Contraseñas Diferentes',
        mensaje: 'Las contraseñas no coinciden.',
      })
      return
    }

    setIsSubmittingPassword(true)
    try {
      const success = await changeAdminPassword(newPassword)
      if (success) {
        mostrarNotificacion({
          tipo: 'success',
          titulo: 'Contraseña Actualizada',
          mensaje: 'La contraseña de administrador fue cambiada con éxito.',
        })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Error',
          mensaje: 'No se pudo cambiar la contraseña. Intentalo más tarde.',
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  // Calculations for Metrics
  const totalRevenue = historialCajas.reduce((acc, c) => {
    const salesAmount = (c.movimientos || [])
      .filter((m) => m.tipo === 'venta')
      .reduce((sum, m) => sum + m.monto, 0)
    return acc + salesAmount
  }, 0)

  const totalClosed = historialCajas.length

  const totalDiscrepancy = historialCajas.reduce(
    (acc, c) => acc + (c.diferencia || 0),
    0
  )

  const formatFecha = (isoString) => {
    return new Date(isoString).toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Screen 1: Login Lock
  if (!isAdminAuthenticated) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-[#090b11] flex items-center justify-center min-h-[80vh]">
        <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center space-y-6 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner animate-pulse">
            🔐
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              Panel de Administración
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Ingresá la clave de administrador para acceder a las métricas del negocio e historial de cajas.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="Contraseña de administrador"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-center text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:bg-white focus:border-indigo-500 dark:text-slate-200 dark:bg-[#090b11] dark:border-slate-800 transition-all duration-200"
                required
                disabled={isSubmittingLogin}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all btn-interactive flex justify-center items-center gap-2"
            >
              {isSubmittingLogin ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Validando...
                </>
              ) : (
                'Desbloquear Panel'
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Screen 2: Dashboard Admin Panel
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-8 bg-slate-50 dark:bg-[#090b11] pb-10" onScroll={adminActiveTab === 'stock' ? handleScrollStock : undefined}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Dashboard de Administración
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supervisión y control de turnos de caja cerrados.
          </p>
        </div>
        <button
          onClick={logoutAdmin}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all btn-interactive"
        >
          ❌ Cerrar Sesión Admin
        </button>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 shrink-0 select-none">
        <button
          onClick={() => setAdminActiveTab('dashboard')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${
            adminActiveTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205'
          }`}
        >
          📊 Resumen y Turnos
        </button>
        <button
          onClick={() => setAdminActiveTab('stock')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all ${
            adminActiveTab === 'stock'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205'
          }`}
        >
          📦 Inventario / Stock
        </button>
      </div>

      {adminActiveTab === 'stock' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Cabecera / Buscador */}
          <section className="flex flex-col gap-3 shrink-0">
            <div className="flex gap-3">
              <div className="relative flex-grow">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o código de barra..."
                  value={buscarStock}
                  onChange={(e) => setBuscarStock(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#10141f] dark:border-slate-800/80 dark:text-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium"
                />
              </div>
              <button
                onClick={abrirFormularioNuevo}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-5 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/15 btn-interactive shrink-0"
              >
                <span>+</span>
                <span>Nuevo Producto</span>
              </button>
            </div>

            {/* Filtros rápidos */}
            <div className="flex gap-2 items-center overflow-x-auto pb-1.5 text-xs scrollbar-none select-none shrink-0">
              <button
                type="button"
                onClick={() => setFiltroStockMinimo(!filtroStockMinimo)}
                className={`px-3.5 py-2.5 rounded-full font-bold border shrink-0 transition-all btn-interactive ${
                  filtroStockMinimo
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-500/5'
                    : 'bg-white border-slate-200 dark:bg-[#10141f] dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ⚠️ Stock Crítico
              </button>

              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0 mx-1" />

              {['', 'Bebidas', 'Golosinas', 'Snacks', 'Tabaquería', 'Helados', 'Varios'].map((cat) => {
                const activo = categoriaSeleccionada === cat
                const getCatEmoji = (c) => {
                  switch (c) {
                    case 'Bebidas': return '🥤'
                    case 'Golosinas': return '🍬'
                    case 'Snacks': return '🍿'
                    case 'Tabaquería': return '🚬'
                    case 'Helados': return '🍦'
                    case 'Varios': return '📦'
                    default: return '🛍️'
                  }
                }
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-black border transition-all btn-interactive whitespace-nowrap ${
                      activo
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-white border-slate-200 dark:bg-[#10141f] dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{getCatEmoji(cat)}</span>
                    <span>{cat || 'Todos'}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Grid de productos */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productosFiltrados.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-16">
                <span className="text-4xl">📦</span>
                <p className="font-semibold mt-2">No se encontraron productos.</p>
              </div>
            ) : (
              productosFiltrados.map((p) => {
                const stockBajo = p.stock <= p.stockMinimo
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200/80 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors"
                  >
                    <div
                      className="space-y-1.5 pr-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => abrirFormularioEditar(p)}
                    >
                      <p className="font-bold text-slate-800 dark:text-slate-205 leading-tight truncate">{p.nombre}</p>
                      <div className="flex items-center gap-2 text-xxs">
                        <span className="text-slate-400 dark:text-slate-500 font-mono truncate max-w-[120px]">
                          {p.id}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                          {p.categoria || 'General'}
                        </span>
                      </div>
                      <div className="flex gap-3.5 text-xxs pt-1">
                        <span className="text-slate-400 dark:text-slate-500">
                          Compra: <b>${p.precioCompra}</b>
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                          Venta: <b>${p.precioVenta}</b>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => abrirFormularioEditar(p)}
                      className="p-2 text-slate-400 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                      title="Editar producto"
                    >
                      ✏️
                    </button>

                    {/* Stock Controls */}
                    <div className="flex items-center gap-2 shrink-0 bg-slate-50 dark:bg-[#090b11]/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-800/40">
                      <button
                        onClick={() => actualizarStock(p.id, -1)}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-100 dark:bg-[#10141f] dark:hover:bg-slate-800 font-black active:scale-90 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all btn-interactive"
                      >
                        -
                      </button>

                      <div className="text-center min-w-[36px] px-1">
                        <span
                          className={`text-sm font-black block leading-none ${
                            stockBajo ? 'text-amber-600 dark:text-amber-400 animate-pulse font-extrabold' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {p.stock}
                        </span>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 block uppercase font-black tracking-widest mt-1">
                          Cant
                        </span>
                      </div>

                      <button
                        onClick={() => actualizarStock(p.id, 1)}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-100 dark:bg-[#10141f] dark:hover:bg-slate-800 font-black active:scale-90 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all btn-interactive"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Metric 1 */}
            <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                💰
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Ingresos Totales (Cerrados)
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  ${totalRevenue.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-5 hover:scale-[1.02] transition-transform duration-300">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                📦
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Turnos de Caja Cerrados
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {totalClosed}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-5 hover:scale-[1.02] transition-transform duration-300">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                  totalDiscrepancy >= 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                ⚖️
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Diferencia Total
                </span>
                <span
                  className={`text-2xl font-black mt-1 block ${
                    totalDiscrepancy >= 0
                      ? 'text-emerald-600 dark:text-emerald-450'
                      : 'text-rose-600 dark:text-rose-455'
                  }`}
                >
                  {totalDiscrepancy >= 0 ? '+' : ''}
                  ${totalDiscrepancy.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Shifts List (Span 2) */}
            <section className="lg:col-span-2 bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base uppercase tracking-wider">
                  📜 Historial de Turnos de Caja
                </h3>
                <p className="text-xxs text-slate-400 dark:text-slate-500 mt-1">
                  Registro completo de todos los cierres de caja.
                </p>
              </div>

              <div className="overflow-x-auto">
                {historialCajas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-16">
                    <span className="text-4xl mb-2">📭</span>
                    <p className="text-sm font-semibold">No hay turnos registrados en el historial.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 pr-2">Fecha y Hora</th>
                        <th className="pb-3 pr-2">Cajeros</th>
                        <th className="pb-3 pr-2 text-right">Inicial</th>
                        <th className="pb-3 pr-2 text-right">Cierre Físico</th>
                        <th className="pb-3 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                      {historialCajas.map((c) => {
                        const diff = c.diferencia || 0
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-[#151926]/40 transition-colors">
                            <td className="py-3.5 pr-2">
                              <span className="block font-bold text-slate-800 dark:text-slate-200">
                                {formatFecha(c.fechaCierre)}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                ID: {c.id}
                              </span>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="space-y-0.5 text-[11px]">
                                <div>
                                  🔑 <span className="text-slate-400">Abre:</span>{' '}
                                  <b>{c.cajeroApertura || 'Desconocido'}</b>
                                </div>
                                <div>
                                  🔒 <span className="text-slate-400">Cierra:</span>{' '}
                                  <b>{c.cajeroCierre || 'Desconocido'}</b>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 pr-2 text-right">
                              ${c.montoApertura.toLocaleString('es-AR')}
                            </td>
                            <td className="py-3.5 pr-2 text-right">
                              ${c.montoCierreFisico.toLocaleString('es-AR')}
                            </td>
                            <td
                              className={`py-3.5 text-right font-black text-sm ${
                                diff >= 0
                                  ? 'text-emerald-600 dark:text-emerald-450'
                                  : 'text-rose-600 dark:text-rose-455'
                              }`}
                            >
                              {diff >= 0 ? '+' : ''}
                              ${diff.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Configurations Side Panel (Span 1) */}
            <section className="bg-white border border-slate-205 dark:bg-[#10141f] dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base uppercase tracking-wider">
                  ⚙️ Cambiar Contraseña
                </h3>
                <p className="text-xxs text-slate-400 dark:text-slate-500 mt-1">
                  Actualizá la contraseña de acceso al panel de administración.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide block pl-0.5">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Nueva Contraseña"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-205 rounded-xl py-2.5 px-3 text-xs outline-none font-bold transition-all duration-200"
                    required
                    disabled={isSubmittingPassword}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide block pl-0.5">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-205 rounded-xl py-2.5 px-3 text-xs outline-none font-bold transition-all duration-200"
                    required
                    disabled={isSubmittingPassword}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-indigo-600/10 transition-all btn-interactive flex justify-center items-center gap-2"
                >
                  {isSubmittingPassword ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Nueva Clave'
                  )}
                </button>
              </form>
            </section>
          </div>
        </>
      )}

      {/* Modal Agregar / Editar Stock */}
      {modalStockAbierto && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-sm" onClick={() => setModalStockAbierto(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-[#10141f] border border-slate-200 dark:border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-base font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-5">
              {editando ? 'Editar Producto' : 'Cargar Producto'}
            </h3>

            <form onSubmit={guardarProducto} className="space-y-4 text-slate-700 dark:text-slate-300">
              {/* ID / Barcode */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                  Código de Barra *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código de barra o ID"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    onBlur={(e) => verificarProductoExistente(e.target.value)}
                    disabled={editando}
                    className="flex-grow bg-slate-100/70 disabled:bg-slate-200/80 border border-slate-200 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:disabled:bg-slate-900 dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none font-mono"
                    required
                  />
                  {!editando && (
                    <button
                      type="button"
                      onClick={() => setScannerStockAbierto(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 font-bold px-3.5 rounded-xl text-lg flex items-center justify-center transition-colors btn-interactive"
                    >
                      📷
                    </button>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Coca-Cola 500ml"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full bg-slate-100/70 border border-slate-200 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                  required
                />
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                    Precio Compra ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Compra"
                    value={formPrecioCompra}
                    onChange={(e) => setFormPrecioCompra(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-200 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                    Precio Venta ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="Venta"
                    value={formPrecioVenta}
                    onChange={(e) => setFormPrecioVenta(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-200 text-emerald-600 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-emerald-400 rounded-xl py-2.5 px-3 text-xs outline-none font-bold"
                    required
                  />
                </div>
              </div>

              {/* Stocks */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-200 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    placeholder="Alerta de falta"
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-205 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block pl-0.5">
                  Categoría
                </label>
                <input
                  type="text"
                  placeholder="Ej. Bebidas, Golosinas, Almacén"
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full bg-slate-100/70 border border-slate-200 text-slate-955 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                />
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {editando ? (
                  <button
                    type="button"
                    onClick={() => {
                      mostrarNotificacion({
                        tipo: 'warning',
                        titulo: 'Eliminar Producto',
                        mensaje: '¿Seguro querés eliminar este producto de tu catálogo?',
                        alAceptar: () => {
                          eliminarProducto(formId)
                          setModalStockAbierto(false)
                        },
                        alCancelar: () => {}
                      })
                    }}
                    className="py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-2xl text-center border border-rose-200 dark:border-rose-500/20 btn-interactive"
                  >
                    Eliminar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalStockAbierto(false)}
                    className="py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-center btn-interactive"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold rounded-2xl text-center shadow-lg shadow-indigo-500/10 btn-interactive"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Escáner de Cámara Stock */}
      <ScannerModal
        isOpen={scannerStockAbierto}
        onClose={() => setScannerStockAbierto(false)}
        onScanSuccess={handleScanSuccessStock}
      />
    </div>
  )
}
