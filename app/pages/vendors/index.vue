<script setup lang="ts">
import type { VendorRecord } from '../../composables/useVendors'
import { useAppLocale } from '../../composables/useAppLocale'
import { useVendors } from '../../composables/useVendors'
import { useSupabaseAuth } from '../../composables/useSupabaseAuth'

definePageMeta({ layout: 'admin' })

const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const vendorsApi = useVendors()
const { supabase } = useSupabaseAuth()
const vendors = ref<VendorRecord[]>([])
const logoUrls = ref<Record<string, string>>({})
const contractCounts = ref<Record<string, number>>({})
const search = ref('')
const statusFilter = ref('')
const isLoading = ref(true)
const errorMessage = ref('')
const pendingDelete = ref<VendorRecord | null>(null)
const isDeleting = ref(false)
let unsubscribe: (() => void) | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const filteredVendors = computed(() => statusFilter.value
  ? vendors.value.filter(vendor => vendor.status === statusFilter.value)
  : vendors.value)

async function loadVendors() {
  try {
    errorMessage.value = ''
    vendors.value = await vendorsApi.list(search.value)
    const [{ data: contracts, error: contractsError }] = await Promise.all([
      supabase.from('contracts').select('vendor_id'),
      Promise.all(vendors.value.map(async (vendor) => {
      if (!vendor.logo_storage_path) {
        delete logoUrls.value[vendor.id]
        return
      }

      try {
        logoUrls.value[vendor.id] = await vendorsApi.getLogoUrl(vendor.logo_storage_path)
      } catch (error) {
        console.warn(`Vendor logo could not be loaded (${vendor.id}).`, error)
        delete logoUrls.value[vendor.id]
      }
      })),
    ])
    if (contractsError) throw contractsError
    contractCounts.value = (contracts ?? []).reduce<Record<string, number>>((counts, contract) => {
      counts[contract.vendor_id] = (counts[contract.vendor_id] ?? 0) + 1
      return counts
    }, {})
  } catch {
    errorMessage.value = isIndonesian.value ? 'Data vendor gagal dimuat.' : 'Could not load vendors.'
  } finally {
    isLoading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadVendors(), 250)
})

async function deleteVendor(vendor: VendorRecord) {
  if ((contractCounts.value[vendor.id] ?? 0) > 0) {
    errorMessage.value = isIndonesian.value
      ? `Vendor ${vendor.name} masih memiliki ${contractCounts.value[vendor.id]} kontrak, jadi tidak dapat dihapus. Nonaktifkan vendor atau hapus kontraknya terlebih dahulu.`
      : `${vendor.name} still has ${contractCounts.value[vendor.id]} linked contract(s), so it cannot be deleted. Deactivate the vendor or remove its contracts first.`
    return
  }
  errorMessage.value = ''
  pendingDelete.value = vendor
}

async function confirmDeleteVendor() {
  if (!pendingDelete.value) return
  isDeleting.value = true
  try {
    await vendorsApi.remove(pendingDelete.value.id)
    pendingDelete.value = null
    await loadVendors()
  } catch {
    errorMessage.value = isIndonesian.value
      ? 'Vendor gagal dihapus. Pastikan vendor belum memiliki kontrak.'
      : 'Could not delete vendor. Make sure it has no contracts.'
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await loadVendors()
  unsubscribe = vendorsApi.subscribe(() => void loadVendors())
  const contractsChannel = supabase
    .channel('vendors-contract-counts-live-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => void loadVendors())
    .subscribe()
  const removeContractsChannel = () => { void supabase.removeChannel(contractsChannel) }
  const removeVendorChannel = unsubscribe
  unsubscribe = () => {
    removeVendorChannel?.()
    removeContractsChannel()
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  clearTimeout(searchTimer)
})

function statusLabel(status: VendorRecord['status']) {
  const labels = isIndonesian.value
    ? { under_review: 'Dalam peninjauan', active: 'Aktif', inactive: 'Nonaktif' }
    : { under_review: 'Under review', active: 'Active', inactive: 'Inactive' }
  return labels[status]
}

function vendorInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toLocaleUpperCase())
    .join('') || '?'
}

function handleLogoError(vendorId: string) {
  delete logoUrls.value[vendorId]
}
</script>

