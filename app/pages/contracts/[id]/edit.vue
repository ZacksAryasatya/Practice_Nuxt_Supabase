<script setup lang="ts">
import type { ContractDocument, ContractInput, ContractRecord } from '../../../composables/useContracts'
import type { VendorRecord } from '../../../composables/useVendors'
import { useAppLocale } from '../../../composables/useAppLocale'
import { useSupabaseAuth } from '../../../composables/useSupabaseAuth'
import { useContracts } from '../../../composables/useContracts'
import { useVendors } from '../../../composables/useVendors'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const { supabase } = useSupabaseAuth()
const contractsApi = useContracts()
const vendorsApi = useVendors()
const vendors = ref<VendorRecord[]>([])
const contract = ref<ContractRecord | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')
const documentFile = ref<File | null>(null)
const fieldErrors = reactive<Record<string, string>>({})
const existingFiles = ref<ContractDocument[]>([])
const previewUrls = ref<Record<string, string>>({})
const isLoadingFiles = ref(false)

try {
  const [contractData, vendorData] = await Promise.all([
    contractsApi.get(String(route.params.id)),
    vendorsApi.list(),
  ])
  contract.value = contractData
  vendors.value = vendorData.filter(vendor => vendor.status !== 'under_review')
  await loadExistingFiles()
} catch (error) {
  console.error('Contract edit data load failed:', error)
  errorMessage.value = isIndonesian.value ? 'Data kontrak atau vendor gagal dimuat.' : 'Could not load contract or vendors.'
}

async function loadExistingFiles() {
  isLoadingFiles.value = true
  try {
    const { data, error } = await supabase
      .from('contract_files')
      .select('id, contract_id, storage_path, original_name, mime_type, file_size_bytes, created_at')
      .eq('contract_id', String(route.params.id))
      .order('created_at', { ascending: false })
    if (error) throw error
    existingFiles.value = data ?? []
    await Promise.all(existingFiles.value.map(async (file) => {
      const { data: signed, error: signedError } = await supabase.storage.from('contract-documents').createSignedUrl(file.storage_path, 300)
      if (!signedError && signed?.signedUrl) previewUrls.value[file.id] = signed.signedUrl
    }))
  } catch (error) {
    console.error('Existing contract documents could not be loaded:', error)
    errorMessage.value = isIndonesian.value ? 'Dokumen kontrak lama gagal dimuat.' : 'Could not load existing contract documents.'
  } finally {
    isLoadingFiles.value = false
  }
}

async function updateContract(input: ContractInput) {
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
  if (input.end_date < input.start_date) {
    fieldErrors.end_date = isIndonesian.value ? 'Tanggal akhir tidak boleh sebelum tanggal mulai.' : 'End date cannot be earlier than start date.'
    return
  }
  if (input.contract_value !== null && input.contract_value !== undefined && input.contract_value < 0) {
    fieldErrors.contract_value = isIndonesian.value ? 'Nilai kontrak tidak boleh negatif.' : 'Contract value cannot be negative.'
    return
  }
  isSaving.value = true
  errorMessage.value = ''
  try {
    await contractsApi.update(String(route.params.id), input)
    if (documentFile.value) {
      await contractsApi.uploadDocument(String(route.params.id), documentFile.value)
    }
    await navigateTo(`/contracts/${route.params.id}`)
  } catch (error) {
    console.error('Contract update failed:', error)
    errorMessage.value = isIndonesian.value
      ? `Perubahan kontrak gagal disimpan${getDatabaseError(error) ? ` (${getDatabaseError(error)})` : '.'}`
      : `Could not save contract changes${getDatabaseError(error) ? ` (${getDatabaseError(error)})` : '.'}`
  } finally {
    isSaving.value = false
  }
}

function selectDocument(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    errorMessage.value = isIndonesian.value ? 'Dokumen kontrak harus berupa PDF.' : 'Contract document must be a PDF.'
    input.value = ''
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    errorMessage.value = isIndonesian.value ? 'Ukuran PDF maksimal 50 MB.' : 'PDF must be 50 MB or smaller.'
    input.value = ''
    return
  }
  errorMessage.value = ''
  documentFile.value = file
}

function getDatabaseError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '')
  }
  return ''
}
</script>

<template>
  <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <NuxtLink :to="`/contracts/${route.params.id}`" class="text-sm font-medium text-indigo-700 hover:underline">← {{ isIndonesian ? 'Kembali ke kontrak' : 'Back to contract' }}</NuxtLink>
      <h2 class="mt-5 text-2xl font-bold">{{ isIndonesian ? 'Edit kontrak' : 'Edit contract' }}</h2>
      <p v-if="errorMessage" role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <section v-if="contract" class="mt-6 rounded-xl border border-slate-200 p-4">
        <h2 class="font-semibold">{{ isIndonesian ? 'Dokumen yang sudah diunggah' : 'Existing documents' }}</h2>
        <p v-if="isLoadingFiles" class="mt-3 text-sm text-slate-500">{{ isIndonesian ? 'Memuat dokumen…' : 'Loading documents…' }}</p>
        <p v-else-if="!existingFiles.length" class="mt-3 text-sm text-slate-500">{{ isIndonesian ? 'Belum ada dokumen kontrak.' : 'No contract documents yet.' }}</p>
        <div v-else class="mt-3 space-y-4">
          <article v-for="file in existingFiles" :key="file.id" class="overflow-hidden rounded-lg border border-slate-200">
            <div class="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-sm">
              <span class="truncate font-medium">{{ file.original_name }} · {{ (file.file_size_bytes / 1048576).toFixed(1) }} MB</span>
              <a v-if="previewUrls[file.id]" :href="previewUrls[file.id]" target="_blank" rel="noopener noreferrer" class="shrink-0 font-medium text-indigo-700 hover:underline">{{ isIndonesian ? 'Buka' : 'Open' }}</a>
            </div>
            <iframe v-if="previewUrls[file.id]" :src="previewUrls[file.id]" :title="file.original_name" class="h-72 w-full bg-white" />
            <p v-else class="p-4 text-sm text-slate-500">{{ isIndonesian ? 'Preview tidak tersedia.' : 'Preview unavailable.' }}</p>
          </article>
        </div>
      </section>
      <label v-if="contract" class="mt-5 block text-sm font-medium">
        {{ isIndonesian ? 'Lampiran kontrak baru (PDF, opsional)' : 'Add contract attachment (PDF, optional)' }}
        <input type="file" accept="application/pdf,.pdf" class="form-input mt-1.5" @change="selectDocument">
        <span class="mt-1 block text-xs font-normal text-slate-500">{{ isIndonesian ? 'Dokumen lama tetap tersimpan. Format PDF, maksimal 50 MB per file.' : 'Existing documents are retained. PDF only, up to 50 MB per file.' }}</span>
        <span v-if="documentFile" class="mt-1 block text-xs text-slate-600">{{ documentFile.name }}</span>
        <span v-if="fieldErrors.end_date || fieldErrors.contract_value" class="mt-2 block text-xs text-rose-700">{{ fieldErrors.end_date || fieldErrors.contract_value }}</span>
      </label>
      <div v-if="contract" class="mt-6">
        <ContractsContractForm :vendors="vendors" :initial-value="contract" :busy="isSaving" @submit="updateContract" @cancel="navigateTo(`/contracts/${contract.id}`)" />
      </div>
  </section>
</template>
