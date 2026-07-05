import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_PRODUCTOS = [
  { id: '7790070411300', nombre: 'Coca-Cola 500ml', precioCompra: 800, precioVenta: 1200, stock: 20, stockMinimo: 5, categoria: 'Bebidas' },
  { id: '7790580510000', nombre: 'Alfajor Jorgito Chocolate', precioCompra: 500, precioVenta: 800, stock: 15, stockMinimo: 3, categoria: 'Golosinas' },
  { id: '7791234567890', nombre: 'Papas Fritas Lay\'s Clasicas', precioCompra: 900, precioVenta: 1400, stock: 10, stockMinimo: 2, categoria: 'Snacks' },
  { id: '1', nombre: 'Caramelos Surtidos (x10)', precioCompra: 200, precioVenta: 500, stock: 100, stockMinimo: 20, categoria: 'Golosinas' },
  { id: '2', nombre: 'Cigarrillos Philip Morris Box', precioCompra: 2000, precioVenta: 2500, stock: 8, stockMinimo: 2, categoria: 'Tabaquería' }
]

const useKioskoStore = create(
  persist(
    (set, get) => ({
      // State
      productos: DEFAULT_PRODUCTOS,
      carrito: [],
      cajaActiva: null, // { id, fechaApertura, montoApertura, movimientos: [] }
      historialCajas: [], // Historial de cajas cerradas
      clientes: [], // { id, nombre, telefono, deuda, historial: [] }
      proveedores: [], // { id, nombre, deuda, historialPagos: [] }
      notificacion: null, // { tipo, titulo, mensaje, alAceptar, alCancelar }

      mostrarNotificacion: (config) => set({ notificacion: config }),
      cerrarNotificacion: () => set({ notificacion: null }),

      // --- PRODUCTOS & STOCK ACTIONS ---
      agregarOEditarProducto: (producto) =>
        set((state) => {
          const existe = state.productos.find((p) => p.id === producto.id)
          if (existe) {
            return {
              productos: state.productos.map((p) =>
                p.id === producto.id ? { ...p, ...producto } : p
              ),
            }
          }
          return {
            productos: [...state.productos, { ...producto, stock: Number(producto.stock) || 0 }],
          }
        }),

      eliminarProducto: (id) =>
        set((state) => ({
          productos: state.productos.filter((p) => p.id !== id),
        })),

      actualizarStock: (id, cantidad) =>
        set((state) => ({
          productos: state.productos.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock + cantidad) } : p
          ),
        })),

      // --- CARRITO ACTIONS ---
      agregarAlCarrito: (productoId, cantidad = 1) => {
        const state = get()
        const producto = state.productos.find((p) => p.id === productoId)
        if (!producto) return

        // Validar stock disponible
        const itemEnCarrito = state.carrito.find((item) => item.id === productoId)
        const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0
        if (producto.stock < cantidadActual + cantidad) {
          state.mostrarNotificacion({
            tipo: 'warning',
            titulo: 'Stock Insuficiente',
            mensaje: `Stock insuficiente para ${producto.nombre}.\nDisponible: ${producto.stock} unidades.`
          })
          return
        }

        set((state) => {
          if (itemEnCarrito) {
            return {
              carrito: state.carrito.map((item) =>
                item.id === productoId
                  ? { ...item, cantidad: item.cantidad + cantidad }
                  : item
              ),
            }
          }

          return {
            carrito: [
              ...state.carrito,
              { id: producto.id, nombre: producto.nombre, precio: producto.precioVenta, cantidad },
            ],
          }
        })
      },

      agregarMontoRapido: (monto) => {
        if (monto <= 0) return
        const id = `rapido-${Date.now()}`
        set((state) => ({
          carrito: [
            ...state.carrito,
            { id, nombre: 'Monto rápido', precio: monto, cantidad: 1, esMontoRapido: true },
          ],
        }))
      },

      actualizarCantidadCarrito: (id, cantidad) => {
        const state = get()
        if (cantidad <= 0) {
          set((state) => ({ carrito: state.carrito.filter((item) => item.id !== id) }))
          return
        }
        // Si es un producto real, validar contra stock
        const item = state.carrito.find((i) => i.id === id)
        if (item && !item.esMontoRapido) {
          const producto = state.productos.find((p) => p.id === id)
          if (producto && producto.stock < cantidad) {
            state.mostrarNotificacion({
              tipo: 'warning',
              titulo: 'Stock Insuficiente',
              mensaje: `Stock insuficiente para ${producto.nombre}.\nDisponible: ${producto.stock} unidades.`
            })
            return
          }
        }
        set((state) => ({
          carrito: state.carrito.map((item) =>
            item.id === id ? { ...item, cantidad } : item
          ),
        }))
      },

      eliminarDelCarrito: (id) =>
        set((state) => ({
          carrito: state.carrito.filter((item) => item.id !== id),
        })),

      vaciarCarrito: () => set({ carrito: [] }),

      // --- CAJA ACTIONS (APERTURA, CIERRE, MOVIMIENTOS) ---
      abrirCaja: (montoInicial) =>
        set(() => {
          if (montoInicial < 0) return {}
          return {
            cajaActiva: {
              id: `caja-${Date.now()}`,
              fechaApertura: new Date().toISOString(),
              montoApertura: Number(montoInicial),
              movimientos: [],
              totalVueltos: 0,
            },
          }
        }),

      registrarMovimientoCaja: (tipo, monto, motivo) => {
        const state = get()
        if (!state.cajaActiva) {
          state.mostrarNotificacion({
            tipo: 'error',
            titulo: 'Caja Cerrada',
            mensaje: 'No se pueden registrar movimientos porque la caja está cerrada.'
          })
          return
        }
        set((state) => {
          const nuevoMovimiento = {
            id: `mov-${Date.now()}`,
            tipo, // 'ingreso', 'egreso', 'venta'
            monto: Number(monto),
            motivo,
            timestamp: new Date().toISOString(),
          }
          return {
            cajaActiva: {
              ...state.cajaActiva,
              movimientos: [...state.cajaActiva.movimientos, nuevoMovimiento],
            },
          }
        })
      },

      cerrarCaja: (montoFisico) =>
        set((state) => {
          if (!state.cajaActiva) return {}
          
          const totalVendido = state.cajaActiva.movimientos
            .filter((m) => m.tipo === 'venta')
            .reduce((acc, m) => acc + m.monto, 0)
          
          const totalIngresos = state.cajaActiva.movimientos
            .filter((m) => m.tipo === 'ingreso')
            .reduce((acc, m) => acc + m.monto, 0)

          const totalEgresos = state.cajaActiva.movimientos
            .filter((m) => m.tipo === 'egreso')
            .reduce((acc, m) => acc + m.monto, 0)

          const saldoTeorico = state.cajaActiva.montoApertura + totalVendido + totalIngresos - totalEgresos
          const diferencia = Number(montoFisico) - saldoTeorico

          const cajaCerrada = {
            ...state.cajaActiva,
            fechaCierre: new Date().toISOString(),
            montoCierreFisico: Number(montoFisico),
            saldoTeorico,
            diferencia,
          }

          return {
            cajaActiva: null,
            historialCajas: [cajaCerrada, ...state.historialCajas],
          }
        }),

      // --- TRANSACTION / CHECKOUT ---
      procesarCobro: (metodoPago, clienteId = null, montoPagaCon = 0) => {
        const state = get()
        if (!state.cajaActiva) {
          state.mostrarNotificacion({
            tipo: 'error',
            titulo: 'Caja Cerrada',
            mensaje: 'Primero debés abrir la caja para poder cobrar.'
          })
          return false
        }

        const totalVenta = state.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)
        if (totalVenta <= 0) return false

        // 1. Reducir stock de productos reales
        set((state) => ({
          productos: state.productos.map((p) => {
            const item = state.carrito.find((c) => c.id === p.id)
            if (item) {
              return { ...p, stock: Math.max(0, p.stock - item.cantidad) }
            }
            return p
          }),
        }))

        // Calcular vuelto si aplica
        let vuelto = 0
        if (metodoPago === 'Efectivo' && Number(montoPagaCon) > totalVenta) {
          vuelto = Number(montoPagaCon) - totalVenta
        }

        // 2. Registrar el movimiento en la caja activa (solo si se pagó en Efectivo o QR, no si es Fiado)
        if (metodoPago !== 'Fiado') {
          const motivo = vuelto > 0 
            ? `Venta — ${metodoPago} (Paga: $${montoPagaCon}, Vuelto: $${vuelto})`
            : `Venta — ${metodoPago}`
          state.registrarMovimientoCaja('venta', totalVenta, motivo)
          
          if (vuelto > 0) {
            set((state) => ({
              cajaActiva: {
                ...state.cajaActiva,
                totalVueltos: (state.cajaActiva.totalVueltos || 0) + vuelto
              }
            }))
          }
        } else if (clienteId) {
          // 3. Si es Fiado, registrar la deuda en el cliente
          set((state) => ({
            clientes: state.clientes.map((c) => {
              if (c.id === clienteId) {
                const nuevoMovimiento = {
                  id: `deuda-${Date.now()}`,
                  tipo: 'deuda',
                  monto: totalVenta,
                  detalle: state.carrito.map((item) => `${item.nombre} x${item.cantidad}`).join(', '),
                  timestamp: new Date().toISOString(),
                }
                return {
                  ...c,
                  deuda: c.deuda + totalVenta,
                  historial: [nuevoMovimiento, ...c.historial],
                }
              }
              return c
            }),
          }))
        }

        // 4. Vaciar Carrito
        state.vaciarCarrito()
        return true
      },

      // --- CLIENTES ACTIONS (FIAR) ---
      agregarCliente: (nombre, telefono = '') => {
        const id = `cli-${Date.now()}`
        set((state) => ({
          clientes: [
            ...state.clientes,
            { id, nombre, telefono, deuda: 0, historial: [] },
          ],
        }))
        return id
      },

      registrarPagoCliente: (clienteId, monto) =>
        set((state) => {
          const numMonto = Number(monto)
          if (numMonto <= 0) return {}

          // Si es pago en efectivo, ingresa a la caja activa
          if (state.cajaActiva) {
            state.registrarMovimientoCaja('ingreso', numMonto, `Cobro Deuda Cliente — ID: ${clienteId}`)
          }

          return {
            clientes: state.clientes.map((c) => {
              if (c.id === clienteId) {
                const nuevoMovimiento = {
                  id: `pago-${Date.now()}`,
                  tipo: 'pago',
                  monto: numMonto,
                  detalle: 'Pago de deuda',
                  timestamp: new Date().toISOString(),
                }
                return {
                  ...c,
                  deuda: Math.max(0, c.deuda - numMonto),
                  historial: [nuevoMovimiento, ...c.historial],
                }
              }
              return c
            }),
          }
        }),

      // --- PROVEEDORES ACTIONS ---
      agregarProveedor: (nombre) =>
        set((state) => ({
          proveedores: [
            ...state.proveedores,
            { id: `prov-${Date.now()}`, nombre, deuda: 0, historialPagos: [] },
          ],
        })),

      registrarRecepcionMercaderia: (proveedorId, montoDeuda, detalle = '', pagadoEnMomento = false) => {
        const state = get()
        const proveedor = state.proveedores.find((p) => p.id === proveedorId)
        if (!proveedor) return false

        const numMonto = Number(montoDeuda)
        if (numMonto <= 0) return false

        if (pagadoEnMomento) {
          if (!state.cajaActiva) {
            alert('⚠️ No se puede pagar en el momento porque la caja está cerrada.')
            return false
          }

          // Registrar egreso en caja
          state.registrarMovimientoCaja('egreso', numMonto, `Pago Proveedor: ${proveedor.nombre}`)

          // Registrar en historial sin alterar deuda
          set((state) => ({
            proveedores: state.proveedores.map((p) => {
              if (p.id === proveedorId) {
                const nowIso = new Date().toISOString()
                const movRecepcion = {
                  id: `mercaderia-${Date.now()}`,
                  tipo: 'recepcion',
                  monto: numMonto,
                  detalle: `${detalle} (Pagado al contado de caja)`,
                  timestamp: nowIso,
                }
                const movPago = {
                  id: `pago-${Date.now() + 1}`,
                  tipo: 'pago',
                  monto: numMonto,
                  detalle: 'Pago al contado (Caja chica)',
                  timestamp: nowIso,
                }
                return {
                  ...p,
                  historialPagos: [movPago, movRecepcion, ...p.historialPagos],
                }
              }
              return p
            }),
          }))
        } else {
          // Registrar como deuda
          set((state) => ({
            proveedores: state.proveedores.map((p) => {
              if (p.id === proveedorId) {
                const nuevoMovimiento = {
                  id: `mercaderia-${Date.now()}`,
                  tipo: 'recepcion',
                  monto: numMonto,
                  detalle,
                  timestamp: new Date().toISOString(),
                }
                return {
                  ...p,
                  deuda: p.deuda + numMonto,
                  historialPagos: [nuevoMovimiento, ...p.historialPagos],
                }
              }
              return p
            }),
          }))
        }
        return true
      },

      registrarPagoProveedor: (proveedorId, montoPago, deCajaChica = false) =>
        set((state) => {
          const numMonto = Number(montoPago)
          if (numMonto <= 0) return {}

          // Si el pago sale de la caja chica del kiosko, registrar el egreso
          if (deCajaChica && state.cajaActiva) {
            state.registrarMovimientoCaja(
              'egreso',
              numMonto,
              `Pago Proveedor — ID: ${proveedorId}`
            )
          }

          return {
            proveedores: state.proveedores.map((p) => {
              if (p.id === proveedorId) {
                const nuevoMovimiento = {
                  id: `pago-${Date.now()}`,
                  tipo: 'pago',
                  monto: numMonto,
                  detalle: `Pago realizado ${deCajaChica ? '(De caja chica)' : ''}`,
                  timestamp: new Date().toISOString(),
                }
                return {
                  ...p,
                  deuda: Math.max(0, p.deuda - numMonto),
                  historialPagos: [nuevoMovimiento, ...p.historialPagos],
                }
              }
              return p
            }),
          }
        }),

      eliminarProveedor: (id) =>
        set((state) => ({
          proveedores: state.proveedores.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'kiosko-pos-storage', // Nombre en localStorage
    }
  )
)

export default useKioskoStore
