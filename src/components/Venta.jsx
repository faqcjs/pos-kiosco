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

  const listadoProductosGrid = buscarProducto.trim()
    ? productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(buscarProducto.trim().toLowerCase()) ||
          p.id.toLowerCase().includes(buscarProducto.trim().toLowerCase())
      ).slice(0, 16)
    : productos.filter((p) => p.stock > 0).slice(0, 12)

  // Sub-componente del contenido del carrito para reutilizar en móvil y escritorio
  const CartItemsList = () => (
    <div className="space-y-2">
      {carrito.map((item) => (
        <div
          key={item.id}
          className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-fade-in"
        >
          <div className="min-w-0 pr-3">
            <p className="font-bold text-slate-200 text-sm leading-snug truncate">
              {item.nombre}
            </p>
            <span className="text-[11px] font-black text-indigo-400 block mt-0.5">
              ${item.precio.toLocaleString('es-AR')} c/u
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1)}
              className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 font-bold active:bg-slate-750 flex items-center justify-center text-slate-300 btn-interactive"
            >
              -
            </button>
            <span className="text-sm font-black text-slate-100 min-w-[20px] text-center">
              {item.cantidad}
            </span>
            <button
              onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1)}
              className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 font-bold active:bg-slate-750 flex items-center justify-center text-slate-300 btn-interactive"
            >
              +
            </button>
            <button
              onClick={() => eliminarDelCarrito(item.id)}
              className="text-slate-500 hover:text-rose-400 p-1 text-sm font-bold ml-1 transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full pb-16 md:pb-0 bg-[#090b11]">
      {/* SECCIÓN 1: LADO IZQUIERDO (Buscador, rápidos, monto) */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-5">
        {/* Warning caja cerrada */}
        {!cajaActiva && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs rounded-2xl py-3 px-4 flex items-center gap-2 shadow-inner">
            <span>⚠️</span>
            <span>La caja está cerrada. Debés abrirla en la pestaña "Caja" antes de poder vender.</span>
          </div>
        )}

        {/* Buscador & Scanner */}
        <section className="flex gap-3 shrink-0">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar producto o escanear..."
              value={buscarProducto}
              onChange={(e) => setBuscarProducto(e.target.value)}
              className="w-full bg-[#10141f] border border-slate-800/80 rounded-2xl py-3.5 pl-11 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium text-slate-200"
            />
            {buscarProducto && (
              <button
                onClick={() => setBuscarProducto('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm active:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setScannerAbierto(true)}
            className="bg-indigo-600/10 border border-indigo-500/25 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl px-5 flex items-center justify-center text-xl shadow-md btn-interactive"
          >
            📷
          </button>
        </section>

        {/* Grid de Productos Rápidos y Búsqueda */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest block pl-1">
            {buscarProducto.trim() ? '🔎 Resultados de Búsqueda' : '🔥 Los Más Vendidos'}
          </h2>
          {listadoProductosGrid.length === 0 ? (
            <div className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
              ⚠️ No se encontraron productos coincidentes.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {listadoProductosGrid.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p.id)}
                  className="flex flex-col items-center justify-between bg-[#10141f]/70 border border-slate-800/80 rounded-2xl p-4.5 hover:border-indigo-500/50 hover:bg-[#10141f] active:scale-95 duration-100 hover:shadow-lg hover:shadow-indigo-950/30 text-center min-h-[110px] btn-interactive"
                >
                  <span className="text-xs sm:text-sm font-black text-slate-200 leading-snug line-clamp-2">
                    {p.nombre}
                  </span>
                  <div className="mt-2 w-full">
                    <span className="text-sm font-black text-emerald-450 block">
                      ${p.precioVenta.toLocaleString('es-AR')}
                    </span>
                    <span className={`text-[10px] font-bold block mt-0.5 ${p.stock <= p.stockMinimo ? 'text-rose-450' : 'text-slate-550'}`}>
                      Stock: {p.stock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Monto Rápido */}
        <section className="bg-[#10141f] rounded-2xl p-4 border border-slate-800/80 shadow-md flex gap-3 items-center">
          <div className="flex-grow">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 pl-0.5">
              Ingreso de Importe Rápido (Sin código)
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                $
              </span>
              <input
                ref={inputMontoRef}
                type="number"
                placeholder="Ingresar importe arbitrario..."
                value={montoRapidoInput}
                onChange={(e) => setMontoRapidoInput(e.target.value)}
                onKeyDown={handleKeyDownMonto}
                className="w-full bg-[#090b11] border border-slate-800/80 rounded-xl py-2.5 pl-8 pr-3 text-sm font-black text-slate-200 outline-none focus:border-indigo-500"
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
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">
              Detalle del Carrito
            </h2>
            <div className="flex-grow overflow-y-auto pr-1">
              <CartItemsList />
            </div>
            {/* Checkout móvil */}
            <div className="pt-4 bg-gradient-to-t from-[#090b11] via-[#090b11] to-transparent sticky bottom-0">
              <button
                onClick={handleCobrar}
                disabled={total === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-base py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/15 btn-interactive"
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
      <div className="hidden md:flex w-96 bg-[#10141f] border-l border-slate-800/80 flex-col justify-between shrink-0 overflow-hidden">
        {/* Encabezado Carrito */}
        <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-[#141926]">
          <span className="font-extrabold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
            🛒 Carrito Activo
          </span>
          <span className="bg-indigo-500/15 text-indigo-400 text-xs font-black px-2.5 py-1 rounded-full">
            {carrito.length} Items
          </span>
        </div>

        {/* Lista del Carrito con auto-scroll */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {carrito.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <span className="text-4xl animate-pulse">🛒</span>
              <p className="text-sm font-semibold">El carrito está vacío</p>
              <p className="text-xs max-w-[200px]">Hace click en los productos rápidos o escanealos para agregarlos.</p>
            </div>
          ) : (
            <CartItemsList />
          )}
        </div>

        {/* Resumen & Checkout de Escritorio */}
        <div className="p-4 border-t border-slate-800/80 bg-[#141926] space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-400 uppercase">Subtotal</span>
            <span className="text-2xl font-black text-slate-100">${total.toLocaleString('es-AR')}</span>
          </div>

          <button
            onClick={handleCobrar}
            disabled={total === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 btn-interactive"
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
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-fade-in"
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
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#10141f] border border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />

            <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total a cobrar
            </h3>
            <p className="text-center text-3xl font-black text-emerald-400 mb-5">
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
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5'
                    : 'bg-[#151926] border-slate-800 text-slate-400 hover:text-slate-200'
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
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/5'
                    : 'bg-[#151926] border-slate-800 text-slate-400 hover:text-slate-200'
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
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5'
                    : 'bg-[#151926] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-2xl">📓</span>
                <span>Fiado</span>
              </button>
            </div>

            {/* A. OPCIONES EFECTIVO (Paga con / Vuelto) */}
            {metodoSeleccionado === 'Efectivo' && (
              <div className="space-y-4 mb-5 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-emerald-400 uppercase tracking-wide block pl-0.5">
                    ¿Con cuánto paga el cliente?
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">$</span>
                    <input
                      type="number"
                      placeholder="Ej. 2000, 5000"
                      value={pagaCon}
                      onChange={(e) => setPagaCon(e.target.value)}
                      className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 pl-7 pr-3 text-xs outline-none focus:border-emerald-500 text-slate-200 font-bold"
                    />
                  </div>
                </div>

                {/* Vuelto a dar */}
                {pagaCon && Number(pagaCon) >= total && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center animate-fade-in">
                    <span className="text-xs font-bold text-emerald-400 uppercase">Vuelto a dar:</span>
                    <span className="text-lg font-black text-emerald-300">
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
                      <label className="text-xxs font-black text-rose-450 uppercase tracking-wide block pl-0.5">
                        ¿A quién le cargamos el fiado? *
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreandoClienteInline(true)}
                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                      >
                        + Crear Cliente
                      </button>
                    </div>

                    {clientes.length === 0 ? (
                      <p className="text-xs text-rose-400/80 py-2 text-center bg-[#090b11] border border-slate-800 rounded-xl">
                        ⚠️ No hay deudores cargados. Creá uno tocando "+ Crear Cliente".
                      </p>
                    ) : (
                      <select
                        value={clienteSeleccionadoId}
                        onChange={(e) => setClienteSeleccionadoId(e.target.value)}
                        className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-rose-500 text-slate-200"
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
                    <h4 className="text-xxs font-black text-indigo-400 uppercase tracking-wide">
                      Registrar Nuevo Cliente Inline
                    </h4>
                    
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Nombre completo *"
                        value={nuevoClienteNombre}
                        onChange={(e) => setNuevoClienteNombre(e.target.value)}
                        className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <input
                        type="tel"
                        placeholder="Teléfono (opcional)"
                        value={nuevoClienteTelefono}
                        onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                        className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500 text-slate-200"
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
                        className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-lg"
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
                className="py-3.5 bg-slate-800 active:bg-slate-750 hover:bg-slate-700/80 text-slate-300 font-bold rounded-2xl text-center btn-interactive"
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
      )}      {/* Escáner de Cámara */}
      <ScannerModal
        isOpen={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
