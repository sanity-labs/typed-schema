<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue'

const POPOVER_WIDTH = 320
const VIEWPORT_MARGIN = 16

const open = ref(false)
const root = ref<HTMLElement>()
// shifts the popover left when it would run past the right edge
const offset = ref(0)

function toggle() {
  if (!open.value && root.value) {
    const width = Math.min(
      POPOVER_WIDTH,
      window.innerWidth - VIEWPORT_MARGIN * 2,
    )
    const {left} = root.value.getBoundingClientRect()
    offset.value = Math.min(
      0,
      window.innerWidth - VIEWPORT_MARGIN - width - left,
    )
  }
  open.value = !open.value
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) {
    open.value = false
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <span ref="root" class="experimental">
    <button
      type="button"
      class="badge"
      :aria-expanded="open"
      aria-controls="experimental-popover"
      @click="toggle"
    >
      <span aria-hidden="true">🧪</span>
      experimental
    </button>
    <span
      v-if="open"
      id="experimental-popover"
      class="popover"
      role="dialog"
      aria-label="Experimental"
      :style="{left: `${offset}px`}"
    >
      This is a Sanity Labs experiment and not an official way of declaring
      Sanity schemas. Read
      <a
        href="https://github.com/sanity-labs#what-to-expect"
        target="_blank"
        rel="noreferrer"
        >what to expect from a Sanity Labs project</a
      >.
      <span
        >If you like the idea, consider
        <a
          href="https://github.com/sanity-labs/typed-schema"
          target="_blank"
          rel="noreferrer"
          >giving the repo a star ⭐️</a
        >, or if you try it,
        <a
          href="https://github.com/sanity-labs/typed-schema/issues"
          target="_blank"
          rel="noreferrer"
          >open an issue</a
        >
        with what worked and what didn’t.
      </span>
    </span>
  </span>
</template>

<style scoped>
.experimental {
  position: relative;
  display: inline-flex;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--vp-c-warning-2);
  border-radius: 6px;
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 20px;
  transform: rotate(-6deg);
  transition: transform 0.15s;
}

.badge:hover,
.badge[aria-expanded='true'] {
  transform: rotate(0deg);
}

.popover {
  position: absolute;
  top: calc(100% + 10px);
  z-index: 20;
  width: min(320px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 1.5;
  white-space: normal;
}

.popover a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}
</style>
