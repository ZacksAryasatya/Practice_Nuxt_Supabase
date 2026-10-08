export const translations = {
  id: {
    title: 'Administrasi Vendor & Kontrak',
    language: 'Pilih bahasa',
    foundation: 'Fondasi aplikasi',
    welcome: 'Project siap dikembangkan',
    description: 'Fondasi Nuxt, Tailwind CSS, dan konfigurasi Supabase sudah disiapkan. Berikutnya implementasikan autentikasi dan CRUD dengan kebijakan akses yang benar.',
    rest: 'REST API untuk CRUD',
    rls: 'Database RLS',
    storage: 'Supabase Storage',
    realtime: 'Supabase Realtime',
    signOut: 'Keluar',
    signingOut: 'Keluar…',
    dashboard: 'Dashboard',
    dashboardDescription: 'Ringkasan vendor dan pemantauan kontrak.',
    vendors: 'Vendor',
    contracts: 'Kontrak',
    settings: 'Pengaturan',
    settingsDescription: 'Atur kapan kontrak aktif ditandai untuk ditinjau.',
    contractReminder: 'Pengingat kontrak akan berakhir',
    contractReminderHelp: 'Kontrak aktif akan muncul di dashboard jika tanggal akhirnya berada dalam jumlah hari ini.',
    reminderDays: 'Jumlah hari sebelum tanggal berakhir',
    reminderRange: 'Masukkan bilangan bulat antara 1 dan 3650 hari.',
    saveSettings: 'Simpan pengaturan',
    settingsSaved: 'Pengaturan berhasil disimpan.',
    settingsSaveError: 'Pengaturan gagal disimpan. Coba lagi.',
    activeContracts: 'Kontrak aktif',
    expiringContracts: 'Segera berakhir',
    withinNoticePeriod: 'Dalam periode pengingat',
    upcomingContracts: 'Kontrak yang perlu ditinjau',
    noUpcomingContracts: 'Tidak ada kontrak dalam periode pengingat.',
    viewAll: 'Lihat semua',
    manageVendors: 'Kelola vendor',
    manageContracts: 'Kelola kontrak',
    expiryWindow: ({ days }: { days: number }) => `Periode pengingat: ${days} hari`,
  },
  en: {
    title: 'Vendor & Contract Administration',
    language: 'Select language',
    foundation: 'Application foundation',
    welcome: 'Project foundation is ready',
    description: 'The Nuxt, Tailwind CSS, and Supabase foundation is in place. Next, implement authentication and CRUD with the correct access policies.',
    rest: 'REST API for CRUD',
    rls: 'Database RLS',
    storage: 'Supabase Storage',
    realtime: 'Supabase Realtime',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    dashboard: 'Dashboard',
    dashboardDescription: 'Vendor overview and contract monitoring.',
    vendors: 'Vendors',
    contracts: 'Contracts',
    settings: 'Settings',
    settingsDescription: 'Configure when active contracts are flagged for review.',
    contractReminder: 'Contract expiry reminder',
    contractReminderHelp: 'Active contracts appear on the dashboard when their end date falls within this number of days.',
    reminderDays: 'Days before contract end date',
    reminderRange: 'Enter a whole number between 1 and 3650 days.',
    saveSettings: 'Save settings',
    settingsSaved: 'Settings saved successfully.',
    settingsSaveError: 'Could not save settings. Try again.',
    activeContracts: 'Active contracts',
    expiringContracts: 'Expiring soon',
    withinNoticePeriod: 'Within notice period',
    upcomingContracts: 'Contracts to review',
    noUpcomingContracts: 'No contracts within the notice period.',
    viewAll: 'View all',
    manageVendors: 'Manage vendors',
    manageContracts: 'Manage contracts',
    expiryWindow: ({ days }: { days: number }) => `Notice period: ${days} days`,
  },
} as const

type Locale = keyof typeof translations
type TranslationKey = keyof typeof translations.id

export function useAppLocale() {
  const locale = useCookie<Locale>('app-locale', {
    default: () => 'id',
    sameSite: 'lax',
  })

  function t(key: TranslationKey, args?: { days: number }) {
    const value = translations[locale.value][key]
    return typeof value === 'function'
      ? (value as (args: { days: number }) => string)(args ?? { days: 0 })
      : value
  }

  return { locale, t }
}
