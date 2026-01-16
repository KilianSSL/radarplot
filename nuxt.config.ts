// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt'
  ],

  css: [
    '~/assets/css/main.css'
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' }
    ],
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts',
    bundle: {
      optimizeTranslationDirective: false
    }
  },

  experimental: {
    appManifest: false
  },
  
  app: {
    head: {
      title: 'Radarplot - Maritime Navigation Aid',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Nautical Radar Plotting Aid for Collision Avoidance and Maritime Navigation' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' }
      ]
    }
  }
})
