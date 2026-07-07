import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://epthakzkhapxitbdussy.supabase.co'
const supabaseAnonKey = 'sb_publishable_wkBcEFhjIWjlSzQNCbhdmA_YKe_SHW7'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('Probando conexión a Supabase...')
  console.log('URL:', supabaseUrl)
  
  try {
    // 1. Probar SELECT
    const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(1)
    if (prodErr) {
      console.error('Error al hacer SELECT en products:', prodErr)
    } else {
      console.log('SELECT products OK, filas encontradas:', products.length)
    }

    // 2. Probar SELECT en shifts
    const { data: shifts, error: shiftErr } = await supabase.from('shifts').select('*').limit(1)
    if (shiftErr) {
      console.error('Error al hacer SELECT en shifts:', shiftErr)
    } else {
      console.log('SELECT shifts OK, filas encontradas:', shifts.length)
    }

    // 3. Probar INSERT de prueba en shifts
    const testShift = {
      id: 'test-' + Math.random().toString(36).substr(2, 9),
      openedAt: new Date().toISOString(),
      openingAmount: 1000,
      movements: [],
      status: 'closed',
      openedBy: 'Test Runner',
      closedAt: new Date().toISOString(),
      closedBy: 'Test Runner',
      closingCounted: 1000,
      closingTheoretical: 1000,
      difference: 0
    }
    
    console.log('Insertando turno de prueba:', testShift.id)
    const { data: inserted, error: insertErr } = await supabase.from('shifts').insert([testShift]).select()
    if (insertErr) {
      console.error('Error al insertar en shifts:', insertErr)
    } else {
      console.log('INSERT shifts OK:', inserted)
      // Limpiar el registro insertado
      const { error: delErr } = await supabase.from('shifts').delete().eq('id', testShift.id)
      if (delErr) {
        console.error('Error al limpiar turno de prueba:', delErr)
      } else {
        console.log('Limpieza OK')
      }
    }
  } catch (e) {
    console.error('Excepción durante la prueba:', e)
  }
}

run()
