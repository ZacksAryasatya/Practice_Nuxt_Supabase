<script setup lang="ts">
import type { ContractInput, ContractRecord } from '../../composables/useContracts'
import type { ContractCurrency, ContractStatus } from '../../types'
import type { VendorRecord } from '../../composables/useVendors'
import { useAppLocale } from '../../composables/useAppLocale'

const props = defineProps<{
  vendors: VendorRecord[]
  initialValue?: ContractRecord | null
  busy?: boolean
  busyLabel?: string
}>()

const emit = defineEmits<{
  submit: [value: ContractInput]
  cancel: []
}>()

const { locale } = useAppLocale()
const isIndonesian = computed(() => locale.value === 'id')
const currencyCodes = [...new Set(Intl.supportedValuesOf('currency'))].sort()
const currencyOptions = computed(() => currencyCodes.map(currency => ({
  value: currency,
  label: currency,
  description: currencyCountryName(currency),
  searchText: currencyDisplayName(currency),
})))
const currencyCountries: Record<string, string> = {
  AED: 'United Arab Emirates', AFN: 'Afghanistan', ALL: 'Albania', AMD: 'Armenia', ANG: 'Curaçao / Sint Maarten',
  AOA: 'Angola', ARS: 'Argentina', AUD: 'Australia', AWG: 'Aruba', AZN: 'Azerbaijan', BAM: 'Bosnia and Herzegovina',
  BBD: 'Barbados', BDT: 'Bangladesh', BGN: 'Bulgaria', BHD: 'Bahrain', BIF: 'Burundi', BMD: 'Bermuda', BND: 'Brunei',
  BOB: 'Bolivia', BRL: 'Brazil', BSD: 'Bahamas', BTN: 'Bhutan', BWP: 'Botswana', BYN: 'Belarus', BZD: 'Belize',
  CAD: 'Canada', CDF: 'Democratic Republic of the Congo', CHF: 'Switzerland', CLP: 'Chile', CNY: 'China', COP: 'Colombia',
  CRC: 'Costa Rica', CUP: 'Cuba', CVE: 'Cape Verde', CZK: 'Czechia', DJF: 'Djibouti', DKK: 'Denmark', DOP: 'Dominican Republic',
  DZD: 'Algeria', EGP: 'Egypt', ERN: 'Eritrea', ETB: 'Ethiopia', EUR: 'Eurozone', FJD: 'Fiji', GBP: 'United Kingdom',
  GEL: 'Georgia', GHS: 'Ghana', GMD: 'The Gambia', GNF: 'Guinea', GTQ: 'Guatemala', HKD: 'Hong Kong', HNL: 'Honduras',
  HRK: 'Croatia', HTG: 'Haiti', HUF: 'Hungary', IDR: 'Indonesia', ILS: 'Israel', INR: 'India', IQD: 'Iraq', IRR: 'Iran',
  ISK: 'Iceland', JMD: 'Jamaica', JOD: 'Jordan', JPY: 'Japan', KES: 'Kenya', KGS: 'Kyrgyzstan', KHR: 'Cambodia',
  KMF: 'Comoros', KRW: 'South Korea', KWD: 'Kuwait', KZT: 'Kazakhstan', LAK: 'Laos', LBP: 'Lebanon', LKR: 'Sri Lanka',
  LRD: 'Liberia', LYD: 'Libya', MAD: 'Morocco', MDL: 'Moldova', MGA: 'Madagascar', MKD: 'North Macedonia', MMK: 'Myanmar',
  MNT: 'Mongolia', MOP: 'Macao', MRU: 'Mauritania', MUR: 'Mauritius', MVR: 'Maldives', MWK: 'Malawi', MXN: 'Mexico',
  MYR: 'Malaysia', MZN: 'Mozambique', NAD: 'Namibia', NGN: 'Nigeria', NIO: 'Nicaragua', NOK: 'Norway', NPR: 'Nepal',
  NZD: 'New Zealand', OMR: 'Oman', PAB: 'Panama', PEN: 'Peru', PGK: 'Papua New Guinea', PHP: 'Philippines', PKR: 'Pakistan',
  PLN: 'Poland', PYG: 'Paraguay', QAR: 'Qatar', RON: 'Romania', RSD: 'Serbia', RUB: 'Russia', RWF: 'Rwanda', SAR: 'Saudi Arabia',
  SBD: 'Solomon Islands', SCR: 'Seychelles', SDG: 'Sudan', SEK: 'Sweden', SGD: 'Singapore', SLL: 'Sierra Leone', SOS: 'Somalia',
  SRD: 'Suriname', SSP: 'South Sudan', STN: 'São Tomé and Príncipe', SYP: 'Syria', SZL: 'Eswatini', THB: 'Thailand', TJS: 'Tajikistan',
  TMT: 'Turkmenistan', TND: 'Tunisia', TOP: 'Tonga', TRY: 'Türkiye', TTD: 'Trinidad and Tobago', TWD: 'Taiwan', TZS: 'Tanzania',
  UAH: 'Ukraine', UGX: 'Uganda', USD: 'United States', UYU: 'Uruguay', UZS: 'Uzbekistan', VES: 'Venezuela', VND: 'Vietnam',
  VUV: 'Vanuatu', WST: 'Samoa', XAF: 'Central African States', XCD: 'Eastern Caribbean States', XOF: 'West African States',
  XPF: 'French Polynesia', YER: 'Yemen', ZAR: 'South Africa', ZMW: 'Zambia', ZWL: 'Zimbabwe',
}
const form = reactive({
  contract_number: '',
  vendor_id: '',
  title: '',
  start_date: '',
  end_date: '',
  contract_value: '' as string | number,
  currency: 'IDR' as ContractCurrency,
  status: 'draft' as ContractStatus,
  owner_name: '',
  notes: '',
})
const validationErrors = reactive<Record<string, string>>({})
const currencySymbol = computed(() => {
  try {
    return new Intl.NumberFormat(isIndonesian.value ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: form.currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0).find(part => part.type === 'currency')?.value ?? form.currency
  } catch {
    return form.currency
  }
})

