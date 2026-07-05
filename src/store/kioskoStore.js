import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_PRODUCTOS = [
  { id: '7790070411300', nombre: 'Coca-Cola 500ml', precioCompra: 800, precioVenta: 1200, stock: 20, stockMinimo: 5, categoria: 'Bebidas' },
  { id: '7790580510000', nombre: 'Alfajor Jorgito Chocolate', precioCompra: 500, precioVenta: 800, stock: 15, stockMinimo: 3, categoria: 'Golosinas' },
  { id: '7791234567890', nombre: 'Papas Fritas Lay\'s Clasicas', precioCompra: 900, precioVenta: 1400, stock: 10, stockMinimo: 2, categoria: 'Snacks' },
  { id: '1', nombre: 'Caramelos Surtidos (x10)', precioCompra: 200, precioVenta: 500, stock: 100, stockMinimo: 20, categoria: 'Golosinas' },
  { id: '2', nombre: 'Cigarrillos Philip Morris Box', precioCompra: 2000, precioVenta: 2500, stock: 8, stockMinimo: 2, categoria: 'Tabaquería' },
  
  // 40 Productos Nuevos
  { id: '7790890000010', nombre: 'Agua Villavicencio 500ml', precioCompra: 500, precioVenta: 800, stock: 25, stockMinimo: 6, categoria: 'Bebidas' },
  { id: '7790890000027', nombre: 'Gatorade Manzana 500ml', precioCompra: 1000, precioVenta: 1600, stock: 12, stockMinimo: 3, categoria: 'Bebidas' },
  { id: '7790890000034', nombre: 'Sprite 500ml', precioCompra: 800, precioVenta: 1200, stock: 18, stockMinimo: 4, categoria: 'Bebidas' },
  { id: '7790890000041', nombre: 'Coca-Cola Zero 500ml', precioCompra: 800, precioVenta: 1200, stock: 20, stockMinimo: 5, categoria: 'Bebidas' },
  { id: '7790890000058', nombre: 'Energizante Red Bull 250ml', precioCompra: 1200, precioVenta: 2000, stock: 15, stockMinimo: 4, categoria: 'Bebidas' },
  { id: '7790890000065', nombre: 'Baggio Durazno 1L', precioCompra: 900, precioVenta: 1500, stock: 10, stockMinimo: 3, categoria: 'Bebidas' },
  { id: '7790890000072', nombre: 'Cerveza Quilmes Lata 473ml', precioCompra: 1000, precioVenta: 1700, stock: 24, stockMinimo: 6, categoria: 'Bebidas' },
  { id: '7790890000089', nombre: 'Chicle Beldent Menta', precioCompra: 300, precioVenta: 500, stock: 50, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000096', nombre: 'Chicle Beldent Menta Negra', precioCompra: 300, precioVenta: 500, stock: 45, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000102', nombre: 'Alfajor Guaymallen Choco', precioCompra: 250, precioVenta: 400, stock: 40, stockMinimo: 8, categoria: 'Golosinas' },
  { id: '7790890000119', nombre: 'Alfajor Guaymallen DDL', precioCompra: 250, precioVenta: 400, stock: 40, stockMinimo: 8, categoria: 'Golosinas' },
  { id: '7790890000126', nombre: 'Chocolate Shot 35g', precioCompra: 600, precioVenta: 1000, stock: 20, stockMinimo: 5, categoria: 'Golosinas' },
  { id: '7790890000133', nombre: 'Chocolate Block Cofler 38g', precioCompra: 700, precioVenta: 1200, stock: 15, stockMinimo: 4, categoria: 'Golosinas' },
  { id: '7790890000140', nombre: 'Gomitas Mogul Eucalipto', precioCompra: 400, precioVenta: 700, stock: 20, stockMinimo: 5, categoria: 'Golosinas' },
  { id: '7790890000157', nombre: 'Gomitas Mogul Frutilla', precioCompra: 400, precioVenta: 700, stock: 22, stockMinimo: 5, categoria: 'Golosinas' },
  { id: '7790890000164', nombre: 'Chupetín Pico Dulce', precioCompra: 100, precioVenta: 200, stock: 80, stockMinimo: 15, categoria: 'Golosinas' },
  { id: '7790890000171', nombre: 'Flynn Paff Caja (x10)', precioCompra: 300, precioVenta: 600, stock: 35, stockMinimo: 5, categoria: 'Golosinas' },
  { id: '7790890000188', nombre: 'Pringles Original Corta', precioCompra: 1800, precioVenta: 2800, stock: 12, stockMinimo: 3, categoria: 'Snacks' },
  { id: '7790890000195', nombre: 'Papas Lay\'s Jamón Serrano', precioCompra: 900, precioVenta: 1400, stock: 8, stockMinimo: 2, categoria: 'Snacks' },
  { id: '7790890000201', nombre: 'Doritos Queso Mega 90g', precioCompra: 1200, precioVenta: 1900, stock: 10, stockMinimo: 3, categoria: 'Snacks' },
  { id: '7790890000218', nombre: 'Cheetos Queso 90g', precioCompra: 1000, precioVenta: 1600, stock: 10, stockMinimo: 3, categoria: 'Snacks' },
  { id: '7790890000225', nombre: 'Maní Salado Pehuamar 100g', precioCompra: 600, precioVenta: 1050, stock: 15, stockMinimo: 3, categoria: 'Snacks' },
  { id: '7790890000232', nombre: 'Galletitas Sonrisas 150g', precioCompra: 550, precioVenta: 900, stock: 18, stockMinimo: 4, categoria: 'Snacks' },
  { id: '7790890000249', nombre: 'Galletitas Oreo 118g', precioCompra: 650, precioVenta: 1100, stock: 20, stockMinimo: 5, categoria: 'Snacks' },
  { id: '7790890000256', nombre: 'Cigarrillos Marlboro Box', precioCompra: 2200, precioVenta: 2800, stock: 10, stockMinimo: 2, categoria: 'Tabaquería' },
  { id: '7790890000263', nombre: 'Cigarrillos Marlboro Común', precioCompra: 2000, precioVenta: 2600, stock: 10, stockMinimo: 2, categoria: 'Tabaquería' },
  { id: '7790890000270', nombre: 'Cigarrillos Lucky Strike Box', precioCompra: 2100, precioVenta: 2700, stock: 8, stockMinimo: 2, categoria: 'Tabaquería' },
  { id: '7790890000287', nombre: 'Encendedor Bic Grande', precioCompra: 600, precioVenta: 1100, stock: 30, stockMinimo: 5, categoria: 'Tabaquería' },
  { id: '7790890000294', nombre: 'Fósforos Tres Patitos', precioCompra: 300, precioVenta: 600, stock: 25, stockMinimo: 4, categoria: 'Tabaquería' },
  { id: '7790890000300', nombre: 'Cargador Usb Genérico', precioCompra: 1500, precioVenta: 2800, stock: 5, stockMinimo: 2, categoria: 'Varios' },
  { id: '7790890000317', nombre: 'Cable Usb-C Reforzado', precioCompra: 1200, precioVenta: 2200, stock: 8, stockMinimo: 2, categoria: 'Varios' },
  { id: '7790890000324', nombre: 'Pilas Duracell AA (x2)', precioCompra: 1800, precioVenta: 3000, stock: 15, stockMinimo: 3, categoria: 'Varios' },
  { id: '7790890000331', nombre: 'Pilas Duracell AAA (x2)', precioCompra: 1800, precioVenta: 3000, stock: 12, stockMinimo: 3, categoria: 'Varios' },
  { id: '7790890000348', nombre: 'Lapicera Bic Azul', precioCompra: 200, precioVenta: 400, stock: 40, stockMinimo: 8, categoria: 'Varios' },
  { id: '7790890000355', nombre: 'Lapicera Bic Negra', precioCompra: 200, precioVenta: 400, stock: 35, stockMinimo: 8, categoria: 'Varios' },
  { id: '7790890000362', nombre: 'Cuaderno Universitario', precioCompra: 1600, precioVenta: 2800, stock: 10, stockMinimo: 2, categoria: 'Varios' },
  { id: '7790890000379', nombre: 'Turrón de Maní Arcor', precioCompra: 150, precioVenta: 300, stock: 60, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000386', nombre: 'Chocolate Tofi Leche', precioCompra: 400, precioVenta: 700, stock: 18, stockMinimo: 4, categoria: 'Golosinas' },
  { id: '7790890000393', nombre: 'Helado Torpedo Frutilla', precioCompra: 700, precioVenta: 1200, stock: 15, stockMinimo: 3, categoria: 'Helados' },
  { id: '7790890000409', nombre: 'Helado Sin Parar DDL', precioCompra: 1200, precioVenta: 2200, stock: 8, stockMinimo: 2, categoria: 'Helados' }
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
