<script setup lang="ts">
import {useData} from 'vitepress'
import {computed} from 'vue'

import ExperimentalBadge from './ExperimentalBadge.vue'

// Replaces VitePress's `home-hero-info` slot to put the experimental badge
// next to the name. The content still comes from `hero` in index.md, and the
// styles below mirror the default hero's (those are scoped to its component).
const {frontmatter} = useData()
const hero = computed(
  () =>
    frontmatter.value.hero as {name?: string; text?: string; tagline?: string},
)
</script>

<template>
  <h1 class="heading">
    <span class="name-row">
      <span v-if="hero.name" class="name clip">{{ hero.name }}</span>
      <ExperimentalBadge />
    </span>
    <span v-if="hero.text" class="text">{{ hero.text }}</span>
  </h1>
  <p v-if="hero.tagline" class="tagline">{{ hero.tagline }}</p>
</template>

<style scoped>
.heading {
  display: flex;
  flex-direction: column;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 1rem;
}

.name,
.text {
  width: fit-content;
  max-width: 24.5rem;
  letter-spacing: -0.025rem;
  line-height: 1.25;
  font-size: 2rem;
  font-weight: 700;
  white-space: pre-wrap;
}

.name {
  color: var(--vp-home-hero-name-color);
}

.clip {
  background: var(--vp-home-hero-name-background);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: var(--vp-home-hero-name-color);
}

.tagline {
  padding-top: 0.5rem;
  max-width: 24.5rem;
  line-height: 1.5555556;
  font-size: 1.125rem;
  font-weight: 500;
  white-space: pre-wrap;
  color: var(--vp-c-text-2);
}

@media (min-width: 40rem) {
  .name,
  .text {
    max-width: 36rem;
    line-height: 1.1666667;
    font-size: 3rem;
  }

  .tagline {
    padding-top: 0.75rem;
    max-width: 36rem;
    line-height: 1.6;
    font-size: 1.25rem;
  }
}

@media (min-width: 60rem) {
  .name,
  .text {
    line-height: 1.1428571;
    font-size: 3.5rem;
  }

  .tagline {
    line-height: 1.5;
    font-size: 1.5rem;
  }
}
</style>
