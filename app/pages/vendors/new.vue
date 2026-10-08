<script setup lang="ts">
import type { VendorInput } from '../../composables/useVendors'
import { useAppLocale } from '../../composables/useAppLocale'
import { useVendors } from '../../composables/useVendors'

definePageMeta({ layout: 'admin' })

const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const vendorsApi = useVendors()
const isSaving = ref(false)
const errorMessage = ref('')

async function createVendor(input: VendorInput, logo: File | null) {
  isSaving.value = true
  errorMessage.value = ''
  try {
    await vendorsApi.create(input, logo ? { name: logo.name, type: logo.type, size: logo.size, file: logo } : null)
    await navigateTo('/vendors')
  } catch {
    errorMessage.value = isIndonesian.value
      ? 'Vendor gagal disimpan. Periksa kode vendor dan koneksi database.'
      : 'Could not save vendor. Check the vendor code and database connection.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <NuxtLink to="/vendors" class="text-sm font-medium text-indigo-700 hover:underline">← {{ isIndonesian ? 'Kembali ke vendor' : 'Back to vendors' }}</NuxtLink>
      <h2 class="mt-5 text-2xl font-bold">{{ isIndonesian ? 'Tambah vendor' : 'Add vendor' }}</h2>
      <p v-if="errorMessage" role="alert" class="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{{ errorMessage }}</p>
      <div class="mt-6">
        <VendorsVendorForm :busy="isSaving" @submit="createVendor" @cancel="navigateTo('/vendors')" />
      </div>
    </section>
</template>
