import { useState } from 'react'
import useKioskoStore from '../store/kioskoStore'
import ScannerModal from './ScannerModal'

export default function Stock() {
  const { productos, agregarOEditarProducto, eliminarProducto, actualizarStock, mostrarNotificacion } = useKioskoStore()

  // State local
  const [buscar, setBuscar] = useState('')
  const [filtroStockMinimo, setFiltroStockMinimo] = useState(false)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [scannerAbierto, setScannerAbierto] = useState(false)

  // State para formulario (Agregar / Editar)
  const [formId, setFormId] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formPrecioCompra, setFormPrecioCompra] = useState('')
  const [formPrecioVenta, setFormPrecioVenta] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formStockMinimo, setFormStockMinimo] = useState('')
  const [formCategoria, setFormCategoria] = useState('')
  const [editando, setEditando] = useState(false)

  const categorias = Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean)))

  // Filtrado de productos
  const productosFiltrados = productos.filter((p) => {
    const matchesBuscar =
      p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      p.id.toLowerCase().includes(buscar.toLowerCase())
    const matchesCategoria = categoriaSeleccionada ? p.categoria === categoriaSeleccionada : true
    const matchesStockMin = filtroStockMinimo ? p.stock <= p.stockMinimo : true
    return matchesBuscar && matchesCategoria && matchesStockMin
  })

  const abrirFormularioNuevo = () => {
    setFormId('')
    setFormNombre('')
    setFormPrecioCompra('')
    setFormPrecioVenta('')
    setFormStock('')
    setFormStockMinimo('')
    setFormCategoria('')
    setEditando(false)
    setModalAbierto(true)
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
    setModalAbierto(true)
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

    setModalAbierto(false)
  }

  const handleScanSuccess = (codigo) => {
    setFormId(codigo)
    setScannerAbierto(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#090b11] pb-20 md:pb-6">
      {/* Cabecera / Buscador */}
      <section className="flex flex-col gap-3 shrink-0">
        <div className="flex gap-3">
          <div className="relative flex-grow">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre o código de barra..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full bg-[#10141f] border border-slate-800/80 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-medium text-slate-200"
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
        <div className="flex gap-2 items-center overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setFiltroStockMinimo(!filtroStockMinimo)}
            className={`px-3.5 py-2.5 rounded-xl font-bold border shrink-0 transition-colors btn-interactive ${
              filtroStockMinimo
                ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                : 'bg-[#10141f] border-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚠️ Stock Crítico
          </button>

          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="bg-[#10141f] border border-slate-850 rounded-xl px-3 py-2.5 text-slate-400 font-semibold outline-none focus:border-indigo-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Lista de productos (Grid de 1 col en mobile, 2 en tablet, 3 en desktop) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productosFiltrados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
            <span className="text-4xl">📦</span>
            <p className="font-semibold mt-2">No se encontraron productos.</p>
          </div>
        ) : (
          productosFiltrados.map((p) => {
            const stockBajo = p.stock <= p.stockMinimo
            return (
              <div
                key={p.id}
                className="bg-[#10141f] border border-slate-800/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-slate-700/80 transition-colors"
              >
                <div className="space-y-1.5 pr-3 min-w-0 flex-1 cursor-pointer" onClick={() => abrirFormularioEditar(p)}>
                  <p className="font-bold text-slate-200 leading-tight truncate">{p.nombre}</p>
                  <div className="flex items-center gap-2 text-xxs">
                    <span className="text-slate-500 font-mono truncate max-w-[120px]">
                      {p.id}
                    </span>
                    <span className="bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                      {p.categoria || 'General'}
                    </span>
                  </div>
                  <div className="flex gap-3.5 text-xxs pt-1">
                    <span className="text-slate-500">
                      Compra: <b>${p.precioCompra}</b>
                    </span>
                    <span className="text-indigo-400 font-extrabold">
                      Venta: <b>${p.precioVenta}</b>
                    </span>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center gap-2 shrink-0 bg-[#090b11]/80 rounded-2xl p-1.5 border border-slate-800/40">
                  <button
                    onClick={() => actualizarStock(p.id, -1)}
                    className="w-8 h-8 rounded-xl border border-slate-800 bg-[#10141f] hover:bg-slate-800 font-black active:scale-90 flex items-center justify-center text-slate-300 transition-all btn-interactive"
                  >
                    -
                  </button>

                  <div className="text-center min-w-[36px] px-1">
                    <span
                      className={`text-sm font-black block leading-none ${
                        stockBajo ? 'text-amber-400 animate-pulse' : 'text-slate-200'
                      }`}
                    >
                      {p.stock}
                    </span>
                    <span className="text-[8px] text-slate-500 block uppercase font-black tracking-widest mt-1">
                      Cant
                    </span>
                  </div>

                  <button
                    onClick={() => actualizarStock(p.id, 1)}
                    className="w-8 h-8 rounded-xl border border-slate-800 bg-[#10141f] hover:bg-slate-800 font-black active:scale-90 flex items-center justify-center text-slate-300 transition-all btn-interactive"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>

      {/* Modal Agregar / Editar */}
      {modalAbierto && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setModalAbierto(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#10141f] border border-slate-800 rounded-t-3xl z-50 px-5 pb-8 pt-5 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />
            <h3 className="text-center text-base font-black text-slate-300 uppercase tracking-widest mb-5">
              {editando ? 'Editar Producto' : 'Cargar Producto'}
            </h3>

            <form onSubmit={guardarProducto} className="space-y-4 text-slate-300">
              {/* ID / Barcode */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                  Código de Barra *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código de barra o ID"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={editando}
                    className="flex-grow bg-[#090b11] disabled:bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none font-mono text-slate-200"
                    required
                  />
                  {!editando && (
                    <button
                      type="button"
                      onClick={() => setScannerAbierto(true)}
                      className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold px-3.5 rounded-xl text-lg flex items-center justify-center active:bg-indigo-600/30 btn-interactive"
                    >
                      📷
                    </button>
                  )}
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Coca-Cola 500ml"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none text-slate-200 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                    Precio Compra ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Compra"
                    value={formPrecioCompra}
                    onChange={(e) => setFormPrecioCompra(e.target.value)}
                    className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none text-slate-250 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                    Precio Venta ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="Venta"
                    value={formPrecioVenta}
                    onChange={(e) => setFormPrecioVenta(e.target.value)}
                    className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none font-bold text-emerald-400 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Stocks */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                    Stock Actual *
                  </label>
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none text-slate-250 focus:border-indigo-500 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    placeholder="Alerta de falta"
                    value={formStockMinimo}
                    onChange={(e) => setFormStockMinimo(e.target.value)}
                    className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none text-slate-250 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <label className="text-xxs font-black text-slate-500 uppercase tracking-wider block pl-0.5">
                  Categoría
                </label>
                <input
                  type="text"
                  placeholder="Ej. Bebidas, Golosinas, Almacén"
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  className="w-full bg-[#090b11] border border-slate-800 rounded-xl py-2.5 px-3 text-xs outline-none text-slate-200 focus:border-indigo-500"
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
                          setModalAbierto(false)
                        },
                        alCancelar: () => {}
                      })
                    }}
                    className="py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-2xl text-center border border-rose-500/20 btn-interactive"
                  >
                    Eliminar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="py-3.5 bg-slate-800 active:bg-slate-750 text-slate-300 font-bold rounded-2xl text-center btn-interactive"
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

      {/* Escáner de Cámara */}
      <ScannerModal
        isOpen={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
