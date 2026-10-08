<script setup lang="ts">
import vendorContractLogo from '../../assets/images/vendor-contract-logo.svg'
import { useAppLocale } from '../../composables/useAppLocale'
import { useSupabaseAuth } from '../../composables/useSupabaseAuth'

const { locale, t } = useAppLocale()
const { supabase, user } = useSupabaseAuth()
const route = useRoute()
const isIndonesian = computed(() => locale.value === 'id')
const isSidebarOpen = ref(false)
const isSigningOut = ref(false)

const navigation = computed(() => [
  { label: t('dashboard'), to: '/', icon: 'dashboard' },
  { label: t('vendors'), to: '/vendors', icon: 'vendors' },
  { label: t('contracts'), to: '/contracts', icon: 'contracts' },
  { label: t('settings'), to: '/settings', icon: 'settings' },
])

const pageTitle = computed(() => {
  if (route.path === '/') return 'Dashboard'
  if (route.path.startsWith('/vendors')) return isIndonesian.value ? 'Manajemen Vendor' : 'Vendor Management'
  if (route.path.startsWith('/contracts')) return isIndonesian.value ? 'Manajemen Kontrak' : 'Contract Management'
  return isIndonesian.value ? 'Ringkasan' : 'Overview'
})

const pageDescription = computed(() => {
  if (route.path === '/') return isIndonesian.value ? 'Ringkasan vendor dan pemantauan kontrak.' : 'Vendor overview and contract monitoring.'
  if (route.path.startsWith('/vendors')) return isIndonesian.value ? 'Kelola data perusahaan penyedia barang dan jasa.' : 'Manage supplier and service-provider records.'
  if (route.path.startsWith('/contracts')) return isIndonesian.value ? 'Kelola dokumen kerja sama dan tanggal berlakunya.' : 'Manage agreements and their validity periods.'
  return ''
})

async function signOut() {
  isSigningOut.value = true
  await supabase.auth.signOut()
  await navigateTo('/login')
  isSigningOut.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <Transition name="sidebar-backdrop">
      <div v-if="isSidebarOpen" class="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" @click="isSidebarOpen = false" />
    </Transition>

    <aside
      class="admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-white transition-transform duration-300 ease-out lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="border-b border-white/10 px-6 py-6">
        <NuxtLink to="/" class="flex items-center gap-3" @click="isSidebarOpen = false">
          <span class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-white/15">
            <img :src="vendorContractLogo" alt="" class="size-full object-contain">
          </span>
          <span>
            <span class="block text-sm font-semibold">Vendor & Contract</span>
            <span class="mt-0.5 block text-xs text-slate-400">{{ isIndonesian ? 'Panel administrasi' : 'Administration panel' }}</span>
          </span>
        </NuxtLink>
      </div>

      <div class="px-4 pt-6">
        <p class="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{{ isIndonesian ? 'Menu utama' : 'Main menu' }}</p>
        <nav class="mt-3 space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to)) ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
            @click="isSidebarOpen = false"
          >
            <span class="grid size-6 shrink-0 place-items-center text-slate-300" aria-hidden="true">
              <svg v-if="item.icon === 'dashboard'" class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4" rx="1.5" /><rect x="13.5" y="10.5" width="7" height="10" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              </svg>
              <svg v-else-if="item.icon === 'vendors'" class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3.5" y="6" width="17" height="14.5" rx="2" /><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M3.5 11h17M9 10.5v2m6-2v2" />
              </svg>
              <svg v-else-if="item.icon === 'contracts'" class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6.5 3.5h8l4 4v13h-13v-15a2 2 0 0 1 1-2Z" /><path d="M14.5 3.8v4h4M8.5 12h7m-7 4h7" />
              </svg>
              <svg v-else class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(1 1) scale(.92)" />
              </svg>
            </span>
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <div class="mt-auto border-t border-white/10 p-4">
        <div class="mb-3 truncate px-3 text-xs text-slate-400" :title="user?.email || ''">{{ user?.email }}</div>
        <button type="button" class="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50" :disabled="isSigningOut" @click="signOut">
          {{ isSigningOut ? t('signingOut') : t('signOut') }}
          <span class="text-xs text-slate-500 transition group-hover:text-slate-300">{{ isIndonesian ? 'Akhiri sesi' : 'End session' }}</span>
        </button>
      </div>
    </aside>

    <div class="min-h-screen lg:pl-64">
      <header class="admin-topbar sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3">
            <button type="button" class="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden" :aria-label="isIndonesian ? 'Buka menu' : 'Open menu'" @click="isSidebarOpen = true">☰</button>
            <div :key="pageTitle" class="admin-heading-enter">
              <p class="text-xs text-slate-500">{{ isIndonesian ? 'Administrasi' : 'Administration' }}</p>
              <h1 class="text-sm font-semibold sm:text-base">{{ pageTitle }}</h1>
            </div>
          </div>
          <label class="sr-only" for="admin-locale">{{ t('language') }}</label>
          <div class="w-48">
            <UiSearchableSelect
              id="admin-locale"
              v-model="locale"
              :options="[
                { value: 'id', label: 'Bahasa Indonesia', description: 'ID' },
                { value: 'en', label: 'English', description: 'EN' },
              ]"
              :placeholder="t('language')"
              :search-placeholder="t('language')"
              :searchable="false"
              size="compact"
            />
          </div>
        </div>
      </header>
      <main class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p class="-mt-5 mb-6 text-sm text-slate-500">{{ pageDescription }}</p>
        <slot />
      </main>
    </div>
  </div>
</template>