<template>
  <div>
    <section>
      <div class="mb-6 flex items-end justify-between gap-4">
        <div />
        <NuxtLink to="/vendors/new" class="button-primary">{{ isIndonesian ? 'Tambah vendor' : 'Add vendor' }}</NuxtLink>
      </div>
      <div class="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <input
          v-model="search"
          type="search"
          :placeholder="isIndonesian ? 'Cari nama, kode, kategori…' : 'Search name, code, category…'"
          class="form-input"
        >
        <UiSearchableSelect
          v-model="statusFilter"
          :options="[
            { value: '', label: isIndonesian ? 'Semua status' : 'All statuses' },
            { value: 'under_review', label: isIndonesian ? 'Dalam peninjauan' : 'Under review' },
            { value: 'active', label: isIndonesian ? 'Aktif' : 'Active' },
            { value: 'inactive', label: isIndonesian ? 'Nonaktif' : 'Inactive' },
          ]"
          :placeholder="isIndonesian ? 'Semua status' : 'All statuses'"
          :search-placeholder="isIndonesian ? 'Cari status…' : 'Search statuses…'"
          :searchable="false"
          size="toolbar"
        />
      </div>

      <p v-if="errorMessage" role="alert" class="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <p v-if="isLoading" class="p-8 text-center text-sm text-slate-500">{{ isIndonesian ? 'Memuat vendor…' : 'Loading vendors…' }}</p>
        <p v-else-if="filteredVendors.length === 0" class="p-8 text-center text-sm text-slate-500">
          {{ isIndonesian ? 'Belum ada data vendor.' : 'No vendors found.' }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-5 py-3">{{ isIndonesian ? 'Perusahaan' : 'Company' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Kategori' : 'Category' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Kontrak' : 'Contracts' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Kontak' : 'Contact' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Status' : 'Status' }}</th>
                <th class="px-5 py-3 text-right">{{ isIndonesian ? 'Aksi' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="vendor in filteredVendors" :key="vendor.id" class="hover:bg-slate-50">
                <td class="px-5 py-4">
                  <div class="flex min-w-56 items-center gap-3">
                    <img
                      v-if="logoUrls[vendor.id]"
                      :src="logoUrls[vendor.id]"
                      :alt="`${vendor.name} logo`"
                      class="size-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
                      @error="handleLogoError(vendor.id)"
                    >
                    <span v-else class="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">{{ vendorInitials(vendor.name) }}</span>
                    <span class="min-w-0">
                      <NuxtLink :to="`/vendors/${vendor.id}`" class="block truncate font-semibold text-indigo-700 hover:underline">{{ vendor.name }}</NuxtLink>
                      <span class="mt-0.5 block truncate text-xs text-slate-500">{{ vendor.contact_email || vendor.vendor_code }}</span>
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4">{{ vendor.service_category }}</td>
                <td class="px-5 py-4"><span class="inline-flex min-w-8 justify-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{{ contractCounts[vendor.id] ?? 0 }}</span></td>
                <td class="px-5 py-4">{{ vendor.contact_name || vendor.contact_phone || '—' }}</td>
                <td class="px-5 py-4"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{{ statusLabel(vendor.status) }}</span></td>
                <td class="px-5 py-4 text-right">
                  <div class="flex justify-end gap-3">
                    <NuxtLink :to="`/vendors/${vendor.id}/edit`" class="font-medium text-indigo-700 hover:underline">{{ isIndonesian ? 'Edit' : 'Edit' }}</NuxtLink>
                    <button type="button" class="font-medium text-rose-700 hover:underline" @click="deleteVendor(vendor)">{{ isIndonesian ? 'Hapus' : 'Delete' }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <UiConfirmDialog :open="Boolean(pendingDelete)" :title="isIndonesian ? 'Hapus vendor?' : 'Delete vendor?'" :message="pendingDelete ? (isIndonesian ? `Vendor ${pendingDelete.name} akan dihapus permanen hanya jika belum memiliki kontrak. Vendor dengan kontrak harus dinonaktifkan.` : `${pendingDelete.name} can only be deleted if it has no contracts. Vendors with contracts should be deactivated.`) : ''" :confirm-label="isIndonesian ? 'Hapus vendor' : 'Delete vendor'" :cancel-label="isIndonesian ? 'Batal' : 'Cancel'" :busy="isDeleting" danger destructive @confirm="confirmDeleteVendor" @cancel="pendingDelete = null" />
  </div>
</template>
