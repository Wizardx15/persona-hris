import { createClient } from '@supabase/supabase-js'

// Cek environment variables dengan lebih baik
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log untuk debugging (akan muncul di terminal/server)
console.log('Supabase URL:', supabaseUrl ? '✅ Ada' : '❌ Tidak ada')
console.log('Supabase Key:', supabaseAnonKey ? '✅ Ada' : '❌ Tidak ada')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables tidak lengkap!')
  console.error('URL:', supabaseUrl)
  console.error('Key:', supabaseAnonKey ? 'Ada tapi disembunyikan' : 'Tidak ada')
} else {
  console.log('✅ Environment variables lengkap')
}

// Buat client dengan konfigurasi tambahan
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
  }
)