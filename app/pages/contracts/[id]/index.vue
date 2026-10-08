<script setup lang="ts">
import type { ContractDocument, ContractRecord } from '../../../composables/useContracts'
import { useAppLocale } from '../../../composables/useAppLocale'
import { useSupabaseAuth } from '../../../composables/useSupabaseAuth'
import { useContracts } from '../../../composables/useContracts'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const { supabase } = useSupabaseAuth()

const contractsApi = useContracts()
const contract = ref<ContractRecord | null>(null)
const files = ref<ContractDocument[]>([])
const fileError = ref('')
const previewUrls = ref<Record<string, string>>({})
const previewStates = ref<Record<string, 'loading' | 'ready' | 'error'>>({})

try {
  contract.value = await contractsApi.get(String(route.params.id))
  const { data, error } = await supabase
    .from('contract_files')
    .select('id, contract_id, original_name, storage_path, mime_type, file_size_bytes, created_at')
    .eq('contract_id', String(route.params.id))
    .order('created_at', { ascending: false })
  if (error) throw error
  files.value = data ?? []
  await Promise.all(files.value.map(file => loadDocumentPreview(file.id, file.storage_path)))
} catch (error) {
  console.error('Contract detail load failed:', error)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(isIndonesian.value ? 'id-ID' : 'en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function formatValue() {
  const currentContract = contract.value
  if (!currentContract || currentContract.contract_value === null || !currentContract.currency) return '—'
  return new Intl.NumberFormat(isIndonesian.value ? 'id-ID' : 'en-US', { style: 'currency', currency: currentContract.currency }).format(currentContract.contract_value)
}

async function downloadFile(path: string) {
  fileError.value = ''
  const { data: signed, error: signedError } = await supabase.storage
    .from('contract-documents')
    .createSignedUrl(path, 60)

  if (signedError || !signed?.signedUrl) {
    fileError.value = isIndonesian.value ? 'Dokumen gagal dibuka.' : 'Could not open document.'
    return
  }

  window.open(signed.signedUrl, '_blank', 'noopener,noreferrer')
}

async function loadDocumentPreview(fileId: string, path: string) {
  previewStates.value[fileId] = 'loading'
  try {
    const result = await Promise.race([
      supabase.storage.from('contract-documents').createSignedUrl(path, 900),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Preview request timed out')), 12000)),
    ])

    if (result.error || !result.data?.signedUrl) throw result.error || new Error('Signed URL is missing')
    previewUrls.value[fileId] = result.data.signedUrl
    previewStates.value[fileId] = 'ready'
  } catch (error) {
    console.warn(`PDF preview could not be prepared (${fileId}).`, error)
    previewStates.value[fileId] = 'error'
  }
}

async function uploadDocument(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    fileError.value = isIndonesian.value ? 'Dokumen kontrak harus berupa PDF.' : 'Contract document must be a PDF.'
    return
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    fileError.value = isIndonesian.value ? 'Ukuran PDF harus maksimal 50 MB.' : 'PDF must be no larger than 50 MB.'
    return
  }
  try {
    await contractsApi.uploadDocument(String(route.params.id), file)
    const { data, error } = await supabase
      .from('contract_files')
      .select('id, contract_id, storage_path, original_name, mime_type, file_size_bytes, created_at')
      .eq('contract_id', String(route.params.id))
      .order('created_at', { ascending: false })
    if (error) throw error
    files.value = data ?? []
    await Promise.all(files.value.map(file => loadDocumentPreview(file.id, file.storage_path)))
    fileError.value = ''
  } catch (error) {
    console.error('Contract document upload failed:', error)
    fileError.value = isIndonesian.value ? 'PDF gagal diunggah. Periksa policy Storage dan koneksi.' : 'PDF upload failed. Check Storage policies and connection.'
  }
}

