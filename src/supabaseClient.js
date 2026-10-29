const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
let supabasePromise;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('tu-proyecto') || supabaseAnonKey.includes('tu-clave')) {
    return Promise.reject(new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.'));
  }

  if (!supabasePromise) {
    supabasePromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(supabaseUrl, supabaseAnonKey));
  }
  return supabasePromise;
}
