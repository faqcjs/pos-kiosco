export const SEED_PRODUCTS = [
  { id: 'p1', barcode: '7790895000001', name: 'Coca-Cola 500ml', category: 'Bebidas', cost: 600, price: 1200, stock: 24, minStock: 6 },
  { id: 'p2', barcode: '7790895000002', name: 'Agua Mineral 500ml', category: 'Bebidas', cost: 300, price: 700, stock: 30, minStock: 8 },
  { id: 'p3', barcode: '7790895000003', name: 'Sprite 1.5L', category: 'Bebidas', cost: 900, price: 1800, stock: 4, minStock: 6 },
  { id: 'p4', barcode: '7790895000004', name: 'Cerveza Quilmes 1L', category: 'Bebidas', cost: 1100, price: 2200, stock: 12, minStock: 6 },
  { id: 'p5', barcode: '7790895000010', name: 'Alfajor Jorgito', category: 'Golosinas', cost: 350, price: 750, stock: 40, minStock: 10 },
  { id: 'p6', barcode: '7790895000011', name: 'Chupetín Pico Dulce', category: 'Golosinas', cost: 80, price: 200, stock: 100, minStock: 20 },
  { id: 'p7', barcode: '7790895000012', name: 'Chocolate Milka 55g', category: 'Golosinas', cost: 700, price: 1400, stock: 3, minStock: 5 },
  { id: 'p8', barcode: '7790895000013', name: 'Caramelos Sugus', category: 'Golosinas', cost: 120, price: 300, stock: 60, minStock: 15 },
  { id: 'p9', barcode: '7790895000020', name: 'Papas Lays 85g', category: 'Snacks', cost: 800, price: 1600, stock: 18, minStock: 6 },
  { id: 'p10', barcode: '7790895000021', name: 'Palitos Salados', category: 'Snacks', cost: 400, price: 900, stock: 22, minStock: 6 },
  { id: 'p11', barcode: '7790895000022', name: 'Maní Salado 100g', category: 'Snacks', cost: 350, price: 800, stock: 0, minStock: 5 },
  { id: 'p12', barcode: '7790895000030', name: 'Cigarrillos Marlboro', category: 'Tabaquería', cost: 1800, price: 2600, stock: 15, minStock: 5 },
  { id: 'p13', barcode: '7790895000031', name: 'Cigarrillos Philip Morris', category: 'Tabaquería', cost: 1700, price: 2400, stock: 8, minStock: 5 },
  { id: 'p14', barcode: '7790895000040', name: 'Helado Palito Frigor', category: 'Helados', cost: 500, price: 1100, stock: 20, minStock: 8 },
  { id: 'p15', barcode: '7790895000041', name: 'Bombón Escocés', category: 'Helados', cost: 700, price: 1500, stock: 5, minStock: 6 },
  { id: 'p16', barcode: '7790895000050', name: 'Pilas AA x2', category: 'Varios', cost: 900, price: 1900, stock: 10, minStock: 4 },
  { id: 'p17', barcode: '7790895000051', name: 'Encendedor', category: 'Varios', cost: 300, price: 700, stock: 25, minStock: 6 },
  { id: 'p18', barcode: '7790895000052', name: 'Chicles Beldent', category: 'Golosinas', cost: 250, price: 550, stock: 35, minStock: 10 },
]

export const SEED_CUSTOMERS = [
  {
    id: 'c1',
    name: 'Juan Pérez',
    phone: '11-2345-6789',
    entries: [
      { id: 'ce1', date: new Date(Date.now() - 86400000 * 3).toISOString(), type: 'compra', amount: 3200, detail: '2x Coca-Cola, 1x Papas Lays' },
      { id: 'ce2', date: new Date(Date.now() - 86400000 * 1).toISOString(), type: 'compra', amount: 1400, detail: '1x Chocolate Milka' },
    ],
  },
  {
    id: 'c2',
    name: 'María González',
    phone: '11-9876-5432',
    entries: [
      { id: 'ce3', date: new Date(Date.now() - 86400000 * 5).toISOString(), type: 'compra', amount: 5200, detail: 'Varios' },
      { id: 'ce4', date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'pago', amount: 2000, detail: 'Pago parcial' },
    ],
  },
]

export const SEED_SUPPLIERS = [
  {
    id: 's1',
    name: 'Distribuidora Central',
    entries: [
      { id: 'se1', date: new Date(Date.now() - 86400000 * 7).toISOString(), type: 'factura', amount: 45000, detail: 'Reposición bebidas', paidCash: false },
      { id: 'se2', date: new Date(Date.now() - 86400000 * 4).toISOString(), type: 'pago', amount: 20000, detail: 'Pago a cuenta' },
    ],
  },
  {
    id: 's2',
    name: 'Golosinas del Sur',
    entries: [
      { id: 'se3', date: new Date(Date.now() - 86400000 * 6).toISOString(), type: 'factura', amount: 28000, detail: 'Golosinas surtidas', paidCash: false },
    ],
  },
]

export function generateMockSales() {
  const sales = []
  const now = new Date()
  
  for (let i = 180; i >= 0; i--) {
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    
    // Determine number of sales for this day
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
    const numSales = isWeekend ? (Math.floor(Math.random() * 5) + 4) : (Math.floor(Math.random() * 4) + 2) // 4-8 on weekends, 2-5 on weekdays
    
    for (let s = 0; s < numSales; s++) {
      // Set random hour between 08:00 and 22:00
      const saleDate = new Date(currentDate)
      saleDate.setHours(
        Math.floor(Math.random() * 14) + 8, // 8 to 21
        Math.floor(Math.random() * 60), // 0 to 59
        Math.floor(Math.random() * 60)
      )
      
      // Don't generate future sales if we are on day 0 (today)
      if (saleDate.getTime() > now.getTime()) {
        continue
      }
      
      // Determine items
      const numItems = Math.floor(Math.random() * 3) + 1 // 1 to 3 items
      const items = []
      let total = 0
      let cost = 0
      
      // Randomly select products without duplicating within the same sale
      const selectedProducts = []
      while (selectedProducts.length < numItems) {
        const prod = SEED_PRODUCTS[Math.floor(Math.random() * SEED_PRODUCTS.length)]
        if (!selectedProducts.find(p => p.id === prod.id)) {
          selectedProducts.push(prod)
        }
      }
      
      for (const prod of selectedProducts) {
        const qty = Math.floor(Math.random() * 2) + 1 // 1 or 2 units
        items.push({
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          qty: qty
        })
        total += prod.price * qty
        cost += prod.cost * qty
      }
      
      // Determine payment method and optional customer
      const r = Math.random()
      let method = 'efectivo'
      let customerId = null
      if (r > 0.9) {
        method = 'fiado'
        customerId = Math.random() > 0.5 ? 'c1' : 'c2'
      } else if (r > 0.6) {
        method = 'qr'
      }
      
      sales.push({
        id: `s-${i}-${s}-${Math.random().toString(36).slice(2, 6)}`,
        date: saleDate.toISOString(),
        items,
        total,
        method,
        customerId,
        cost,
        cashReceived: method === 'efectivo' ? Math.ceil(total / 100) * 100 : null,
        change: method === 'efectivo' ? Math.ceil(total / 100) * 100 - total : null
      })
    }
  }
  
  // Sort sales from newest to oldest
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

