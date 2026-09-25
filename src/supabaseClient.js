import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shaqyighcpkzelxgkouv.supabase.co';
const supabaseAnonKey = 'sb_publishable_vEJhXuVbk32TyT6B6OPhUA_3sgU3hf_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);