import { useSupabaseAuth } from '../composables/useSupabaseAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return
  }

  const { supabase, user } = useSupabaseAuth()

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  // The database allowlist and RLS are the authorization boundary.
  // This request is only a UX guard; RLS still blocks unauthorized access.
  const { data, error } = await supabase.rpc('is_current_user_admin')

  if (error || data !== true) {
    await supabase.auth.signOut()
    return navigateTo({
      path: '/login',
      query: { error: 'not-authorized' },
    })
  }
})
