import '@shikijs/vitepress-twoslash/style.css'
import './style.css'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import {type Theme} from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import {h} from 'vue'

import HomeHeroInfo from './HomeHeroInfo.vue'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'home-hero-info': () => h(HomeHeroInfo),
    }),
  enhanceApp({app}) {
    app.use(TwoslashFloatingVue)
  },
} satisfies Theme
