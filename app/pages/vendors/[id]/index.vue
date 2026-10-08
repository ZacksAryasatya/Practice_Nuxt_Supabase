<script setup lang="ts">
import type { VendorRecord } from '../../../composables/useVendors'
import { useAppLocale } from '../../../composables/useAppLocale'
import { useSupabaseAuth } from '../../../composables/useSupabaseAuth'
import { useVendors } from '../../../composables/useVendors'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const { supabase } = useSupabaseAuth()
const vendorsApi = useVendors()
const vendor = ref<VendorRecord | null>(null)
const logoUrl = ref('')
const errorMessage = ref('')

try {
  vendor.value = await vendorsApi.get(String(route.params.id))
  if (vendor.value.logo_storage_path) {
    logoUrl.value = await vendorsApi.getLogoUrl(vendor.value.logo_storage_path)
  }
} catch {
  errorMessage.value = isIndonesian.value ? 'Vendor tidak ditemukan.' : 'Vendor not found.'
}

const { data: contracts } = await supabase
  .from('contracts')
  .select('id, contract_number, title, start_date, end_date, status')
  .eq('vendor_id', String(route.params.id))
  .order('end_date', { ascending: true })

async function refreshLogo() {
  if (!vendor.value?.logo_storage_path) {
    logoUrl.value = ''
    return
  }
  try {
    logoUrl.value = await vendorsApi.getLogoUrl(vendor.value.logo_storage_path)
  } catch {
    logoUrl.value = ''
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale.value === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
</script>

<template>
  <section class="mx-auto max-w-5xl space-y-5">
    <NuxtLink to="/vendors" class="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 transition hover:-translate-x-0.5 hover:text-indigo-900">
      <span aria-hidden="true">←</span>{{ isIndonesian ? 'Kembali ke vendor' : 'Back to vendors' }}
    </NuxtLink>

    <p v-if="errorMessage" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{{ errorMessage }}</p>

    <template v-else-if="vendor">
      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
          <div class="flex min-w-0 items-center gap-5">
            <img
              v-if="logoUrl"
              :src="logoUrl"
              :alt="`${vendor.name} logo`"
              class="size-20 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm sm:size-24"
              @error="refreshLogo"
            >
            <div v-else class="grid size-20 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-2xl font-bold text-indigo-700 ring-1 ring-indigo-100 sm:size-24">
              {{ vendor.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') }}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tracking-wide text-slate-600">{{ vendor.vendor_code }}</span>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="vendor.status === 'active' ? 'bg-emerald-50 text-emerald-700' : vendor.status === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'">
                  {{ vendor.status === 'active' ? (isIndonesian ? 'Aktif' : 'Active') : vendor.status === 'inactive' ? (isIndonesian ? 'Nonaktif' : 'Inactive') : (isIndonesian ? 'Dalam peninjauan' : 'Under review') }}
                </span>
              </div>
              <h2 class="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{{ vendor.name }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ vendor.service_category }}</p>
            </div>
          </div>
          <NuxtLink :to="`/vendors/${vendor.id}/edit`" class="button-primary shrink-0">{{ isIndonesian ? 'Edit vendor' : 'Edit vendor' }}</NuxtLink>
        </div>
        <div class="grid border-t border-slate-200 bg-slate-50/70 sm:grid-cols-3">
          <div class="border-b border-slate-200 px-6 py-4 sm:border-b-0 sm:border-r">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Penanggung jawab (PIC)' : 'Contact person (PIC)' }}</p>
            <p class="mt-1.5 font-medium text-slate-800">{{ vendor.contact_name || '—' }}</p>
          </div>
          <div class="border-b border-slate-200 px-6 py-4 sm:border-b-0 sm:border-r">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Email kontak' : 'Contact email' }}</p>
            <a v-if="vendor.contact_email" :href="`mailto:${vendor.contact_email}`" class="mt-1.5 block truncate font-medium text-indigo-700 hover:underline">{{ vendor.contact_email }}</a>
            <p v-else class="mt-1.5 font-medium text-slate-800">—</p>
          </div>
          <div class="px-6 py-4">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Nomor telepon' : 'Phone number' }}</p>
            <a v-if="vendor.contact_phone" :href="`tel:${vendor.contact_phone}`" class="mt-1.5 block font-medium text-indigo-700 hover:underline">{{ vendor.contact_phone }}</a>
            <p v-else class="mt-1.5 font-medium text-slate-800">—</p>
          </div>
        </div>
      </article>

      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 class="font-semibold text-slate-900">{{ isIndonesian ? 'Kontrak vendor' : 'Vendor contracts' }}</h3>
            <p class="mt-1 text-xs text-slate-500">{{ isIndonesian ? 'Daftar kontrak yang terhubung dengan perusahaan ini.' : 'Contracts associated with this company.' }}</p>
          </div>
          <span class="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{{ contracts?.length ?? 0 }}</span>
        </div>
        <p v-if="!contracts?.length" class="p-8 text-center text-sm text-slate-500">{{ isIndonesian ? 'Belum ada kontrak untuk vendor ini.' : 'This vendor has no contracts yet.' }}</p>
        <div v-else class="divide-y divide-slate-100">
          <NuxtLink v-for="contract in contracts" :key="contract.id" :to="`/contracts/${contract.id}`" class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50">
            <div class="min-w-0">
              <p class="truncate font-semibold text-indigo-700">{{ contract.contract_number }} <span class="font-normal text-slate-700">· {{ contract.title }}</span></p>
              <p class="mt-1 text-xs text-slate-500">{{ contract.status }}</p>
            </div>
            <span class="shrink-0 text-sm text-slate-500">{{ formatDate(contract.start_date) }} – {{ formatDate(contract.end_date) }}</span>
          </NuxtLink>
        </div>
      </article>

      <article v-if="vendor.notes" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="font-semibold text-slate-900">{{ isIndonesian ? 'Catatan tambahan' : 'Additional notes' }}</h3>
        <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{{ vendor.notes }}</p>
      </article>
    </template>
  </section>
</template>
