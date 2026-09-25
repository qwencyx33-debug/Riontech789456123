import { createClient } from '@supabase/supabase-js'

// --- TAMA NA PAG-ASSIGN NG ENVIRONMENT VARIABLES ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL=https://shaqyighcpkzelxgkouv.supabase.co
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY=sb_publishable_vEJhXuVbk32TyT6B60PhUA_3sgU3hfOvh42n3_s

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase URL or Anon Key is missing. Check your .env file!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching profile:', error.message)
    return null
  }
}