function currencyCountryName(currency: string) {
  return currencyCountries[currency] || currencyDisplayName(currency)
}

function currencyDisplayName(currency: string) {
  try {
    return new Intl.DisplayNames([locale.value === 'id' ? 'id' : 'en'], { type: 'currency' }).of(currency) || currency
  } catch {
    return currency
  }
}

watch(() => form.currency, (currency) => {
  if (currency === 'JPY' && typeof form.contract_value === 'string' && form.contract_value.includes('.')) {
    form.contract_value = form.contract_value.split('.')[0] || ''
  }
})

const displayedContractValue = computed(() => {
  if (form.contract_value === '') return ''
  const [integerPart, fractionPart] = String(form.contract_value).split('.')
  const formattedInteger = new Intl.NumberFormat(isIndonesian.value ? 'id-ID' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Number(integerPart || 0))
  const decimalSeparator = isIndonesian.value ? ',' : '.'
  return fractionPart !== undefined ? `${formattedInteger}${decimalSeparator}${fractionPart}` : formattedInteger
})

watch(() => props.initialValue, (contract) => {
  if (!contract) return
  Object.assign(form, {
    contract_number: contract.contract_number,
    vendor_id: contract.vendor_id,
    title: contract.title,
    start_date: contract.start_date,
    end_date: contract.end_date,
    contract_value: contract.contract_value ?? '',
    currency: contract.currency ?? 'IDR',
    status: contract.status,
    owner_name: contract.owner_name,
    notes: contract.notes ?? '',
  })
}, { immediate: true })

