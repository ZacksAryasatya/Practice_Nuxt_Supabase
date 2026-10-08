<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  danger?: boolean
  destructive?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}

watch(() => props.open, (open) => {
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-120 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="emit('cancel')">
        <Transition
          appear
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-3 scale-95 opacity-0"
          enter-to-class="translate-y-0 scale-100 opacity-100"
          leave-active-class="transition duration-120 ease-in"
          leave-from-class="translate-y-0 scale-100 opacity-100"
          leave-to-class="translate-y-2 scale-95 opacity-0"
        >
          <section role="dialog" aria-modal="true" :aria-label="title" class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex gap-4">
              <div class="grid size-11 shrink-0 place-items-center rounded-full" :class="danger ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'" aria-hidden="true">!</div>
              <div>
                <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ message }}</p>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="button-secondary" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</button>
              <button type="button" class="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60" :class="danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'" :disabled="busy" @click="emit('confirm')">
                {{ busy ? (destructive ? (cancelLabel === 'Batal' ? 'Menghapus…' : 'Deleting…') : (cancelLabel === 'Batal' ? 'Menyimpan…' : 'Saving…')) : confirmLabel }}
              </button>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
