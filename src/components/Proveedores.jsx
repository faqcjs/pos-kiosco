import { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'

export default function Proveedores() {
  const proveedores = useKioskoStore(state => state.proveedores)
  const agregarProveedor = useKioskoStore(state => state.agregarProveedor)
  const registrarRecepcionMercaderia = useKioskoStore(state => state.registrarRecepcionMercaderia)
  const registrarPagoProveedor = useKioskoStore(state => state.registrarPagoProveedor)
  const eliminarProveedor = useKioskoStore(state => state.eliminarProveedor)
  const cajaActiva = useKioskoStore(state => state.cajaActiva)
  const mostrarNotificacion = useKioskoStore(state => state.mostrarNotificacion)

  // State local
  const [buscar, setBuscar] = useState('')
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')

  // State para detalle del proveedor
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  
  // Inputs de acciones
  const [montoRecepcion, setMontoRecepcion] = useState('')
  const [detalleRecepcion, setDetalleRecepcion] = useState('')
  const [recepcionPagada, setRecepcionPagada] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [pagarDeCajaChica, setPagarDeCajaChica] = useState(true)

  const handleCrear = (e) => {
    e.preventDefault()
    if (nombreNuevo.trim()) {
      agregarProveedor(nombreNuevo.trim())
      setNombreNuevo('')
      setModalNuevoAbierto(false)
    }
  }

  const handleRecepcion = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoRecepcion)
    if (!isNaN(monto) && monto > 0 && proveedorSeleccionado) {
      if (recepcionPagada && !cajaActiva) {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Caja Cerrada',
          mensaje: 'No podés pagar en el momento porque la caja está cerrada.'
        })
        return
      }

      const exito = registrarRecepcionMercaderia(
        proveedorSeleccionado.id,
        monto,
        detalleRecepcion.trim() || 'Ingreso de mercadería',
        recepcionPagada
      )

      if (exito) {
        // Actualizar vista local
        setProveedorSeleccionado((prev) => {
          const nowIso = new Date().toISOString()
          const newHistory = []
          if (recepcionPagada) {
            newHistory.push({
              id: `pago-${Date.now() + 1}`,
              tipo: 'pago',
              monto,
              detalle: 'Pago al contado (Caja chica)',
              timestamp: nowIso,
            })
            newHistory.push({
              id: `mercaderia-${Date.now()}`,
              tipo: 'recepcion',
              monto,
              detalle: `${detalleRecepcion.trim() || 'Ingreso de mercadería'} (Pagado al contado de caja)`,
              timestamp: nowIso,
            })
          } else {
            newHistory.push({
              id: `mercaderia-${Date.now()}`,
              tipo: 'recepcion',
              monto,
              detalle: detalleRecepcion.trim() || 'Ingreso de mercadería',
              timestamp: nowIso,
            })
          }
          return {
            ...prev,
            deuda: recepcionPagada ? prev.deuda : prev.deuda + monto,
            historialPagos: [...newHistory, ...prev.historialPagos],
          }
        })
        setMontoRecepcion('')
        setDetalleRecepcion('')
        setRecepcionPagada(false)
      }
    }
  }

  const handlePago = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoPago)
    if (!isNaN(monto) && monto > 0 && proveedorSeleccionado) {
      if (monto > proveedorSeleccionado.deuda) {
        mostrarNotificacion({
          tipo: 'warning',
          titulo: 'Monto Inválido',
          mensaje: 'El pago no puede superar la deuda total.'
        })
        return
      }

      if (pagarDeCajaChica && !cajaActiva) {
        mostrarNotificacion({
          tipo: 'error',
          titulo: 'Caja Cerrada',
          mensaje: 'Debés abrir la caja para poder pagar desde la caja chica del kiosko.'
        })
        return
      }

      registrarPagoProveedor(proveedorSeleccionado.id, monto, pagarDeCajaChica)

      // Actualizar vista local
      setProveedorSeleccionado((prev) => ({
        ...prev,
        deuda: Math.max(0, prev.deuda - monto),
        historialPagos: [
          {
            id: `pago-${Date.now()}`,
            tipo: 'pago',
            monto,
            detalle: `Pago realizado ${pagarDeCajaChica ? '(De caja chica)' : ''}`,
            timestamp: new Date().toISOString(),
          },
          ...prev.historialPagos,
        ],
      }))
      setMontoPago('')
    }
  }

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase())
  )

  const formatFecha = (isoString) => {
    return new Date(isoString).toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  const renderSupplierLedgerDetails = (supplier, onClose) => {
    if (!supplier) return null
    return (
      <div className="space-y-5 animate-fade-in text-slate-600 dark:text-slate-350">
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4 bg-slate-100 dark:bg-[#141926] p-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{supplier.nombre}</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold tracking-wider mt-1">
              Registro del Proveedor
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 text-sm font-bold active:scale-90 md:hidden"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-5">
          <div className="bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-2xl p-4 text-center max-w-[220px] mx-auto">
            <span className="text-[10px] text-amber-650 dark:text-amber-400 font-black block uppercase tracking-wider">
              Nuestra Deuda Total
            </span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-450 mt-1 block">
              ${supplier.deuda.toLocaleString('es-AR')}
            </span>
          </div>

          {/* Registrar Recepción de Mercadería */}
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <h4 className="font-extrabold text-slate-750 dark:text-slate-200 text-xs uppercase tracking-wider mb-3">
              📦 Cargar Mercadería / Pedido
            </h4>
            <form onSubmit={handleRecepcion} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="Costo total"
                    value={montoRecepcion}
                    onChange={(e) => setMontoRecepcion(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 pl-8 pr-2 text-xs outline-none font-bold"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Detalle (ej. Lacteos, Pepsi)"
                  value={detalleRecepcion}
                  onChange={(e) => setDetalleRecepcion(e.target.value)}
                  className="flex-[1.5] bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                />
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all btn-interactive shrink-0"
                >
                  Registrar
                </button>
              </div>

              {/* Checkbox Pago en el momento */}
              <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 select-none pl-0.5">
                <input
                  type="checkbox"
                  checked={recepcionPagada}
                  onChange={(e) => setRecepcionPagada(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-[#090b11] border-slate-200 dark:border-slate-800 text-amber-500 focus:ring-amber-550 h-3.5 w-3.5"
                />
                <span>¿Pagar en el momento con efectivo de la caja chica?</span>
              </label>
              {recepcionPagada && !cajaActiva && (
                <p className="text-[10px] text-rose-600 dark:text-rose-450 pl-0.5 animate-pulse">
                  ⚠️ No podés pagar en el momento: Caja cerrada.
                </p>
              )}
            </form>
          </div>

          {/* Registrar un Pago */}
          {supplier.deuda > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
              <h4 className="font-extrabold text-slate-750 dark:text-slate-200 text-xs uppercase tracking-wider mb-3">
                💵 Registrar Pago al Proveedor
              </h4>
              <form onSubmit={handlePago} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Monto pagado"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2 pl-8 pr-2 text-xs font-bold outline-none"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md transition-all btn-interactive"
                  >
                    Pagar
                  </button>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={pagarDeCajaChica}
                    onChange={(e) => setPagarDeCajaChica(e.target.checked)}
                    className="rounded bg-slate-100 dark:bg-[#090b11] border-slate-200 dark:border-slate-800 text-indigo-500 focus:ring-indigo-550 h-3.5 w-3.5"
                  />
                  <span>¿Descontar de la caja chica del día?</span>
                </label>
                {pagarDeCajaChica && !cajaActiva && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-450">
                    ⚠️ Caja cerrada. Debés abrir la caja para poder usar fondos de caja chica.
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Historial de transacciones */}
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <h4 className="font-extrabold text-slate-750 dark:text-slate-200 text-xs uppercase tracking-wider mb-3">Historial de Transacciones</h4>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {supplier.historialPagos.length === 0 ? (
                <p className="text-center text-slate-405 dark:text-slate-500 py-8 text-xs">
                  No hay transacciones registradas todavía.
                </p>
              ) : (
                supplier.historialPagos.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/40 pb-2.5 text-xs animate-fade-in"
                  >
                    <div className="pr-3">
                      <p className="font-bold text-slate-750 dark:text-slate-355 leading-tight">
                        {h.detalle}
                      </p>
                      <span className="text-[10px] text-slate-405 dark:text-slate-500">
                        {formatFecha(h.timestamp)}
                      </span>
                    </div>
                    <span
                      className={`font-black shrink-0 ml-3 text-sm ${
                        h.tipo === 'recepcion' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-450'
                      }`}
                    >
                      {h.tipo === 'recepcion' ? '+' : '-'}${h.monto}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Botón Borrar Proveedor */}
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4 flex gap-3">
            <button
              onClick={() => {
                mostrarNotificacion({
                  tipo: 'warning',
                  titulo: 'Eliminar Proveedor',
                  mensaje: `¿Seguro querés eliminar a ${supplier.nombre}? Se borrará todo su historial.`,
                  alAceptar: () => {
                    eliminarProveedor(supplier.id)
                    setProveedorSeleccionado(null)
                    if (onClose) onClose()
                  },
                  alCancelar: () => {}
                })
              }}
              className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-600 dark:text-rose-455 font-bold rounded-xl text-xs uppercase tracking-wider transition-all btn-interactive text-center"
            >
              🗑️ Borrar Proveedor
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full bg-slate-50 dark:bg-[#090b11]">
      {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA (1/3 en PC) */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 md:border-r border-slate-200 dark:border-slate-800/80">
        <section className="flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Buscar distribuidora..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="flex-grow bg-white border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#10141f] dark:border-slate-800/80 dark:text-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          <button
            onClick={() => setModalNuevoAbierto(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15 btn-interactive shrink-0"
          >
            <span>+</span>
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </section>

        <section className="space-y-2 flex-grow overflow-y-auto pr-1">
          {proveedoresFiltrados.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 py-16">
              <span className="text-3xl">🚛</span>
              <p className="font-semibold mt-2">No hay proveedores registrados.</p>
            </div>
          ) : (
            proveedoresFiltrados.map((p) => {
              const seleccionado = proveedorSeleccionado?.id === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => setProveedorSeleccionado(p)}
                  className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                    seleccionado
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-[#161a29]'
                      : 'border-slate-200 dark:border-slate-800/85 hover:border-slate-350 dark:hover:border-slate-700/80'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{p.nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-black block leading-none ${
                        p.deuda > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      ${p.deuda.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-slate-405 dark:text-slate-500 block uppercase font-black tracking-widest mt-1">
                      Debemos
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>

      {/* COLUMNA DERECHA: DETALLES DE CUENTA DE PROVEEDORES (PC ONLY) */}
      <div className="hidden md:flex w-[480px] bg-white dark:bg-[#10141f] border-l border-slate-200 dark:border-slate-800/80 flex-col overflow-y-auto">
        {proveedorSeleccionado ? (
          renderSupplierLedgerDetails(proveedorSeleccionado)
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-405 dark:text-slate-500 p-8 text-center space-y-3">
            <span className="text-4xl">🚛</span>
            <p className="font-semibold text-sm">Registro de Proveedores y Cuentas</p>
            <p className="text-xs max-w-xs leading-relaxed">Seleccioná un proveedor de la lista para registrar mercadería al debe, pagos directos de caja chica o consultar el historial de facturas.</p>
          </div>
        )}
      </div>

      {/* MÓVIL: MODAL DETALLE PROVEEDOR DRAWER */}
      <div className="md:hidden">
        {proveedorSeleccionado && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-xs"
              onClick={() => setProveedorSeleccionado(null)}
            />
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-[#10141f] border border-slate-200 dark:border-slate-800 rounded-t-3xl z-50 py-5 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-5" />
              {renderSupplierLedgerDetails(
                proveedorSeleccionado,
                () => setProveedorSeleccionado(null)
              )}
              <div className="px-5 mt-2">
                <button
                  onClick={() => setProveedorSeleccionado(null)}
                  className="w-full bg-slate-100 hover:bg-slate-250 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-750 py-3.5 rounded-2xl text-slate-600 dark:text-slate-300 font-extrabold text-xs uppercase tracking-wider btn-interactive"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Nuevo Proveedor */}
      {modalNuevoAbierto && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 backdrop-blur-sm" onClick={() => setModalNuevoAbierto(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-[#10141f] border border-slate-200 dark:border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl">
            <div className="w-10 h-1 bg-slate-305 dark:bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-lg font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
              Registrar Proveedor
            </h3>

            <form onSubmit={handleCrear} className="space-y-4 text-slate-700 dark:text-slate-300">
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-450 dark:text-slate-500 uppercase tracking-wide block pl-0.5">
                  Nombre de la Distribuidora / Proveedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Distribuidora Arcor, Coca-Cola"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="w-full bg-slate-100/70 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 dark:bg-[#090b11] dark:border-slate-800 dark:text-slate-200 rounded-xl py-2.5 px-3 text-xs outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoAbierto(false)}
                  className="py-3.5 bg-slate-105 hover:bg-slate-200 active:bg-slate-200/80 dark:bg-slate-800 dark:active:bg-slate-755 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-center btn-interactive"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold rounded-2xl text-center shadow-lg shadow-indigo-500/10 btn-interactive"
                >
                  Crear Proveedor
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
