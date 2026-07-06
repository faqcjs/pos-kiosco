const DEFAULT_PRODUCTOS = [
  { id: '7790070411300', nombre: 'Coca-Cola 500ml', precioCompra: 800, precioVenta: 1200, stock: 20, stockMinimo: 5, categoria: 'Bebidas' },
  { id: '7790580510000', nombre: 'Alfajor Jorgito Chocolate', precioCompra: 500, precioVenta: 800, stock: 15, stockMinimo: 3, categoria: 'Golosinas' },
  { id: '7791234567890', nombre: 'Papas Fritas Lay\'s Clasicas', precioCompra: 900, precioVenta: 1400, stock: 1, stockMinimo: 2, categoria: 'Snacks' },
  { id: '1', nombre: 'Caramelos Surtidos (x10)', precioCompra: 200, precioVenta: 500, stock: 100, stockMinimo: 20, categoria: 'Golosinas' },
  { id: '2', nombre: 'Cigarrillos Philip Morris Box', precioCompra: 2000, precioVenta: 2500, stock: 0, stockMinimo: 2, categoria: 'Tabaquería' },
  
  // 40 Productos Nuevos
  { id: '7790890000010', nombre: 'Agua Villavicencio 500ml', precioCompra: 500, precioVenta: 800, stock: 2, stockMinimo: 6, categoria: 'Bebidas' },
  { id: '7790890000027', nombre: 'Gatorade Manzana 500ml', precioCompra: 1000, precioVenta: 1600, stock: 12, stockMinimo: 3, categoria: 'Bebidas' },
  { id: '7790890000034', nombre: 'Sprite 500ml', precioCompra: 800, precioVenta: 1200, stock: 18, stockMinimo: 4, categoria: 'Bebidas' },
  { id: '7790890000041', nombre: 'Coca-Cola Zero 500ml', precioCompra: 800, precioVenta: 1200, stock: 20, stockMinimo: 5, categoria: 'Bebidas' },
  { id: '7790890000058', nombre: 'Energizante Red Bull 250ml', precioCompra: 1200, precioVenta: 2000, stock: 15, stockMinimo: 4, categoria: 'Bebidas' },
  { id: '7790890000065', nombre: 'Baggio Durazno 1L', precioCompra: 900, precioVenta: 1500, stock: 10, stockMinimo: 3, categoria: 'Bebidas' },
  { id: '7790890000072', nombre: 'Cerveza Quilmes Lata 473ml', precioCompra: 1000, precioVenta: 1700, stock: 0, stockMinimo: 6, categoria: 'Bebidas' },
  { id: '7790890000089', nombre: 'Chicle Beldent Menta', precioCompra: 300, precioVenta: 500, stock: 50, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000096', nombre: 'Chicle Beldent Menta Negra', precioCompra: 300, precioVenta: 500, stock: 45, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000102', nombre: 'Alfajor Guaymallen Choco', precioCompra: 250, precioVenta: 400, stock: 40, stockMinimo: 8, categoria: 'Golosinas' },
  { id: '7790890000119', nombre: 'Alfajor Guaymallen DDL', precioCompra: 250, precioVenta: 400, stock: 40, stockMinimo: 8, categoria: 'Golosinas' },
  { id: '7790890000126', nombre: 'Chocolate Shot 35g', precioCompra: 600, precioVenta: 1000, stock: 20, stockMinimo: 5, categoria: 'Golosinas' },
  { id: '7790890000133', nombre: 'Chocolate Block Cofler 38g', precioCompra: 700, precioVenta: 1200, stock: 1, stockMinimo: 4, categoria: 'Golosinas' },
  { id: '7790890000140', nombre: 'Gomitas Mogul Eucalipto', precioCompra: 400, precioVenta: 700, stock: 0, stockMinimo: 5, categoria: 'Golosinas' },
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
  { id: '7790890000362', nombre: 'Cuaderno Universitario', precioCompra: 1600, precioVenta: 2800, stock: 2, stockMinimo: 2, categoria: 'Varios' },
  { id: '7790890000379', nombre: 'Turrón de Maní Arcor', precioCompra: 150, precioVenta: 300, stock: 60, stockMinimo: 10, categoria: 'Golosinas' },
  { id: '7790890000386', nombre: 'Chocolate Tofi Leche', precioCompra: 400, precioVenta: 700, stock: 18, stockMinimo: 4, categoria: 'Golosinas' },
  { id: '7790890000393', nombre: 'Helado Torpedo Frutilla', precioCompra: 700, precioVenta: 1200, stock: 0, stockMinimo: 3, categoria: 'Helados' },
  { id: '7790890000409', nombre: 'Helado Sin Parar DDL', precioCompra: 1200, precioVenta: 2200, stock: 8, stockMinimo: 2, categoria: 'Helados' }
]

export const createProductSlice = (set, get) => ({
  productos: DEFAULT_PRODUCTOS,

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
})