function submit() {
  Object.keys(validationErrors).forEach(key => delete validationErrors[key])
  const requiredFields = [
    ['contract_number', form.contract_number, isIndonesian.value ? 'Nomor kontrak wajib diisi.' : 'Contract number is required.'],
    ['vendor_id', form.vendor_id, isIndonesian.value ? 'Pilih vendor.' : 'Select a vendor.'],
    ['title', form.title, isIndonesian.value ? 'Judul kontrak wajib diisi.' : 'Contract title is required.'],
    ['start_date', form.start_date, isIndonesian.value ? 'Tanggal mulai wajib diisi.' : 'Start date is required.'],
    ['end_date', form.end_date, isIndonesian.value ? 'Tanggal akhir wajib diisi.' : 'End date is required.'],
    ['owner_name', form.owner_name, isIndonesian.value ? 'Penanggung jawab wajib diisi.' : 'Contract owner is required.'],
  ] as const
  for (const [key, value, message] of requiredFields) {
    if (!String(value).trim()) validationErrors[key] = message
  }
  if (form.start_date && form.end_date && form.end_date < form.start_date) {
    validationErrors.end_date = isIndonesian.value ? 'Tanggal akhir tidak boleh sebelum tanggal mulai.' : 'End date cannot be earlier than start date.'
  }
  if (form.contract_value !== '' && (!Number.isFinite(Number(form.contract_value)) || Number(form.contract_value) < 0)) {
    validationErrors.contract_value = isIndonesian.value ? 'Nilai kontrak harus angka nol atau lebih.' : 'Contract value must be zero or greater.'
  }
  if (Object.keys(validationErrors).length) return
  const contractValue = form.contract_value === '' ? null : Number(form.contract_value)
  emit('submit', {
    ...form,
    contract_value: contractValue,
    currency: contractValue === null ? null : form.currency,
  })
}

