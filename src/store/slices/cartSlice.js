export const createCartSlice = (set, get) => ({
  carrito: [],

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
})
