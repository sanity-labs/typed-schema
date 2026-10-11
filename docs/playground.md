---
layout: page
title: Playground
sidebar: false
---

<script setup>
import {defineAsyncComponent} from 'vue'

const Playground = defineAsyncComponent(
  () => import('./.vitepress/playground/Playground.vue'),
)
</script>

<div class="playground-page">
  <ClientOnly>
    <Playground />
  </ClientOnly>
</div>

<style>
.playground-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--vp-nav-height));
  padding: 16px 24px 24px;
}

@media (max-width: 960px) {
  .playground-page {
    height: auto;
    padding: 12px 16px 24px;
  }
}
</style>
