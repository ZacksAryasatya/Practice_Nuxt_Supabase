<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { useSupabaseAuth } from '../composables/useSupabaseAuth'

definePageMeta({ layout: 'admin' })

const { locale, t } = useAppLocale()
const { supabase } = useSupabaseAuth()
const vendorCount = ref(0)
const activeContracts = ref(0)
const expiringContracts = ref(0)
const expiryNoticeDays = ref(90)
const expiringList = ref<Array<{
  id: string
  contract_number: string
  title: string
  end_date: string
  vendor: { name: string } | null
}>>([])
const dashboardError = ref('')
let channels: Array<{ unsubscribe: () => void }> = []

async function loadDashboard() {
  try {
    dashboardError.value = ''
    const [{ count: vendorTotal, error: vendorError }, { count: activeTotal, error: activeError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase.from('vendors').select('id', { count: 'exact', head: true }),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('app_settings').select('value').eq('key', 'contract_expiry_notice_days').maybeSingle(),
    ])

    if (vendorError) throw vendorError
    if (activeError) throw activeError
    if (settingsError) throw settingsError

    vendorCount.value = vendorTotal ?? 0
    activeContracts.value = activeTotal ?? 0
    expiryNoticeDays.value = Number(settings?.value ?? 90)

    const todayDate = new Date()
    const today = todayDate.toISOString().slice(0, 10)
    const noticeEndDate = new Date(todayDate)
    noticeEndDate.setUTCDate(noticeEndDate.getUTCDate() + expiryNoticeDays.value)
    const noticeEnd = noticeEndDate.toISOString().slice(0, 10)
    const [{ count: expiringTotal, error: expiringError }, { data, error: listError }] = await Promise.all([
      supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('end_date', today).lte('end_date', noticeEnd),
      supabase.from('contracts').select('id, contract_number, title, end_date, vendor:vendors!contracts_vendor_id_fkey(name)').eq('status', 'active').gte('end_date', today).lte('end_date', noticeEnd).order('end_date', { ascending: true }).limit(5),
    ])

    if (expiringError) throw expiringError
    if (listError) throw listError
    expiringContracts.value = expiringTotal ?? 0
    expiringList.value = (data ?? []) as unknown as typeof expiringList.value
  } catch (error) {
    console.error('Dashboard load failed:', error)
    dashboardError.value = locale.value === 'id' ? 'Ringkasan dashboard gagal dimuat.' : 'Could not load dashboard summary.'
  }
}

onMounted(async () => {
  await loadDashboard()
  const refresh = () => void loadDashboard()
  const vendorsChannel = supabase.channel('dashboard-vendors')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, refresh)
    .subscribe()
  const contractsChannel = supabase.channel('dashboard-contracts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, refresh)
    .subscribe()
  const settingsChannel = supabase.channel('dashboard-settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, refresh)
    .subscribe()
  channels = [vendorsChannel, contractsChannel, settingsChannel]
})

onBeforeUnmount(() => {
  channels.forEach((channel) => {
    void supabase.removeChannel(channel as never)
  })
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
</script>

<template>
  <section class="mx-auto max-w-6xl">
      <p v-if="dashboardError" role="alert" class="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ dashboardError }}</p>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink to="/vendors" class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md sm:p-6">
          <span class="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t('vendors') }}</p>
              <p class="mt-3 text-4xl font-bold tracking-tight text-slate-900">{{ vendorCount }}</p>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700" aria-hidden="true">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></svg>
            </span>
          </div>
          <span class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">{{ t('manageVendors') }}<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
        </NuxtLink>
        <NuxtLink to="/contracts" class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md sm:p-6">
          <span class="absolute inset-y-0 left-0 w-1 bg-sky-500" />
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t('activeContracts') }}</p>
              <p class="mt-3 text-4xl font-bold tracking-tight text-slate-900">{{ activeContracts }}</p>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 3.75v5h5M9 13h6m-6 4h6"/></svg>
            </span>
          </div>
          <span class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">{{ t('manageContracts') }}<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
        </NuxtLink>
        <NuxtLink to="/contracts" class="group relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md sm:p-6">
          <span class="absolute inset-y-0 left-0 w-1 bg-amber-500" />
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-amber-900">{{ t('expiringContracts') }}</p>
              <p class="mt-3 text-4xl font-bold tracking-tight text-amber-950">{{ expiringContracts }}</p>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800" aria-hidden="true">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2"/></svg>
            </span>
          </div>
          <span class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-900">{{ t('withinNoticePeriod') }}<span class="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
        </NuxtLink>
      </div>

      <div class="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h3 class="font-semibold text-slate-900">{{ t('upcomingContracts') }}</h3>
            <p class="mt-1 text-xs text-slate-500">{{ t('withinNoticePeriod') }}</p>
          </div>
          <NuxtLink to="/contracts" class="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">{{ t('viewAll') }}<span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div v-if="!expiringList.length" class="flex flex-col items-center px-6 py-12 text-center">
          <span class="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m7 12 3 3 7-7"/><circle cx="12" cy="12" r="9"/></svg>
          </span>
          <p class="mt-3 text-sm font-medium text-slate-800">{{ t('noUpcomingContracts') }}</p>
        </div>
        <div v-else class="divide-y divide-slate-100">
          <NuxtLink v-for="contract in expiringList" :key="contract.id" :to="`/contracts/${contract.id}`" class="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <div>
              <p class="font-semibold text-slate-800"><span class="text-indigo-700">{{ contract.contract_number }}</span><span class="mx-2 text-slate-300">/</span>{{ contract.title }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ contract.vendor?.name }}</p>
            </div>
            <span class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
              <span class="size-1.5 rounded-full bg-amber-500" />{{ formatDate(contract.end_date) }}
            </span>
          </NuxtLink>
        </div>
      </div>

  </section>
</template>
