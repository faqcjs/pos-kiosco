import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno obligatorias de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

export const isMockMode = false

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
