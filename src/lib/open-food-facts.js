// Maps OpenFoodFacts categories_tags keywords → kiosk categories
const OFF_CATEGORY_MAP = [
  { keys: ['beverages', 'drinks', 'sodas', 'juices', 'waters', 'energy-drinks', 'aguas', 'bebidas', 'gaseosas', 'jugos'], cat: 'Bebidas' },
  { keys: ['candies', 'sweets', 'chocolates', 'gummies', 'lollipops', 'caramelos', 'golosinas', 'chicles', 'chewing-gums'], cat: 'Golosinas' },
  { keys: ['snacks', 'chips', 'crackers', 'popcorn', 'nuts', 'papas-fritas', 'maní'], cat: 'Snacks' },
  { keys: ['tobacco', 'cigarettes', 'cigars', 'tabaco', 'cigarrillos'], cat: 'Tabaquería' },
  { keys: ['ice-creams', 'frozen-desserts', 'helados', 'gelatos'], cat: 'Helados' },
  { keys: ['biscuits', 'cookies', 'wafers', 'galletitas', 'bizcochos'], cat: 'Galletitas' },
  { keys: ['breads', 'baked-goods', 'pastries', 'panes', 'facturas', 'medialunas'], cat: 'Panificados' },
  { keys: ['cheeses', 'dairy', 'yogurts', 'milks', 'cold-cuts', 'deli', 'lacteos', 'quesos', 'fiambres', 'yogures'], cat: 'Fiambrería y Lácteos' },
  { keys: ['cleaning', 'hygiene', 'personal-care', 'cosmetics', 'detergents', 'limpieza', 'perfumeria', 'higiene'], cat: 'Limpieza y Perfumería' },
  { keys: ['stationery', 'toys', 'school-supplies', 'librería', 'juguetes'], cat: 'Librería/Juguetes' },
  { keys: ['tableware', 'kitchenware', 'bazar'], cat: 'Bazar' },
  { keys: ['canned', 'condiments', 'sauces', 'pastas', 'cereals', 'coffee', 'teas', 'almacen', 'conservas', 'condimentos'], cat: 'Almacén' },
]

export function mapOffCategory(categoriesTags = []) {
  const joined = categoriesTags.join(' ').toLowerCase()
  for (const { keys, cat } of OFF_CATEGORY_MAP) {
    if (keys.some((k) => joined.includes(k))) return cat
  }
  return 'Varios'
}

export async function fetchOpenFoodFacts(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product

    const brand = p.brands?.split(',')[0]?.trim() ?? ''

    let name =
      p.product_name_es?.trim() ||
      p.product_name?.trim() ||
      p.abbreviated_product_name?.trim() ||
      ''

    if (!name) {
      const keyword = (p._keywords ?? [])
        .filter((k) => k.length > 2)
        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(' ')
      name = brand ? `${brand}${keyword ? ` ${keyword}` : ''}` : keyword
    }

    const quantity = p.quantity?.trim() ?? ''
    const image =
      p.selected_images?.front?.display?.es ||
      p.image_front_url ||
      ''
    const category = mapOffCategory(p.categories_tags)

    if (!name && category === 'Varios' && !brand) return null

    return { name, category, brand, quantity, image }
  } catch {
    return null
  }
}
