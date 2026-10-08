<script setup lang="ts">
import type { VendorInput, VendorRecord } from '../../composables/useVendors'
import type { VendorStatus } from '../../types'
import { useAppLocale } from '../../composables/useAppLocale'
import { useVendors } from '../../composables/useVendors'

const props = defineProps<{
  initialValue?: VendorRecord | null
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [value: VendorInput, logo: File | null, removeLogo: boolean]
  cancel: []
}>()

const { locale } = useAppLocale()
const vendorsApi = useVendors()
const isIndonesian = computed(() => locale.value === 'id')
const form = reactive({
  vendor_code: '',
  name: '',
  service_category: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  status: 'under_review' as VendorStatus,
  notes: '',
})
const logoFile = ref<File | null>(null)
const removeCurrentLogo = ref(false)
const logoError = ref('')
const logoPreviewUrl = ref('')
const isLoadingLogo = ref(false)
let localLogoPreviewUrl = ''
const validationErrors = reactive<Record<string, string>>({})

watch(() => props.initialValue, async (vendor) => {
  if (localLogoPreviewUrl) {
    URL.revokeObjectURL(localLogoPreviewUrl)
    localLogoPreviewUrl = ''
  }
  logoPreviewUrl.value = ''
  logoFile.value = null
  if (!vendor) return
  Object.assign(form, {
    vendor_code: vendor.vendor_code,
    name: vendor.name,
    service_category: vendor.service_category,
    contact_name: vendor.contact_name ?? '',
    contact_email: vendor.contact_email ?? '',
    contact_phone: vendor.contact_phone ?? '',
    status: vendor.status,
    notes: vendor.notes ?? '',
  })
  removeCurrentLogo.value = false
  if (vendor.logo_storage_path) {
    isLoadingLogo.value = true
    try {
      logoPreviewUrl.value = await vendorsApi.getLogoUrl(vendor.logo_storage_path)
    } catch (error) {
      console.warn('Vendor logo preview could not be loaded.', error)
      logoError.value = isIndonesian.value ? 'Logo saat ini gagal dimuat.' : 'Could not load the current logo.'
    } finally {
      isLoadingLogo.value = false
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (localLogoPreviewUrl) URL.revokeObjectURL(localLogoPreviewUrl)
})

function selectLogo(event: Event) {
  logoError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    logoError.value = isIndonesian.value ? 'Logo harus berformat JPEG, PNG, atau WebP.' : 'Logo must be JPEG, PNG, or WebP.'
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    logoError.value = isIndonesian.value ? 'Ukuran logo maksimal 5 MB.' : 'Logo must be 5 MB or smaller.'
    input.value = ''
    return
  }
  logoFile.value = file
  if (localLogoPreviewUrl) URL.revokeObjectURL(localLogoPreviewUrl)
  localLogoPreviewUrl = URL.createObjectURL(file)
  logoPreviewUrl.value = localLogoPreviewUrl
  removeCurrentLogo.value = false
}

function clearSelectedLogo() {
  logoFile.value = null
  logoPreviewUrl.value = ''
  if (localLogoPreviewUrl) {
    URL.revokeObjectURL(localLogoPreviewUrl)
    localLogoPreviewUrl = ''
  }
}

function submit() {
  Object.keys(validationErrors).forEach(key => delete validationErrors[key])
  const requiredFields = [
    ['vendor_code', form.vendor_code, isIndonesian.value ? 'Kode vendor wajib diisi.' : 'Vendor code is required.'],
    ['name', form.name, isIndonesian.value ? 'Nama perusahaan wajib diisi.' : 'Company name is required.'],
    ['service_category', form.service_category, isIndonesian.value ? 'Kategori layanan wajib diisi.' : 'Service category is required.'],
  ] as const
  for (const [key, value, message] of requiredFields) {
    if (!value.trim()) validationErrors[key] = message
  }
  if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
    validationErrors.contact_email = isIndonesian.value ? 'Format email tidak valid.' : 'Enter a valid email address.'
  }
  if (Object.keys(validationErrors).length) return
  emit('submit', { ...form }, logoFile.value, removeCurrentLogo.value)
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div class="grid gap-5 sm:grid-cols-2">
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Kode vendor' : 'Vendor code' }}
        <input v-model="form.vendor_code" maxlength="50" :placeholder="isIndonesian ? 'Contoh: VEN-0001' : 'Example: VEN-0001'" :aria-invalid="Boolean(validationErrors.vendor_code)" class="form-input mt-1.5">
        <span v-if="validationErrors.vendor_code" class="mt-1 block text-xs text-rose-700">{{ validationErrors.vendor_code }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Nama perusahaan' : 'Company name' }}
        <input v-model="form.name" maxlength="200" :placeholder="isIndonesian ? 'Contoh: PT Sumber Teknologi' : 'Example: Acme Technology Ltd.'" :aria-invalid="Boolean(validationErrors.name)" class="form-input mt-1.5">
        <span v-if="validationErrors.name" class="mt-1 block text-xs text-rose-700">{{ validationErrors.name }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Kategori layanan' : 'Service category' }}
        <input v-model="form.service_category" maxlength="120" :placeholder="isIndonesian ? 'Contoh: IT, kebersihan, katering' : 'Example: IT, cleaning, catering'" :aria-invalid="Boolean(validationErrors.service_category)" class="form-input mt-1.5">
        <span v-if="validationErrors.service_category" class="mt-1 block text-xs text-rose-700">{{ validationErrors.service_category }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Nama PIC (orang yang bisa dihubungi)' : 'Contact person (PIC)' }}
        <input v-model="form.contact_name" maxlength="160" :placeholder="isIndonesian ? 'Contoh: Budi Santoso' : 'Example: Alex Morgan'" class="form-input mt-1.5">
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Email PIC' : 'PIC email' }}
        <input v-model="form.contact_email" type="email" maxlength="254" :placeholder="isIndonesian ? 'nama@perusahaan.com' : 'name@company.com'" :aria-invalid="Boolean(validationErrors.contact_email)" class="form-input mt-1.5">
        <span v-if="validationErrors.contact_email" class="mt-1 block text-xs text-rose-700">{{ validationErrors.contact_email }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Nomor telepon PIC' : 'PIC phone number' }}
        <input v-model="form.contact_phone" type="tel" maxlength="40" :placeholder="isIndonesian ? 'Contoh: +62 812 3456 7890' : 'Example: +1 555 010 1234'" class="form-input mt-1.5">
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Status vendor' : 'Vendor status' }}
        <UiSearchableSelect
          v-model="form.status"
          :options="[
            { value: 'under_review', label: isIndonesian ? 'Dalam peninjauan' : 'Under review' },
            { value: 'active', label: isIndonesian ? 'Aktif' : 'Active' },
            { value: 'inactive', label: isIndonesian ? 'Nonaktif' : 'Inactive' },
          ]"
          :placeholder="isIndonesian ? 'Pilih status' : 'Select status'"
          :search-placeholder="isIndonesian ? 'Cari status…' : 'Search statuses…'"
          :searchable="false"
        />
        <span class="mt-1 block text-xs font-normal text-slate-500">{{ isIndonesian ? 'Pilih status kerja sama vendor saat ini.' : 'Choose the vendor’s current relationship status.' }}</span>
      </label>
      <label class="block text-sm font-medium sm:col-span-2">
        {{ isIndonesian ? 'Catatan tambahan (opsional)' : 'Additional notes (optional)' }}
        <textarea v-model="form.notes" rows="3" maxlength="2000" :placeholder="isIndonesian ? 'Informasi penting tentang vendor yang belum tercakup di field lain.' : 'Other useful vendor information not covered by the fields above.'" class="form-input mt-1.5" />
      </label>
      <div class="sm:col-span-2">
        <label for="vendor-logo" class="block text-sm font-medium">{{ isIndonesian ? 'Logo vendor (opsional)' : 'Vendor logo (optional)' }}</label>
        <input
          id="vendor-logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="mt-1.5 block w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-medium file:text-indigo-700"
          @change="selectLogo"
        >
        <p class="mt-1 text-xs text-slate-500">{{ isIndonesian ? 'JPEG, PNG, atau WebP. Maksimal 5 MB.' : 'JPEG, PNG, or WebP. Maximum 5 MB.' }}</p>
        <div v-if="isLoadingLogo" class="mt-3 flex items-center gap-2 text-sm text-slate-500" role="status">
          <span class="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          {{ isIndonesian ? 'Memuat logo…' : 'Loading logo…' }}
        </div>
        <div v-else-if="logoPreviewUrl && !removeCurrentLogo" class="mt-3 flex items-center gap-3">
          <img :src="logoPreviewUrl" :alt="isIndonesian ? 'Preview logo vendor' : 'Vendor logo preview'" class="size-16 rounded-xl border border-slate-200 bg-white object-contain p-1.5">
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-700">{{ logoFile?.name || (isIndonesian ? 'Logo saat ini' : 'Current logo') }}</p>
            <p v-if="logoFile" class="text-xs text-slate-500">{{ (logoFile.size / 1048576).toFixed(2) }} MB</p>
            <button v-if="props.initialValue?.logo_storage_path" type="button" class="mt-1 text-sm font-medium text-rose-700 hover:underline" @click="removeCurrentLogo = true; logoPreviewUrl = ''">
              {{ isIndonesian ? 'Hapus logo saat menyimpan' : 'Remove logo on save' }}
            </button>
            <button v-else-if="logoFile" type="button" class="mt-1 text-sm font-medium text-rose-700 hover:underline" @click="clearSelectedLogo">
              {{ isIndonesian ? 'Batalkan pilihan' : 'Remove selection' }}
            </button>
          </div>
        </div>
        <p v-if="removeCurrentLogo" class="mt-2 text-sm text-amber-800">{{ isIndonesian ? 'Logo akan dihapus saat disimpan.' : 'Logo will be removed when saved.' }}</p>
        <p v-if="logoError" role="alert" class="mt-2 text-sm text-rose-700">{{ logoError }}</p>
      </div>
    </div>
    <div class="flex justify-end gap-3 border-t border-slate-200 pt-5">
      <button type="button" class="button-secondary" @click="emit('cancel')">
        {{ isIndonesian ? 'Batal' : 'Cancel' }}
      </button>
      <button type="submit" class="button-primary" :disabled="busy">
        {{ busy ? (isIndonesian ? 'Menyimpan…' : 'Saving…') : (isIndonesian ? 'Simpan vendor' : 'Save vendor') }}
      </button>
    </div>
  </form>
</template>
