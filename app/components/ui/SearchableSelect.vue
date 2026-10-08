<script setup lang="ts">
export interface SelectOption {
  value: string
  label: string
  description?: string
  searchText?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: SelectOption[]
  placeholder: string
  searchPlaceholder: string
  searchable?: boolean
  size?: 'default' | 'compact' | 'toolbar'
  disabled?: boolean
  invalid?: boolean
}>(), {
  disabled: false,
  invalid: false,
  searchable: true,
  size: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const search = ref('')
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const selectedOption = computed(() => props.options.find(option => option.value === props.modelValue))
const filteredOptions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return props.options
  return props.options.filter((option) => {
    const searchable = `${option.label} ${option.description ?? ''} ${option.searchText ?? ''}`.toLocaleLowerCase()
    return searchable.includes(query)
  })
})

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value && props.searchable) {
    search.value = ''
    nextTick(() => searchInput.value?.focus())
  }
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  search.value = ''
}

function onPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) isOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative" :class="size === 'default' ? 'mt-1.5' : ''">
    <button
      type="button"
      class="form-input flex items-center justify-between gap-3 text-left transition-colors hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      :class="[
        size === 'compact' ? 'h-12 px-4 py-2.5 text-sm font-medium' : '',
        size === 'toolbar' ? 'h-12 px-4 py-2.5 text-base font-medium' : '',
        size === 'default' ? 'font-normal' : '',
        invalid ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-100' : '',
      ]"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span v-if="selectedOption" class="min-w-0">
        <span class="block truncate font-medium text-slate-800">{{ selectedOption.label }}</span>
        <span v-if="selectedOption.description" class="block truncate text-xs text-slate-500">{{ selectedOption.description }}</span>
      </span>
      <span v-else class="truncate text-slate-400">{{ placeholder }}</span>
      <svg class="size-4 shrink-0 text-slate-500 transition-transform" :class="isOpen ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <div v-if="isOpen" class="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div v-if="searchable" class="border-b border-slate-100 p-2">
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            autocomplete="off"
            :placeholder="searchPlaceholder"
            class="form-input py-2 text-sm"
            @keydown.stop
          >
        </div>
        <ul role="listbox" :class="searchable ? 'max-h-64' : 'max-h-56'" class="overflow-y-auto p-1">
          <li v-for="option in filteredOptions" :key="option.value" role="option" :aria-selected="modelValue === option.value">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-indigo-50"
              :class="modelValue === option.value ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700'"
              @click="selectOption(option)"
            >
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{{ option.label }}</span>
                <span v-if="option.description" class="block truncate text-xs text-slate-500">{{ option.description }}</span>
              </span>
              <svg v-if="modelValue === option.value" class="size-4 shrink-0 text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003l-3.8-3.8a1 1 0 1 1 1.414-1.414l3.09 3.09 6.493-6.548a1 1 0 0 1 1.417-.005Z" clip-rule="evenodd" />
              </svg>
            </button>
          </li>
          <li v-if="!filteredOptions.length" class="px-3 py-5 text-center text-sm text-slate-500">
            {{ searchPlaceholder }}
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
