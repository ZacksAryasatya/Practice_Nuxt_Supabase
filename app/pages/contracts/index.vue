<script setup lang="ts">
import type { ContractRecord } from '../../composables/useContracts'
import { useAppLocale } from '../../composables/useAppLocale'
import { useContracts } from '../../composables/useContracts'

definePageMeta({ layout: 'admin' })

const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const contractsApi = useContracts()
const contracts = ref<ContractRecord[]>([])
const search = ref('')
const statusFilter = ref('')
const isLoading = ref(true)
const errorMessage = ref('')
const pendingDelete = ref<ContractRecord | null>(null)
const isDeleting = ref(false)
let unsubscribe: (() => void) | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const filteredContracts = computed(() => statusFilter.value
  ? contracts.value.filter(contract => contract.status === statusFilter.value)
  : contracts.value)

async function loadContracts() {
  try {
    errorMessage.value = ''
    contracts.value = await contractsApi.list(search.value)
  } catch {
    errorMessage.value = isIndonesian.value ? 'Kontrak gagal dimuat.' : 'Could not load contracts.'
  } finally {
    isLoading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadContracts(), 250)
})

async function deleteContract(contract: ContractRecord) {
  pendingDelete.value = contract
}

async function confirmDeleteContract() {
  if (!pendingDelete.value) return
  isDeleting.value = true
  try {
    await contractsApi.remove(pendingDelete.value.id)
    pendingDelete.value = null
    await loadContracts()
  } catch {
    errorMessage.value = isIndonesian.value
      ? 'Kontrak gagal dihapus. Cek policy RLS, migration koreksi, dan dokumen terkait di Storage.'
      : 'Could not delete contract. Check RLS policies, the corrective migration, and related Storage documents.'
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  await loadContracts()
  unsubscribe = contractsApi.subscribe(() => void loadContracts())
})

onBeforeUnmount(() => {
  unsubscribe?.()
  clearTimeout(searchTimer)
})

function formatDate(value: string) {
  return new Intl.DateTimeFormat(isIndonesian.value ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function statusLabel(status: ContractRecord['status']) {
  const labels = isIndonesian.value
    ? { draft: 'Draf', active: 'Aktif', renewal_review: 'Tinjauan perpanjangan', closed: 'Ditutup', cancelled: 'Dibatalkan' }
    : { draft: 'Draft', active: 'Active', renewal_review: 'Renewal review', closed: 'Closed', cancelled: 'Cancelled' }
  return labels[status]
}

function contractValue(contract: ContractRecord) {
  if (contract.contract_value === null || !contract.currency) return '—'
  return new Intl.NumberFormat(isIndonesian.value ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: contract.currency,
    maximumFractionDigits: 2,
  }).format(contract.contract_value)
}
</script>

<template>
  <div>
    <section>
      <div class="mb-6 flex items-end justify-between gap-4">
        <div />
        <NuxtLink to="/contracts/new" class="button-primary">{{ isIndonesian ? 'Tambah kontrak' : 'Add contract' }}</NuxtLink>
      </div>
      <div class="mb-5 grid gap-3 sm:grid-cols-[1fr_240px]">
        <input v-model="search" type="search" :placeholder="isIndonesian ? 'Cari nomor, judul, penanggung jawab…' : 'Search number, title, owner…'" class="form-input">
        <UiSearchableSelect
          v-model="statusFilter"
          :options="[
            { value: '', label: isIndonesian ? 'Semua status' : 'All statuses' },
            { value: 'draft', label: isIndonesian ? 'Draf' : 'Draft' },
            { value: 'active', label: isIndonesian ? 'Aktif' : 'Active' },
            { value: 'renewal_review', label: isIndonesian ? 'Tinjauan perpanjangan' : 'Renewal review' },
            { value: 'closed', label: isIndonesian ? 'Ditutup' : 'Closed' },
            { value: 'cancelled', label: isIndonesian ? 'Dibatalkan' : 'Cancelled' },
          ]"
          :placeholder="isIndonesian ? 'Semua status' : 'All statuses'"
          :search-placeholder="isIndonesian ? 'Cari status…' : 'Search statuses…'"
          :searchable="false"
          size="toolbar"
        />
      </div>

      <p v-if="errorMessage" role="alert" class="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <p v-if="isLoading" class="p-8 text-center text-sm text-slate-500">{{ isIndonesian ? 'Memuat kontrak…' : 'Loading contracts…' }}</p>
        <p v-else-if="filteredContracts.length === 0" class="p-8 text-center text-sm text-slate-500">{{ isIndonesian ? 'Belum ada data kontrak.' : 'No contracts found.' }}</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-5 py-3">{{ isIndonesian ? 'Nomor / judul' : 'Number / title' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Vendor' : 'Vendor' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Masa berlaku' : 'Term' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Nilai' : 'Value' }}</th>
                <th class="px-5 py-3">{{ isIndonesian ? 'Status' : 'Status' }}</th>
                <th class="px-5 py-3 text-right">{{ isIndonesian ? 'Aksi' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="contract in filteredContracts" :key="contract.id" class="hover:bg-slate-50">
                <td class="px-5 py-4">
                  <NuxtLink :to="`/contracts/${contract.id}`" class="font-semibold text-indigo-700 hover:underline">{{ contract.contract_number }}</NuxtLink>
                  <p class="mt-0.5 text-xs text-slate-500">{{ contract.title }}</p>
                </td>
                <td class="px-5 py-4">{{ contract.vendor?.name || '—' }}</td>
                <td class="px-5 py-4 text-xs text-slate-600">{{ formatDate(contract.start_date) }}<br>– {{ formatDate(contract.end_date) }}</td>
                <td class="px-5 py-4">{{ contractValue(contract) }}</td>
                <td class="px-5 py-4"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{{ statusLabel(contract.status) }}</span></td>
                <td class="px-5 py-4 text-right">
                  <div class="flex justify-end gap-3">
                    <NuxtLink :to="`/contracts/${contract.id}/edit`" class="font-medium text-indigo-700 hover:underline">{{ isIndonesian ? 'Edit' : 'Edit' }}</NuxtLink>
                    <button type="button" class="font-medium text-rose-700 hover:underline" @click="deleteContract(contract)">{{ isIndonesian ? 'Hapus' : 'Delete' }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <UiConfirmDialog :open="Boolean(pendingDelete)" :title="isIndonesian ? 'Hapus kontrak?' : 'Delete contract?'" :message="pendingDelete ? (isIndonesian ? `Kontrak ${pendingDelete.contract_number} dan semua PDF terlampir akan dihapus permanen.` : `Contract ${pendingDelete.contract_number} and its attached PDFs will be permanently deleted.`) : ''" :confirm-label="isIndonesian ? 'Hapus kontrak' : 'Delete contract'" :cancel-label="isIndonesian ? 'Batal' : 'Cancel'" :busy="isDeleting" danger destructive @confirm="confirmDeleteContract" @cancel="pendingDelete = null" />
  </div>
</template>
