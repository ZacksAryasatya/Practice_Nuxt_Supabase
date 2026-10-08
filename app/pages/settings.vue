<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { useSupabaseAuth } from '../composables/useSupabaseAuth'

definePageMeta({ layout: 'admin' })

const { locale, t } = useAppLocale()
const { supabase } = useSupabaseAuth()
const isIndonesian = computed(() => locale.value === 'id')
const pageTitle = computed(() => t('settings'))
const pageDescription = computed(() => t('settingsDescription'))
const noticeDays = ref(90)
const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const validationMessage = ref('')

async function loadSettings() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'contract_expiry_notice_days')
      .single()
    if (error) throw error
    noticeDays.value = Number(data.value)
  } catch (error) {
    console.error('Settings load failed:', error)
    errorMessage.value = isIndonesian.value ? 'Pengaturan gagal dimuat.' : 'Could not load settings.'
  } finally {
    isLoading.value = false
  }
}

async function saveSettings() {
  successMessage.value = ''
  errorMessage.value = ''
  validationMessage.value = ''

  if (!Number.isInteger(noticeDays.value) || noticeDays.value < 1 || noticeDays.value > 3650) {
    validationMessage.value = isIndonesian.value
      ? 'Masukkan bilangan bulat antara 1 dan 3650 hari.'
      : 'Enter a whole number between 1 and 3650 days.'
    return
  }

  isSaving.value = true
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const { error } = await supabase
      .from('app_settings')
      .update({ value: noticeDays.value, updated_by: authData.user.id })
      .eq('key', 'contract_expiry_notice_days')
    if (error) throw error

    successMessage.value = t('settingsSaved')
  } catch (error) {
    console.error('Settings update failed:', error)
    errorMessage.value = t('settingsSaveError')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h2 class="text-2xl font-bold">{{ pageTitle }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ pageDescription }}</p>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
        <div class="flex items-center gap-3">
          <span class="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800" aria-hidden="true">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </span>
          <div>
            <h3 class="font-semibold text-slate-900">{{ t('contractReminder') }}</h3>
            <p class="mt-0.5 text-sm text-slate-500">{{ t('contractReminderHelp') }}</p>
          </div>
        </div>
      </div>

      <form class="space-y-5 p-6" @submit.prevent="saveSettings">
        <div>
          <label for="notice-days" class="block text-sm font-medium text-slate-800">{{ t('reminderDays') }}</label>
          <div class="mt-1.5 flex max-w-sm items-center gap-3">
            <input
              id="notice-days"
              v-model.number="noticeDays"
              type="number"
              min="1"
              max="3650"
              step="1"
              :disabled="isLoading || isSaving"
              :aria-invalid="Boolean(validationMessage)"
              class="form-input tabular-nums"
            >
            <span class="shrink-0 text-sm text-slate-500">{{ isIndonesian ? 'hari' : 'days' }}</span>
          </div>
          <p class="mt-1.5 text-xs text-slate-500">{{ t('reminderRange') }}</p>
          <p v-if="validationMessage" role="alert" class="mt-2 text-sm text-rose-700">{{ validationMessage }}</p>
        </div>

        <p v-if="errorMessage" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{{ errorMessage }}</p>
        <p v-if="successMessage" role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{{ successMessage }}</p>

        <div class="flex justify-end border-t border-slate-200 pt-5">
          <button type="submit" class="button-primary" :disabled="isLoading || isSaving">
            {{ isLoading ? (isIndonesian ? 'Memuat…' : 'Loading…') : isSaving ? (isIndonesian ? 'Menyimpan…' : 'Saving…') : t('saveSettings') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