async function deleteDocument(file: ContractDocument) {
  if (!window.confirm(isIndonesian.value ? `Hapus dokumen ${file.original_name}?` : `Delete ${file.original_name}?`)) return
  try {
    await contractsApi.removeDocument(file)
    files.value = files.value.filter(item => item.id !== file.id)
    delete previewUrls.value[file.id]
  } catch (error) {
    console.error('Contract document deletion failed:', error)
    fileError.value = isIndonesian.value ? 'Dokumen gagal dihapus.' : 'Could not delete document.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-5xl space-y-5">
      <NuxtLink to="/contracts" class="text-sm font-medium text-indigo-700 hover:underline">← {{ isIndonesian ? 'Kembali ke kontrak' : 'Back to contracts' }}</NuxtLink>
      <p v-if="!contract" role="alert" class="mt-5 rounded-lg bg-rose-50 p-4 text-rose-800">{{ isIndonesian ? 'Kontrak tidak ditemukan.' : 'Contract not found.' }}</p>
      <template v-else>
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-600">{{ contract.contract_number }}</span>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="contract.status === 'active' ? 'bg-emerald-50 text-emerald-700' : contract.status === 'closed' || contract.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'">{{ contract.status.replaceAll('_', ' ') }}</span>
              </div>
              <h1 class="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{{ contract.title }}</h1>
              <NuxtLink :to="`/vendors/${contract.vendor_id}`" class="mt-2 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline">
                {{ contract.vendor?.name }}
              </NuxtLink>
            </div>
            <NuxtLink :to="`/contracts/${contract.id}/edit`" class="button-primary shrink-0">{{ isIndonesian ? 'Edit kontrak' : 'Edit contract' }}</NuxtLink>
          </div>
          <div class="grid border-t border-slate-200 bg-slate-50/70 sm:grid-cols-3">
            <div class="border-b border-slate-200 px-6 py-4 sm:border-b-0 sm:border-r">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Tanggal mulai' : 'Start date' }}</p>
              <p class="mt-1.5 font-semibold text-slate-800">{{ formatDate(contract.start_date) }}</p>
            </div>
            <div class="border-b border-slate-200 px-6 py-4 sm:border-b-0 sm:border-r">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Tanggal berakhir' : 'End date' }}</p>
              <p class="mt-1.5 font-semibold text-slate-800">{{ formatDate(contract.end_date) }}</p>
            </div>
            <div class="px-6 py-4">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ isIndonesian ? 'Nilai kontrak' : 'Contract value' }}</p>
              <p class="mt-1.5 font-semibold text-slate-800">{{ formatValue() }}</p>
            </div>
          </div>
        </div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-xl bg-violet-50 text-lg text-violet-700" aria-hidden="true">◎</span>
              <div>
                <h2 class="font-semibold text-slate-900">{{ isIndonesian ? 'Penanggung jawab' : 'Contract owner' }}</h2>
                <p class="text-xs text-slate-500">{{ isIndonesian ? 'PIC internal kontrak' : 'Internal contract contact' }}</p>
              </div>
            </div>
            <p class="mt-5 text-lg font-semibold text-slate-800">{{ contract.owner_name }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div class="flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-xl bg-amber-50 text-lg text-amber-700" aria-hidden="true">≡</span>
              <div>
                <h2 class="font-semibold text-slate-900">{{ isIndonesian ? 'Catatan' : 'Notes' }}</h2>
                <p class="text-xs text-slate-500">{{ isIndonesian ? 'Informasi tambahan' : 'Additional information' }}</p>
              </div>
            </div>
            <p v-if="contract.notes" class="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{{ contract.notes }}</p>
            <p v-else class="mt-5 text-sm italic text-slate-400">{{ isIndonesian ? 'Belum ada catatan.' : 'No notes added.' }}</p>
          </div>
        </div>
        <div class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="font-semibold">{{ isIndonesian ? 'Dokumen kontrak' : 'Contract documents' }}</h2>
            <label class="button-secondary cursor-pointer">
              {{ isIndonesian ? 'Unggah PDF' : 'Upload PDF' }}
              <input class="sr-only" type="file" accept="application/pdf,.pdf" @change="uploadDocument">
            </label>
          </div>
          <p v-if="fileError" role="alert" class="mt-3 text-sm text-rose-700">{{ fileError }}</p>
          <p v-if="!files?.length" class="mt-3 text-sm text-slate-500">{{ isIndonesian ? 'Belum ada dokumen yang diunggah.' : 'No documents uploaded.' }}</p>
          <div v-else class="mt-4 grid gap-5">
            <article v-for="file in files" :key="file.id" class="overflow-hidden rounded-xl border border-slate-200">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-xs font-bold text-rose-700 ring-1 ring-rose-100">PDF</span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-800">{{ file.original_name }}</p>
                    <p class="mt-0.5 text-xs text-slate-500">{{ (file.file_size_bytes / 1048576).toFixed(1) }} MB · {{ formatDate(file.created_at.slice(0, 10)) }}</p>
                  </div>
                </div>
                <div class="flex shrink-0 gap-3 text-sm">
                  <button type="button" class="font-medium text-indigo-700 hover:underline" @click="downloadFile(file.storage_path)">{{ isIndonesian ? 'Buka / unduh' : 'Open / download' }}</button>
                  <button type="button" class="font-medium text-rose-700 hover:underline" @click="deleteDocument(file)">{{ isIndonesian ? 'Hapus' : 'Delete' }}</button>
                </div>
              </div>
              <div class="relative bg-slate-100">
                <iframe
                  v-if="previewStates[file.id] === 'ready' && previewUrls[file.id]"
                  :src="previewUrls[file.id]"
                  :title="`${isIndonesian ? 'Preview dokumen' : 'Document preview'}: ${file.original_name}`"
                  class="h-[min(68vh,760px)] w-full bg-white"
                />
                <div v-else-if="previewStates[file.id] === 'loading'" class="flex h-44 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <span class="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                  <span>{{ isIndonesian ? 'Menyiapkan preview PDF…' : 'Preparing PDF preview…' }}</span>
                </div>
                <div v-else class="flex h-44 flex-col items-center justify-center gap-2 px-5 text-center">
                  <p class="text-sm font-medium text-slate-700">{{ isIndonesian ? 'Preview tidak tersedia saat ini.' : 'Preview is unavailable right now.' }}</p>
                  <p class="text-xs text-slate-500">{{ isIndonesian ? 'Coba buka atau unduh dokumen menggunakan tombol di atas.' : 'Use the open/download button above to view the document.' }}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </template>
  </section>
</template>
