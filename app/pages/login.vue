<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { useSupabaseAuth } from '../composables/useSupabaseAuth'

definePageMeta({
  layout: false,
})

const route = useRoute()
const { supabase, user } = useSupabaseAuth()
const { locale, t } = useAppLocale()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const messages = computed(() => locale.value === 'id'
  ? {
      title: 'Masuk ke akun admin',
      description: 'Gunakan akun yang dibuat oleh administrator Supabase.',
      email: 'Email',
      password: 'Kata sandi',
      submit: 'Masuk',
      submitting: 'Memeriksa…',
      genericError: 'Email atau kata sandi tidak valid.',
      configError: 'Konfigurasi Supabase belum tersedia.',
      unauthorized: 'Akun ini belum terdaftar sebagai admin aplikasi.',
    }
  : {
      title: 'Sign in to admin account',
      description: 'Use an account created by the Supabase administrator.',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      submitting: 'Checking…',
      genericError: 'Email or password is invalid.',
      configError: 'Supabase configuration is not available.',
      unauthorized: 'This account is not registered as an application admin.',
    })

onMounted(async () => {
  if (route.query.error === 'not-authorized') {
    errorMessage.value = messages.value.unauthorized
    return
  }

  if (user.value) {
    await redirectAfterLogin()
  }
})

watch(locale, () => {
  if (errorMessage.value) {
    errorMessage.value = messages.value.genericError
  }
})

async function redirectAfterLogin() {
  const requestedPath = typeof route.query.redirect === 'string'
    ? route.query.redirect
    : '/'

  const safePath = requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/'

  await navigateTo(safePath)
}

async function signIn() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })

    if (error) {
      errorMessage.value = messages.value.genericError
      return
    }

    const { data: isAdmin, error: authorizationError } = await supabase.rpc('is_current_user_admin')

    if (authorizationError || isAdmin !== true) {
      await supabase.auth.signOut()
      errorMessage.value = messages.value.unauthorized
      return
    }

    await redirectAfterLogin()
  } catch {
    errorMessage.value = messages.value.genericError
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-900">
    <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-600">
            Vendor & Contract Management
          </p>
          <h1 class="mt-5 text-2xl font-bold tracking-tight">{{ messages.title }}</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ messages.description }}</p>
        </div>
        <label class="sr-only" for="locale">{{ t('language') }}</label>
        <select
          id="locale"
          v-model="locale"
          class="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <option value="id">ID</option>
          <option value="en">EN</option>
        </select>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="signIn">
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium">{{ messages.email }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          >
        </div>
        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium">{{ messages.password }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          >
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {{ isSubmitting ? messages.submitting : messages.submit }}
        </button>
      </form>
    </section>
  </main>
</template>
