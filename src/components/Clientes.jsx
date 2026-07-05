import { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'

export default function Clientes() {
  const { clientes, agregarCliente, registrarPagoCliente, cajaActiva, mostrarNotificacion } = useKioskoStore()

  // State local
  const [buscar, setBuscar] = useState('')
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [telefonoNuevo, setTelefonoNuevo] = useState('')

  // State para detalle del cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [montoPago, setMontoPago] = useState('')

  const handleCrear = (e) => {
    e.preventDefault()
    if (nombreNuevo.trim()) {
      agregarCliente(nombreNuevo.trim(), telefonoNuevo.trim())
      setNombreNuevo('')
      setTelefonoNuevo('')
      setModalNuevoAbierto(false)
    }
  }

  const handlePago = (e) => {
    e.preventDefault()
    const monto = parseFloat(montoPago)
    if (!isNaN(monto) && monto > 0 && clienteSeleccionado) {
      if (monto > clienteSeleccionado.deuda) {
        mostrarNotificacion({
          tipo: 'warning',
          titulo: 'Monto Inválido',
          mensaje: 'El pago no puede superar la deuda total.'
        })
        return
      }
      registrarPagoCliente(clienteSeleccionado.id, monto)
      
      // Actualizar el cliente seleccionado en pantalla
      setClienteSeleccionado((prev) => ({
        ...prev,
        deuda: Math.max(0, prev.deuda - monto),
        historial: [
          {
            id: `pago-${Date.now()}`,
            tipo: 'pago',
            monto,
            detalle: 'Pago de deuda',
            timestamp: new Date().toISOString(),
          },
          ...prev.historial,
        ],
      }))
      setMontoPago('')
    }
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(buscar.toLowerCase())
  )

  const formatFecha = (isoString) => {
    return new Date(isoString).toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  // Componente que contiene el estado de cuenta y formulario de pago del cliente
  const ClientLedgerDetails = ({ client, onClose }) => {
    if (!client) return null
    return (
      <div className="space-y-5 animate-fade-in text-slate-350">
        <div className="flex justify-between items-start border-b border-slate-800 pb-4 bg-[#141926] p-4 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-black text-slate-100">{client.nombre}</h3>
            {client.telefono && (
              <p className="text-xs text-slate-500 mt-1">📞 {client.telefono}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 text-sm font-bold active:scale-90 md:hidden"
            >
              ✕
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-5">
          <div className="bg-rose-500/10 border-2 border-rose-500/25 rounded-2xl p-4 text-center max-w-[220px] mx-auto">
            <span className="text-[10px] text-rose-400 font-black block uppercase tracking-wider">
              Saldo Deudor Acumulado
            </span>
            <span className="text-3xl font-black text-rose-450 mt-1 block">
              ${client.deuda.toLocaleString('es-AR')}
            </span>
          </div>

          {/* Registrar un Pago */}
          {client.deuda > 0 && (
            <div className="border-t border-slate-800/80 pt-4">
              <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider mb-3">Registrar Entrega de Efectivo</h4>
              {!cajaActiva ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl p-3.5 text-center">
                  ⚠️ Abrí la caja en la pestaña de Caja para registrar pagos.
                </div>
              ) : (
                <form onSubmit={handlePago} className="flex gap-2">
                  <div className="relative flex-grow">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Monto entregado"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 pl-6.5 pr-2 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-950/20 transition-all btn-interactive"
                  >
                    Ingresar Pago
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Historial */}
          <div className="border-t border-slate-800/80 pt-4">
            <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider mb-3">Historial de Cuentas</h4>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {client.historial.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-xs">
                  No hay transacciones registradas todavía.
                </p>
              ) : (
                client.historial.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between border-b border-slate-800/40 pb-2.5 text-xs animate-fade-in"
                  >
                    <div className="pr-3">
                      <p className="font-bold text-slate-350 leading-tight">
                        {h.type === 'pago' ? 'Pago recibido' : h.detalle}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {formatFecha(h.timestamp)}
                      </span>
                    </div>
                    <span
                      className={`font-black shrink-0 ml-3 text-sm ${
                        h.tipo === 'deuda' ? 'text-rose-450' : 'text-emerald-450'
                      }`}
                    >
                      {h.tipo === 'deuda' ? '+' : '-'}${h.monto}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full pb-16 md:pb-0 bg-[#090b11]">
      {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA (1/3 en PC) */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 md:border-r md:border-slate-850">
        <section className="flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Buscar deudor..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="flex-grow bg-[#10141f] border border-slate-800/80 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-200"
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
          {clientesFiltrados.length === 0 ? (
            <div className="text-center text-slate-500 py-16">
              <span className="text-3xl">📓</span>
              <p className="font-semibold mt-2">No hay clientes registrados.</p>
            </div>
          ) : (
            clientesFiltrados.map((c) => {
              const seleccionado = clienteSeleccionado?.id === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setClienteSeleccionado(c)}
                  className={`bg-[#10141f] border rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                    seleccionado
                      ? 'border-indigo-500 bg-[#161a29]'
                      : 'border-slate-800/85 hover:border-slate-700/80'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-200 leading-tight truncate">{c.nombre}</p>
                    {c.telefono && <p className="text-[10px] text-slate-500 mt-1">📞 {c.telefono}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-black block leading-none ${
                        c.deuda > 0 ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      ${c.deuda.toLocaleString('es-AR')}
                    </span>
                    <span className="text-[9px] text-slate-500 block uppercase font-black tracking-widest mt-1">
                      Debe
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>

      {/* COLUMNA DERECHA: DETALLES DE CUENTA FIADO (PC ONLY - visible al lado de la lista) */}
      <div className="hidden md:flex w-[480px] bg-[#10141f] flex-col overflow-y-auto">
        {clienteSeleccionado ? (
          <ClientLedgerDetails client={clienteSeleccionado} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3">
            <span className="text-4xl">📓</span>
            <p className="font-semibold text-sm">Cuentas Corrientes (Fiados)</p>
            <p className="text-xs max-w-xs leading-relaxed">Seleccioná un cliente de la lista para ver el estado de su cuenta, registrar entregas de dinero o consultar su historial.</p>
          </div>
        )}
      </div>

      {/* MÓVIL: MODAL DETALLE CLIENTE DRAWER */}
      <div className="md:hidden">
        {clienteSeleccionado && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
              onClick={() => setClienteSeleccionado(null)}
            />
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#10141f] border border-slate-800 rounded-t-3xl z-50 py-5 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
              <ClientLedgerDetails
                client={clienteSeleccionado}
                onClose={() => setClienteSeleccionado(null)}
              />
              <div className="px-5 mt-2">
                <button
                  onClick={() => setClienteSeleccionado(null)}
                  className="w-full bg-slate-800 active:bg-slate-750 py-3.5 rounded-2xl text-slate-300 font-extrabold text-xs uppercase tracking-wider btn-interactive"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Nuevo Cliente */}
      {modalNuevoAbierto && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setModalNuevoAbierto(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#10141f] border border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-base font-black text-slate-300 uppercase tracking-widest mb-4">
              Registrar Cliente
            </h3>

            <form onSubmit={handleCrear} className="space-y-4 text-slate-300">
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wide block pl-0.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500 text-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wide block pl-0.5">
                  Teléfono / Celular
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 11 1234 5678"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoAbierto(false)}
                  className="py-3.5 bg-slate-800 active:bg-slate-755 text-slate-300 font-bold rounded-2xl text-center btn-interactive"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-extrabold rounded-2xl text-center shadow-lg shadow-indigo-500/10 btn-interactive"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
