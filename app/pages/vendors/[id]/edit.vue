<script setup lang="ts">
import type { VendorInput, VendorRecord } from '../../../composables/useVendors'
import { useAppLocale } from '../../../composables/useAppLocale'
import { useVendors } from '../../../composables/useVendors'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const vendorsApi = useVendors()
const isSaving = ref(false)
const errorMessage = ref('')

const vendor = ref<VendorRecord | null>(null)
const isLoading = ref(true)
try {
  vendor.value = await vendorsApi.get(String(route.params.id))
} catch (error) {
  console.error('Vendor edit data load failed:', error)
  errorMessage.value = isIndonesian.value ? 'Data vendor gagal dimuat.' : 'Could not load vendor.'
} finally {
  isLoading.value = false
}

async function updateVendor(input: VendorInput, logo: File | null, removeLogo: boolean) {
  isSaving.value = true
  errorMessage.value = ''
  try {
    await vendorsApi.update(
      String(route.params.id),
      input,
      logo ? { name: logo.name, type: logo.type, size: logo.size, file: logo } : null,
      removeLogo,
    )
    await navigateTo(`/vendors/${route.params.id}`)
  } catch (error) {
    console.error('Vendor update failed:', error)
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''
    errorMessage.value = isIndonesian.value
      ? `Perubahan vendor gagal disimpan${code ? ` (${code})` : '.'}`
      : `Could not save vendor changes${code ? ` (${code})` : '.'}`
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <NuxtLink :to="`/vendors/${route.params.id}`" class="text-sm font-medium text-indigo-700 hover:underline">← {{ isIndonesian ? 'Kembali ke vendor' : 'Back to vendor' }}</NuxtLink>
      <h2 class="mt-5 text-2xl font-bold">{{ isIndonesian ? 'Edit vendor' : 'Edit vendor' }}</h2>
      <p v-if="isLoading" class="mt-5 text-sm text-slate-500">{{ isIndonesian ? 'Memuat data vendor…' : 'Loading vendor…' }}</p>
      <p v-else-if="!vendor" role="alert" class="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage || (isIndonesian ? 'Vendor tidak ditemukan.' : 'Vendor not found.') }}</p>
      <p v-if="errorMessage" role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <div v-if="vendor" class="mt-6">
        <VendorsVendorForm :initial-value="vendor" :busy="isSaving" @submit="updateVendor" @cancel="navigateTo(`/vendors/${vendor.id}`)" />
      </div>
  </section>
</template>