function updateContractValue(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value
  let normalized: string

  if (isIndonesian.value) {
    normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  } else {
    normalized = value.replace(/[^\d,.-]/g, '').replace(/,/g, '')
  }

  const [integerPart = '', ...fractionParts] = normalized.split('.')
  const fractionPart = fractionParts.join('').slice(0, form.currency === 'JPY' ? 0 : 2)
  form.contract_value = fractionParts.length
    ? `${integerPart}${form.currency === 'JPY' ? '' : `.${fractionPart}`}`
    : integerPart
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div class="grid gap-5 sm:grid-cols-2">
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Nomor kontrak' : 'Contract number' }}
        <input v-model="form.contract_number" maxlength="100" :placeholder="isIndonesian ? 'Contoh: PKS/IT/2026/001' : 'Example: AGR/IT/2026/001'" :aria-invalid="Boolean(validationErrors.contract_number)" class="form-input mt-1.5">
        <span v-if="validationErrors.contract_number" class="mt-1 block text-xs text-rose-700">{{ validationErrors.contract_number }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Vendor' : 'Vendor' }}
        <UiSearchableSelect
          v-model="form.vendor_id"
          :options="vendors.map(vendor => ({ value: vendor.id, label: vendor.name, description: `${vendor.vendor_code} · ${vendor.service_category}`, searchText: `${vendor.vendor_code} ${vendor.service_category} ${vendor.contact_name ?? ''}` }))"
          :placeholder="isIndonesian ? 'Pilih vendor' : 'Select vendor'"
          :search-placeholder="isIndonesian ? 'Cari vendor…' : 'Search vendors…'"
          :invalid="Boolean(validationErrors.vendor_id)"
        />
        <span v-if="validationErrors.vendor_id" class="mt-1 block text-xs text-rose-700">{{ validationErrors.vendor_id }}</span>
      </label>
      <label class="block text-sm font-medium sm:col-span-2">
        {{ isIndonesian ? 'Judul / ruang lingkup' : 'Title / scope' }}
        <input v-model="form.title" maxlength="240" :placeholder="isIndonesian ? 'Contoh: Layanan internet kantor untuk tahun 2026' : 'Example: Office internet service for 2026'" :aria-invalid="Boolean(validationErrors.title)" class="form-input mt-1.5">
        <span v-if="validationErrors.title" class="mt-1 block text-xs text-rose-700">{{ validationErrors.title }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Tanggal mulai' : 'Start date' }}
        <input v-model="form.start_date" type="date" :aria-invalid="Boolean(validationErrors.start_date)" class="form-input mt-1.5">
        <span v-if="validationErrors.start_date" class="mt-1 block text-xs text-rose-700">{{ validationErrors.start_date }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Tanggal berakhir' : 'End date' }}
        <input v-model="form.end_date" type="date" :min="form.start_date" :aria-invalid="Boolean(validationErrors.end_date)" class="form-input mt-1.5">
        <span v-if="validationErrors.end_date" class="mt-1 block text-xs text-rose-700">{{ validationErrors.end_date }}</span>
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Nilai kontrak (opsional)' : 'Contract value (optional)' }}
        <div class="relative mt-1.5">
          <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center font-medium text-slate-500">{{ currencySymbol }}</span>
          <input
            :value="displayedContractValue"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            :placeholder="isIndonesian ? 'Contoh: 1.500.000' : 'Example: 1,500,000'"
            :aria-invalid="Boolean(validationErrors.contract_value)"
            class="form-input pl-12 tabular-nums"
            @input="updateContractValue"
          >
        </div>
        <span v-if="validationErrors.contract_value" class="mt-1 block text-xs text-rose-700">{{ validationErrors.contract_value }}</span>
      </label>
      <div class="text-sm font-medium">
        <label class="block">{{ isIndonesian ? 'Mata uang' : 'Currency' }}</label>
        <UiSearchableSelect
          v-model="form.currency"
          :options="currencyOptions"
          :placeholder="isIndonesian ? 'Pilih mata uang' : 'Select currency'"
          :search-placeholder="isIndonesian ? 'Cari mata uang atau negara…' : 'Search currency or country…'"
          :disabled="form.contract_value === ''"
        />
        <p class="mt-1 text-xs font-normal text-slate-500">
          {{ isIndonesian ? 'Pilih mata uang sesuai nilai yang tercantum di kontrak.' : 'Choose the currency specified in the contract.' }}
        </p>
      </div>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'Status' : 'Status' }}
        <UiSearchableSelect
          v-model="form.status"
          :options="[
            { value: 'draft', label: isIndonesian ? 'Draf' : 'Draft' },
            { value: 'active', label: isIndonesian ? 'Aktif' : 'Active' },
            { value: 'renewal_review', label: isIndonesian ? 'Tinjauan perpanjangan' : 'Renewal review' },
            { value: 'closed', label: isIndonesian ? 'Ditutup' : 'Closed' },
            { value: 'cancelled', label: isIndonesian ? 'Dibatalkan' : 'Cancelled' },
          ]"
          :placeholder="isIndonesian ? 'Pilih status' : 'Select status'"
          :search-placeholder="isIndonesian ? 'Cari status…' : 'Search statuses…'"
          :searchable="false"
        />
      </label>
      <label class="block text-sm font-medium">
        {{ isIndonesian ? 'PIC internal / penanggung jawab' : 'Internal PIC / contract owner' }}
        <input v-model="form.owner_name" maxlength="160" :placeholder="isIndonesian ? 'Contoh: Budi Santoso (Tim Procurement)' : 'Example: Alex Morgan (Procurement)'" :aria-invalid="Boolean(validationErrors.owner_name)" class="form-input mt-1.5">
        <span v-if="validationErrors.owner_name" class="mt-1 block text-xs text-rose-700">{{ validationErrors.owner_name }}</span>
        <span class="mt-1 block text-xs font-normal text-slate-500">{{ isIndonesian ? 'Orang di kantor yang bertanggung jawab atas kontrak ini.' : 'The person in your organization responsible for this contract.' }}</span>
      </label>
      <label class="block text-sm font-medium sm:col-span-2">
        {{ isIndonesian ? 'Catatan tambahan (opsional)' : 'Additional notes (optional)' }}
        <textarea v-model="form.notes" rows="3" maxlength="2000" :placeholder="isIndonesian ? 'Informasi tambahan terkait ruang lingkup atau tindak lanjut kontrak.' : 'Additional scope or follow-up information for this contract.'" class="form-input mt-1.5" />
      </label>
    </div>
    <div class="flex justify-end gap-3 border-t border-slate-200 pt-5">
      <button type="button" class="button-secondary" @click="emit('cancel')">
        {{ isIndonesian ? 'Batal' : 'Cancel' }}
      </button>
      <button type="submit" class="button-primary" :disabled="busy || vendors.length === 0">
        {{ busy ? (busyLabel || (isIndonesian ? 'Menyimpan…' : 'Saving…')) : (isIndonesian ? 'Simpan kontrak' : 'Save contract') }}
      </button>
    </div>
  </form>
</template>
