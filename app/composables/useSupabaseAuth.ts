import type { SupabaseClient } from '@supabase/supabase-js'
import type { Ref } from 'vue'

export function useSupabaseAuth() {
  const nuxtApp = useNuxtApp()
  const supabase = (nuxtApp as unknown as { $supabase: { client: SupabaseClient } }).$supabase?.client
  const user = useState<{ email?: string } | null>('supabase_user') as Ref<{ email?: string } | null>

  if (!supabase || !user) {
    throw new Error('Supabase Auth module is not initialized.')
  }

  return { supabase, user }
}
