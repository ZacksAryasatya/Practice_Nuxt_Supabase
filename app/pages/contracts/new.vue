<script setup lang="ts">
import type { ContractInput } from '../../composables/useContracts'
import type { VendorRecord } from '../../composables/useVendors'
import { useAppLocale } from '../../composables/useAppLocale'
import { useSupabaseAuth } from '../../composables/useSupabaseAuth'
import { useContracts } from '../../composables/useContracts'
import { useVendors } from '../../composables/useVendors'

definePageMeta({ layout: 'admin' })

const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const { supabase } = useSupabaseAuth()
const contractsApi = useContracts()
const vendorsApi = useVendors()
const vendors = ref<VendorRecord[]>([])
const documentFile = ref<File | null>(null)
const isSaving = ref(false)
const saveStage = ref<'idle' | 'saving' | 'uploading'>('idle')
const errorMessage = ref('')

try {
  vendors.value = (await vendorsApi.list()).filter(vendor => vendor.status === 'active')
} catch (error) {
  console.error('Contract vendor list failed:', error)
  errorMessage.value = isIndonesian.value ? 'Daftar vendor gagal dimuat.' : 'Could not load vendors.'
}

async function createContract(input: ContractInput) {
  isSaving.value = true
  saveStage.value = 'saving'
  errorMessage.value = ''
  let createdContractId: string | null = null
  try {
    const contract = await contractsApi.create(input)
    createdContractId = contract.id
    if (documentFile.value) {
      saveStage.value = 'uploading'
      await contractsApi.uploadDocument(contract.id, documentFile.value)
    }
    await navigateTo(`/contracts/${contract.id}`)
  } catch (error) {
    console.error('Contract creation or document upload failed:', error)
    if (createdContractId) {
      errorMessage.value = isIndonesian.value
        ? 'Kontrak sudah tersimpan, tetapi PDF gagal diunggah. Kamu bisa coba unggah lagi dari halaman detail kontrak.'
        : 'The contract was saved, but its PDF could not be uploaded. You can retry from the contract detail page.'
    } else {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : ''
      errorMessage.value = isIndonesian.value
        ? `Kontrak gagal disimpan${code ? ` (${code})` : '. Periksa nomor, vendor, tanggal, dan nilai kontrak.'}`
        : `Could not save contract${code ? ` (${code})` : '. Check the number, vendor, dates, and value.'}`
    }
  } finally {
    isSaving.value = false
    saveStage.value = 'idle'
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

function clearSelectedDocument(input?: HTMLInputElement) {
  documentFile.value = null
  if (input) input.value = ''
  else {
    const fileInput = document.querySelector<HTMLInputElement>('#new-contract-document')
    if (fileInput) fileInput.value = ''
  }
}
</script>

<template>
  <section class="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <NuxtLink to="/contracts" class="text-sm font-medium text-indigo-700 hover:underline">← {{ isIndonesian ? 'Kembali ke kontrak' : 'Back to contracts' }}</NuxtLink>
      <h2 class="mt-5 text-2xl font-bold">{{ isIndonesian ? 'Tambah kontrak' : 'Add contract' }}</h2>
      <p v-if="!vendors.length" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        {{ isIndonesian ? 'Belum ada vendor aktif. Aktifkan vendor terlebih dahulu sebelum membuat kontrak.' : 'There are no active vendors. Activate a vendor before creating a contract.' }}
      </p>
      <p v-if="errorMessage" role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <label class="mt-5 block text-sm font-medium">
        {{ isIndonesian ? 'Lampiran kontrak (PDF, opsional)' : 'Contract attachment (PDF, optional)' }}
        <input id="new-contract-document" type="file" accept="application/pdf,.pdf" class="form-input mt-1.5" @change="selectDocument">
        <span class="mt-1 block text-xs font-normal text-slate-500">{{ isIndonesian ? 'Unggah dokumen perjanjian yang sudah ditandatangani. Format PDF, maksimal 50 MB.' : 'Upload the signed agreement document. PDF only, up to 50 MB.' }}</span>
      </label>
      <div v-if="documentFile" class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-rose-700 ring-1 ring-rose-100">PDF</span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-slate-800">{{ documentFile.name }}</span>
            <span class="mt-0.5 block text-xs text-slate-500">{{ (documentFile.size / 1048576).toFixed(1) }} MB</span>
          </span>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 hover:text-rose-800"
          :aria-label="isIndonesian ? `Hapus pilihan ${documentFile.name}` : `Remove ${documentFile.name}`"
          @click="clearSelectedDocument()"
        >
          {{ isIndonesian ? 'Hapus' : 'Remove' }}
        </button>
      </div>
      <div class="mt-6">
        <ContractsContractForm
          :vendors="vendors"
          :busy="isSaving"
          :busy-label="saveStage === 'uploading' ? (isIndonesian ? 'Mengunggah PDF…' : 'Uploading PDF…') : (isIndonesian ? 'Menyimpan…' : 'Saving…')"
          @submit="createContract"
          @cancel="navigateTo('/contracts')"
        />
      </div>
  </section>
</template>
