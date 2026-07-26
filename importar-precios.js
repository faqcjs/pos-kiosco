import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// 1. Leer credenciales desde .env.local
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
  
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
} catch (err) {
  console.error('❌ Error al leer .env.local:', err.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ No se encontraron las credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Ruta del archivo CSV
const csvPath = 'precios.csv';
if (!fs.existsSync(csvPath)) {
  console.error(`❌ Error: No se encontró el archivo "${csvPath}" en la raíz del proyecto.`);
  console.log('\n👉 Para usar este script:\n1. Exportá los productos desde Supabase como CSV.\n2. Completalo/editá los precios en Excel.\n3. Guardalo con el nombre "precios.csv" en la raíz del proyecto.\n4. Corré: node importar-precios.js\n');
  process.exit(1);
}

console.log(`📖 Leyendo "${csvPath}"...`);
const content = fs.readFileSync(csvPath, 'utf-8');

// Parsear líneas del CSV
const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
if (lines.length < 2) {
  console.error('❌ El archivo CSV está vacío o no contiene filas de datos.');
  process.exit(1);
}

// Helper para parsear una línea de CSV soportando comillas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/, ''));
}

// Parsear cabeceras
const headers = parseCSVLine(lines[0]);
const idIndex = headers.indexOf('id');
const costIndex = headers.indexOf('cost');
const priceIndex = headers.indexOf('price');
const nameIndex = headers.indexOf('name');

if (idIndex === -1 || costIndex === -1 || priceIndex === -1) {
  console.error('❌ El CSV debe contener al menos las columnas "id", "cost" y "price".');
  console.log('Columnas detectadas:', headers);
  process.exit(1);
}

async function run() {
  console.log('🔑 Iniciando sesión en Supabase...');
  let authError = null;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'todopasa@kiosko.com',
      password: '101219'
    });
    authError = error;
  } catch (e) {
    authError = e;
  }

  if (authError) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'desarrollo@kiosko.com',
        password: '17120340'
      });
      authError = error;
    } catch (e) {
      authError = e;
    }
  }

  if (authError) {
    console.error('❌ Error de autenticación (RLS):', authError.message || authError);
    console.log('Asegurate de tener el usuario TodoPasa o desarrollo creado en la base de datos.');
    process.exit(1);
  }
  console.log('✅ Sesión iniciada con éxito.');

  let updatedCount = 0;
  let errorCount = 0;

  console.log(`🚀 Procesando ${lines.length - 1} productos...`);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const id = values[idIndex];
    // Limpia y normaliza números (saca $, espacios, puntos de miles y maneja comas decimales)
    const cleanNumber = (val) => {
      if (!val) return '0';
      let clean = val.replace(/[\$\s]/g, '');
      if (clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(/,/g, '.');
      } else if (/\.\d{3}$/.test(clean)) {
        clean = clean.replace(/\./g, '');
      }
      return clean;
    };

    const cost = parseFloat(cleanNumber(values[costIndex]));
    const price = parseFloat(cleanNumber(values[priceIndex]));
    const name = nameIndex !== -1 ? values[nameIndex] : id;

    if (!id) {
      console.warn(`⚠️ Fila ${i + 1} ignorada: ID vacío.`);
      continue;
    }

    if (isNaN(cost) || isNaN(price)) {
      console.warn(`⚠️ Fila ${i + 1} ignorada [${name}]: Costo o precio no son válidos (cost: "${values[costIndex]}", price: "${values[priceIndex]}").`);
      continue;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ cost, price })
        .eq('id', id);

      if (error) {
        console.error(`❌ Error al actualizar "${name}" (ID ${id}):`, error.message);
        errorCount++;
      } else {
        updatedCount++;
        console.log(`✅ [${updatedCount}] Actualizado: ${name} -> Costo: $${cost} | Venta: $${price}`);
      }
    } catch (err) {
      console.error(`❌ Excepción al actualizar "${name}" (ID ${id}):`, err.message);
      errorCount++;
    }
  }

  console.log('\n🎉 --- Resumen de actualización ---');
  console.log(`🔹 Productos actualizados exitosamente: ${updatedCount}`);
  console.log(`🔹 Errores: ${errorCount}`);
  console.log('-----------------------------------\n');
}

run();
