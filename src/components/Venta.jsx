import { useState, useRef, useEffect } from 'react'
import useKioskoStore from '../store/kioskoStore'
import ScannerModal from './ScannerModal'

export default function Venta() {
  const {
    productos,
    carrito,
    cajaActiva,
    clientes,
    agregarAlCarrito,
    agregarMontoRapido,
    actualizarCantidadCarrito,
    eliminarDelCarrito,
    procesarCobro,
    agregarCliente,
    mostrarNotificacion,
  } = useKioskoStore()

  // State local
  const [buscarProducto, setBuscarProducto] = useState('')
  const [montoRapidoInput, setMontoRapidoInput] = useState('')
  const [scannerAbierto, setScannerAbierto] = useState(false)
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false)
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('')
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [pagaCon, setPagaCon] = useState('')
  const [creandoClienteInline, setCreandoClienteInline] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('')
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [visibleCount, setVisibleCount] = useState(12)

  const inputMontoRef = useRef(null)
  const scrollRef = useRef(null)

  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  // Auto-scroll del carrito cuando se agregan items
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [carrito])

  // Escuchar inputs del buscador para código de barra exacto
  useEffect(() => {
    if (buscarProducto) {
      const prodEncontrado = productos.find(
        (p) => p.id === buscarProducto.trim()
      )
      if (prodEncontrado) {
        agregarAlCarrito(prodEncontrado.id, 1)
        setBuscarProducto('') // Limpiar buscador
      }
    }
  }, [buscarProducto])

  const handleAgregarMontoRapido = () => {
    const num = parseFloat(montoRapidoInput)
    if (!isNaN(num) && num > 0) {
      agregarMontoRapido(num)
      setMontoRapidoInput('')
      inputMontoRef.current?.focus()
    }
  }

  const handleKeyDownMonto = (e) => {
    if (e.key === 'Enter') handleAgregarMontoRapido()
  }

  const handleScanSuccess = (codigo) => {
    const prod = productos.find((p) => p.id === codigo)
    if (prod) {
      agregarAlCarrito(prod.id, 1)
    } else {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Producto No Encontrado',
        mensaje: `No existe ningún producto registrado con el código: ${codigo}`
      })
    }
    setScannerAbierto(false)
  }

  const handleCobrar = () => {
    if (!cajaActiva) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Caja Cerrada',
        mensaje: 'Primero debés abrir la caja desde la pestaña de Caja.'
      })
      return
    }
    setModalCobroAbierto(true)
  }

  const confirmarCobro = () => {
    if (!metodoSeleccionado) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Método de Pago',
        mensaje: 'Por favor seleccioná un método de pago.'
      })
      return
    }

    if (metodoSeleccionado === 'Fiado' && !clienteSeleccionadoId) {
      mostrarNotificacion({
        tipo: 'warning',
        titulo: 'Cliente Requerido',
        mensaje: 'Por favor seleccioná qué cliente va a fiar.'
      })
      return
    }

    const clienteNombre = metodoSeleccionado === 'Fiado'
      ? clientes.find((c) => c.id === clienteSeleccionadoId)?.nombre
      : null

    const items = carrito
      .map((p) => `${p.nombre} x${p.cantidad} = $${p.precio * p.cantidad}`)
      .join('\n')

    const exito = procesarCobro(
      metodoSeleccionado,
      metodoSeleccionado === 'Fiado' ? clienteSeleccionadoId : null,
      metodoSeleccionado === 'Efectivo' ? Number(pagaCon) || 0 : 0
    )

    if (exito) {
      mostrarNotificacion({
        tipo: 'success',
        titulo: 'Venta Completada',
        mensaje: `Venta procesada con éxito!\n\nMétodo: ${metodoSeleccionado} ${clienteNombre ? `(${clienteNombre})` : ''}\nTotal: $${total.toLocaleString('es-AR')}\n\n${items}`
      })
      setModalCobroAbierto(false)
      setMetodoSeleccionado('')
      setClienteSeleccionadoId('')
      setPagaCon('')
      setCreandoClienteInline(false)
      setNuevoClienteNombre('')
      setNuevoClienteTelefono('')
    }
  }

  // Resetear paginado al cambiar filtros
  useEffect(() => {
    setVisibleCount(12)
  }, [buscarProducto, categoriaSeleccionada])

  const esVistaMasVendidos = !buscarProducto.trim() && !categoriaSeleccionada

  // Filtrado de productos por búsqueda y categoría
  const listadoFiltrado = esVistaMasVendidos
    ? productos.filter((p) => p.stock > 0).slice(0, 10)
    : productos.filter((p) => {
        const coincideBusqueda = !buscarProducto.trim() || 
          p.nombre.toLowerCase().includes(buscarProducto.trim().toLowerCase()) ||
          p.id.toLowerCase().includes(buscarProducto.trim().toLowerCase())
        
        const coincideCategoria = !categoriaSeleccionada || p.categoria === categoriaSeleccionada
        
        return coincideBusqueda && coincideCategoria
      })

  const listadoProductosGrid = esVistaMasVendidos 
    ? listadoFiltrado
    : listadoFiltrado.slice(0, visibleCount)

  const handleLeftScroll = (e) => {
    if (esVistaMasVendidos) return
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setVisibleCount((prev) => Math.min(prev + 12, listadoFiltrado.length))
    }
  }

  // Sub-componente del contenido del carrito para reutilizar en móvil y escritorio
  const CartItemsList = () => (
    <div className="space-y-2">
      {carrito.map((item) => (
        <div
          key={item.id}
          className="bg-slate-50 dark:bg-slate-800/40 border border-slate-205 dark:border-slate-700/30 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-fade-in"
        >
          <div className="min-w-0 pr-3">
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug truncate">
              {item.nombre}
            </p>
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
              ${item.precio.toLocaleString('es-AR')} c/u
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1)}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:active:bg-slate-750 flex items-center justify-center text-slate-600 dark:text-slate-300 btn-interactive"
            >
              -
            </button>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 min-w-[20px] text-center">
              {item.cantidad}
            </span>
            <button
              onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1)}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:active:bg-slate-750 flex items-center justify-center text-slate-600 dark:text-slate-300 btn-interactive"
            >
              +
            </button>
            <button
              onClick={() => eliminarDelCarrito(item.id)}
              className="text-slate-400 hover:text-rose-500 p-1 text-sm font-bold ml-1 transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full pb-16 md:pb-0 bg-[#f8fafc] dark:bg-[#090b11]">
      {/* SECCIÓN 1: LADO IZQUIERDO (Buscador, rápidos, monto) */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-5" onScroll={handleLeftScroll}>
        {/* Warning caja cerrada */}
        {!cajaActiva && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-2xl py-3 px-4 flex items-center gap-2 shadow-inner">
            <span>⚠️</span>
            <span>La caja está cerrada. Debés abrirla en la pestaña "Caja" antes de poder vender.</span>
          </div>
        )}

        {/* Buscador & Scanner */}
        <section className="flex gap-3 shrink-0">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 dark:text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar producto o escanear..."
              value={buscarProducto}
              onChange={(e) => setBuscarProducto(e.target.value)}
              className="w-full bg-white border border-slate-205 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#10141f] dark:border-slate-800/80 dark:text-slate-200 rounded-2xl py-3.5 pl-11 pr-10 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium"
            />
            {buscarProducto && (
              <button
                onClick={() => setBuscarProducto('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 text-sm dark:active:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setScannerAbierto(true)}
            className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-600/10 dark:border-indigo-500/25 dark:hover:bg-indigo-600/20 dark:text-indigo-400 rounded-2xl px-5 flex items-center justify-center text-xl shadow-md btn-interactive"
          >
            📷
          </button>
        </section>

        {/* Filtros por Categoría */}
        <section className="flex gap-2 overflow-x-auto pb-1.5 shrink-0 scrollbar-none select-none">
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
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black border transition-all btn-interactive whitespace-nowrap ${
                  activo
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white border-slate-200 dark:bg-[#10141f] dark:border-slate-800 text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205'
                }`}
              >
                <span>{getCatEmoji(cat)}</span>
                <span>{cat || 'Todos'}</span>
              </button>
            )
          })}
        </section>

        {/* Grid de Productos Rápidos y Búsqueda */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block pl-1">
            {buscarProducto.trim() 
              ? `🔎 Resultados de Búsqueda (${listadoFiltrado.length})` 
              : categoriaSeleccionada 
                ? `📂 Catálogo: ${categoriaSeleccionada} (${listadoFiltrado.length})` 
                : `🔥 Los Más Vendidos (${listadoFiltrado.length})`}
          </h2>
          {listadoProductosGrid.length === 0 ? (
            <div className="bg-white border border-slate-200 dark:bg-[#10141f] dark:border-slate-800/80 rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 text-xs font-medium shadow-sm">
              ⚠️ No se encontraron productos coincidentes.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-center">
              {listadoProductosGrid.map((p) => {
                const getEmoji = (cat) => {
                  switch (cat) {
                    case 'Bebidas': return '🥤'
                    case 'Golosinas': return '🍬'
                    case 'Snacks': return '🍿'
                    case 'Tabaquería': return '🚬'
                    case 'Helados': return '🍦'
                    default: return '📦'
                  }
                }
                return (
                  <button
                    key={p.id}
                    onClick={() => agregarAlCarrito(p.id)}
                    className="relative flex flex-col items-center justify-center bg-white dark:bg-[#10141f] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800 active:scale-95 duration-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 text-center min-h-[140px] gap-2 btn-interactive"
                  >
                    <span className="text-2xl filter drop-shadow">{getEmoji(p.categoria)}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 max-w-[95%]">
                      {p.nombre}
                    </span>
                    <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                        ${p.precioVenta.toLocaleString('es-AR')}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${
                        p.stock <= p.stockMinimo 
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/10 animate-pulse' 
                          : 'bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-450'
                      }`}>
                        Stock: {p.stock}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Monto Rápido */}
        <section className="bg-white dark:bg-[#10141f] rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm flex gap-3 items-center">
          <div className="flex-grow">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-1 pl-0.5">
              Ingreso de Importe Rápido (Sin código)
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500">
                $
              </span>
              <input
                ref={inputMontoRef}
                type="number"
                placeholder="Ingresar importe arbitrario..."
                value={montoRapidoInput}
                onChange={(e) => setMontoRapidoInput(e.target.value)}
                onKeyDown={handleKeyDownMonto}
                className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800/80 dark:text-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-sm font-black outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAgregarMontoRapido}
            disabled={!montoRapidoInput || parseFloat(montoRapidoInput) <= 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-black text-xl w-14 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/15 btn-interactive self-end"
          >
            +
          </button>
        </section>

        {/* Carrito Móvil (Oculto en desktop para evitar doble carrito) */}
        {carrito.length > 0 && (
          <section className="md:hidden flex-1 flex flex-col overflow-hidden min-h-[200px]">
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-2 pl-1">
              Detalle del Carrito
            </h2>
            <div className="flex-grow overflow-y-auto pr-1">
              <CartItemsList />
            </div>
            {/* Checkout móvil */}
            <div className="pt-4 bg-gradient-to-t from-slate-50 via-slate-50 dark:from-[#090b11] dark:via-[#090b11] to-transparent sticky bottom-0">
              <button
                onClick={handleCobrar}
                disabled={total === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white font-black text-base py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/15 btn-interactive"
              >
                <span>Cobrar Carrito</span>
                <span className="text-lg font-black border-l border-white/20 pl-2">
                  ${total.toLocaleString('es-AR')}
                </span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* SECCIÓN 2: LADO DERECHO - CARRO DE ESCRITORIO (Visible sólo en PC) */}
      <div className="hidden md:flex w-96 bg-white dark:bg-[#10141f] border-l border-slate-200 dark:border-slate-800/80 flex-col justify-between shrink-0 overflow-hidden shadow-sm">
        {/* Encabezado Carrito */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex justify-between items-center bg-slate-100 dark:bg-[#141926]">
          <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            🛒 Carrito Activo
          </span>
          <span className="bg-indigo-500/15 text-indigo-655 dark:text-indigo-400 text-xs font-black px-2.5 py-1 rounded-full">
            {carrito.length} Items
          </span>
        </div>

        {/* Lista del Carrito con auto-scroll */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-slate-400 dark:text-slate-500">
              <span className="text-4xl animate-pulse">🛒</span>
              <p className="text-sm font-semibold">El carrito está vacío</p>
              <p className="text-xs max-w-[200px]">Hace click en los productos rápidos o escanealos para agregarlos.</p>
            </div>
          ) : (
            <CartItemsList />
          )}
        </div>

        {/* Resumen & Checkout de Escritorio */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-[#141926] space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Subtotal</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">${total.toLocaleString('es-AR')}</span>
          </div>

          <button
            onClick={handleCobrar}
            disabled={total === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 btn-interactive"
          >
            <span>Cobrar</span>
            <span className="text-xl font-black border-l border-white/20 pl-2">
              ${total.toLocaleString('es-AR')}
            </span>
          </button>
        </div>
      </div>

      {/* Modal de Cobro */}
      {modalCobroAbierto && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-sm animate-fade-in"
            onClick={() => {
              setModalCobroAbierto(false)
              setMetodoSeleccionado('')
              setClienteSeleccionadoId('')
              setPagaCon('')
              setCreandoClienteInline(false)
              setNuevoClienteNombre('')
              setNuevoClienteTelefono('')
            }}
          />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-[#10141f] border border-slate-205 dark:border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />

            <h3 className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
              Total a cobrar
            </h3>
            <p className="text-center text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-5">
              ${total.toLocaleString('es-AR')}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMetodoSeleccionado('Efectivo')
                  setCreandoClienteInline(false)
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold text-xs gap-2 transition-all btn-interactive ${
                  metodoSeleccionado === 'Efectivo'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-650 dark:text-emerald-400 shadow-md shadow-emerald-500/5'
                    : 'bg-slate-105 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-[#151926] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-205'
                }`}
              >
                <span className="text-2xl">💵</span>
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodoSeleccionado('QR / Transferencia')
                  setCreandoClienteInline(false)
                  setPagaCon('')
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold text-xs gap-2 transition-all btn-interactive ${
                  metodoSeleccionado === 'QR / Transferencia'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-650 dark:text-blue-400 shadow-md shadow-blue-500/5'
                    : 'bg-slate-105 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-[#151926] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-205'
                }`}
              >
                <span className="text-2xl">📱</span>
                <span>QR/Transf</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodoSeleccionado('Fiado')
                  setPagaCon('')
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold text-xs gap-2 transition-all btn-interactive ${
                  metodoSeleccionado === 'Fiado'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-500/5'
                    : 'bg-slate-105 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-[#151926] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-205'
                }`}
              >
                <span className="text-2xl">📓</span>
                <span>Fiado</span>
              </button>
            </div>

            {/* A. OPCIONES EFECTIVO (Paga con / Vuelto) */}
            {metodoSeleccionado === 'Efectivo' && (
              <div className="space-y-4 mb-5 bg-emerald-500/5 border border-emerald-555/10 p-4 rounded-2xl animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block pl-0.5">
                    ¿Con cuánto paga el cliente?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-405 dark:text-slate-500 font-bold text-sm">$</span>
                    <input
                      type="number"
                      placeholder="Ej. 2000, 5000"
                      value={pagaCon}
                      onChange={(e) => setPagaCon(e.target.value)}
                      className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-505 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-202 rounded-xl py-2.5 pl-7 pr-3 text-xs outline-none font-bold"
                    />
                  </div>

                  {/* Atajos de billetes rápidos */}
                  <div className="flex gap-2 pt-1 select-none">
                    {[2000, 10000, 20000].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => {
                          const actual = Number(pagaCon) || 0
                          setPagaCon(String(actual + valor))
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-750 dark:text-slate-350 dark:border-slate-700/50 active:scale-95 font-black text-[10px] py-2 rounded-xl shadow-sm transition-all btn-interactive"
                      >
                        +${valor.toLocaleString('es-AR')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPagaCon('')}
                      className="bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-600 dark:text-rose-400 font-black text-[10px] px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-500/20 shadow-sm transition-all btn-interactive"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Vuelto a dar */}
                {pagaCon && Number(pagaCon) >= total && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center animate-fade-in">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Vuelto a dar:</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      ${(Number(pagaCon) - total).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* B. OPCIONES FIADO (Selector / Crear inline) */}
            {metodoSeleccionado === 'Fiado' && (
              <div className="space-y-4 mb-5 bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl animate-fade-in">
                {!creandoClienteInline ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xxs font-black text-rose-650 dark:text-rose-450 uppercase tracking-wide block pl-0.5">
                        ¿A quién le cargamos el fiado? *
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreandoClienteInline(true)}
                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 uppercase tracking-wider"
                      >
                        + Crear Cliente
                      </button>
                    </div>

                    {clientes.length === 0 ? (
                      <p className="text-xs text-rose-600 dark:text-rose-400/80 py-2 text-center bg-slate-100/70 border border-slate-202 dark:bg-[#090b11] dark:border-slate-800 rounded-xl">
                        ⚠️ No hay deudores cargados. Creá uno tocando "+ Crear Cliente".
                      </p>
                    ) : (
                      <select
                        value={clienteSeleccionadoId}
                        onChange={(e) => setClienteSeleccionadoId(e.target.value)}
                        className="w-full bg-slate-105 border border-slate-200 text-slate-900 focus:bg-white focus:border-rose-505 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-202 rounded-xl py-2.5 px-3 text-xs outline-none"
                        required
                      >
                        <option value="">Seleccionar cliente</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} (Deuda: ${c.deuda})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  // Formulario de creación inline
                  <div className="space-y-3 animate-fade-in">
                    <h4 className="text-xxs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      Registrar Nuevo Cliente Inline
                    </h4>
                    
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Nombre completo *"
                        value={nuevoClienteNombre}
                        onChange={(e) => setNuevoClienteNombre(e.target.value)}
                        className="w-full bg-slate-105/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-202 rounded-xl py-2 px-3 text-xs outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <input
                        type="tel"
                        placeholder="Teléfono (opcional)"
                        value={nuevoClienteTelefono}
                        onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                        className="w-full bg-slate-105/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-202 rounded-xl py-2 px-3 text-xs outline-none"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCreandoClienteInline(false)
                          setNuevoClienteNombre('')
                          setNuevoClienteTelefono('')
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-202 text-[10px] font-bold rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (nuevoClienteNombre.trim()) {
                            const newId = agregarCliente(nuevoClienteNombre.trim(), nuevoClienteTelefono.trim())
                            setClienteSeleccionadoId(newId)
                            setNuevoClienteNombre('')
                            setNuevoClienteTelefono('')
                            setCreandoClienteInline(false)
                          } else {
                            mostrarNotificacion({
                              tipo: 'warning',
                              titulo: 'Nombre Requerido',
                              mensaje: 'El nombre del deudor es obligatorio.'
                            })
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg shadow-md"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones del Modal */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalCobroAbierto(false)
                  setMetodoSeleccionado('')
                  setClienteSeleccionadoId('')
                  setPagaCon('')
                  setCreandoClienteInline(false)
                  setNuevoClienteNombre('')
                  setNuevoClienteTelefono('')
                }}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-center btn-interactive"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCobro}
                disabled={
                  !metodoSeleccionado ||
                  (metodoSeleccionado === 'Fiado' && !clienteSeleccionadoId) ||
                  (metodoSeleccionado === 'Efectivo' && pagaCon && Number(pagaCon) < total)
                }
                className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 active:scale-95 text-white font-bold rounded-2xl text-center shadow-lg shadow-emerald-500/10 btn-interactive"
              >
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Escáner de Cámara */}
      <ScannerModal
        isOpen={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
