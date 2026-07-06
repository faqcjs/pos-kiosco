import useVenta from '../hooks/useVenta'
import ScannerModal from './ScannerModal'
import useKioskoStore from '../store/kioskoStore'

export default function Venta() {
  const {
    productos,
    carrito,
    cajaActiva,
    clientes,
    agregarAlCarrito,
    actualizarCantidadCarrito,
    eliminarDelCarrito,
    agregarCliente,
    buscarProducto,
    setBuscarProducto,
    montoRapidoInput,
    setMontoRapidoInput,
    scannerAbierto,
    setScannerAbierto,
    modalCobroAbierto,
    setModalCobroAbierto,
    metodoSeleccionado,
    setMetodoSeleccionado,
    clienteSeleccionadoId,
    setClienteSeleccionadoId,
    pagaCon,
    setPagaCon,
    creandoClienteInline,
    setCreandoClienteInline,
    nuevoClienteNombre,
    setNuevoClienteNombre,
    nuevoClienteTelefono,
    setNuevoClienteTelefono,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    cartDrawerOpen,
    setCartDrawerOpen,
    inputMontoRef,
    scrollRef,
    total,
    handleAgregarMontoRapido,
    handleKeyDownMonto,
    handleScanSuccess,
    handleCobrar,
    confirmarCobro,
    listadoFiltrado,
    listadoProductosGrid,
    handleLeftScroll,
    esVistaMasVendidos,
  } = useVenta()

  const cartCollapsed = useKioskoStore(state => state.cartCollapsed)
  const toggleCart = useKioskoStore(state => state.toggleCart)

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
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full bg-[#f8fafc] dark:bg-[#090b11]">
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

        {/* Carrito Móvil (Oculto en desktop - ahora se muestra en el FAB flotante) */}
      </div>

      {/* SECCIÓN 2: LADO DERECHO - CARRO DE ESCRITORIO (Visible sólo en PC) */}
      <div className={`hidden md:flex ${cartCollapsed ? 'w-20' : 'w-96'} bg-white dark:bg-[#10141f] border-l border-slate-200 dark:border-slate-800/80 flex-col justify-between shrink-0 overflow-hidden shadow-sm transition-all duration-350 ease-in-out`}>
        {/* Encabezado Carrito */}
        <div className={`p-4 border-b border-slate-200 dark:border-slate-800/80 flex ${cartCollapsed ? 'flex-col gap-3 items-center justify-center' : 'justify-between items-center'} bg-slate-100 dark:bg-[#141926]`}>
          {cartCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={toggleCart}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors btn-interactive"
                title="Expandir carrito"
              >
                ◀
              </button>
              <div className="relative">
                <span className="text-xl">🛒</span>
                {carrito.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {carrito.length}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              <span className="font-extrabold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                🛒 Carrito Activo
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/15 text-indigo-655 dark:text-indigo-400 text-xs font-black px-2.5 py-1 rounded-full">
                  {carrito.length} Items
                </span>
                <button
                  onClick={toggleCart}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-[#1f2638] text-slate-500 dark:text-slate-400 transition-colors btn-interactive"
                  title="Contraer carrito"
                >
                  ▶
                </button>
              </div>
            </>
          )}
        </div>

        {/* Lista del Carrito con auto-scroll */}
        <div className={`flex-grow overflow-y-auto ${cartCollapsed ? 'p-2' : 'p-4'} space-y-4`} ref={scrollRef}>
          {cartCollapsed ? (
            carrito.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <span className="text-2xl opacity-50">🛒</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {carrito.map((item) => (
                  <div key={item.id} className="relative flex flex-col items-center group" title={`${item.nombre} (x${item.cantidad})`}>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-sm select-none font-bold">
                      📦
                    </div>
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-[#10141f]">
                      {item.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            carrito.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-slate-400 dark:text-slate-500">
                <span className="text-4xl animate-pulse">🛒</span>
                <p className="text-sm font-semibold">El carrito está vacío</p>
                <p className="text-xs max-w-[200px]">Hace click en los productos rápidos o escanealos para agregarlos.</p>
              </div>
            ) : (
              <CartItemsList />
            )
          )}
        </div>

        {/* Resumen & Checkout de Escritorio */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-[#141926] ${cartCollapsed ? 'py-5' : 'space-y-4'}`}>
          {cartCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">${total.toLocaleString('es-AR')}</span>
              </div>
              <button
                onClick={handleCobrar}
                disabled={total === 0}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 text-white font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/15 btn-interactive transition-all"
                title={`Cobrar: $${total.toLocaleString('es-AR')}`}
              >
                💵
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
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

      {/* Botón Flotante de Carrito para Móvil */}
      {carrito.length > 0 && (
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="fixed bottom-20 right-4 z-30 md:hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3.5 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-indigo-400/20 active:scale-95 transition-all btn-interactive animate-fade-in"
        >
          <span className="text-xl">🛒</span>
          <span className="bg-white text-indigo-600 dark:text-indigo-800 font-black text-xs px-2 py-0.5 rounded-full shadow-sm">
            {carrito.reduce((acc, item) => acc + item.cantidad, 0)}
          </span>
          <span className="font-black text-xs">${total.toLocaleString('es-AR')}</span>
        </button>
      )}

      {/* Drawer de Carrito para Móvil */}
      {cartDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-sm animate-fade-in md:hidden"
            onClick={() => setCartDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#10141f] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl max-h-[85vh] flex flex-col md:hidden">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-sm text-slate-750 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                🛒 Carrito de Compras
              </h3>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 mb-5">
              <CartItemsList />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total a pagar</span>
                <span className="text-2xl font-black text-slate-850 dark:text-slate-100">
                  ${total.toLocaleString('es-AR')}
                </span>
              </div>

              <button
                onClick={() => {
                  setCartDrawerOpen(false)
                  handleCobrar()
                }}
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
        </>
      )}
    </div>
  )
}
