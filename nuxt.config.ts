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
    strategy: 'prefix_except_default',
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
      title: 'Radarplot - Maritime Radar Plotting Aid',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        
        // Primary Meta Tags
        { name: 'title', content: 'Radarplot - Free Online Maritime Radar Plotting Tool' },
        { name: 'description', content: 'Free online radar plotting tool for maritime navigation. Calculate CPA, TCPA, true motion vectors, and plan collision avoidance maneuvers. Perfect for nautical training and COLREGs education.' },
        { name: 'keywords', content: 'radar plotting, maritime navigation, CPA calculator, TCPA, collision avoidance, COLREGs, nautical training, radar plot, relative motion, true motion, vessel tracking, marine navigation tool, seamanship, navigation aid' },
        { name: 'author', content: 'Based on Radarplot by Eddie C. Dost (brainaid GbR)' },
        { name: 'robots', content: 'index, follow' },
        
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Radarplot - Free Online Maritime Radar Plotting Tool' },
        { property: 'og:description', content: 'Free online radar plotting tool for maritime navigation. Calculate CPA, TCPA, and plan collision avoidance maneuvers.' },
        { property: 'og:image', content: 'https://radarplot.app/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:site_name', content: 'Radarplot' },
        
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Radarplot - Free Maritime Radar Plotting Tool' },
        { name: 'twitter:description', content: 'Free online radar plotting tool for maritime navigation and COLREGs training.' },
        { name: 'twitter:image', content: 'https://radarplot.app/og-image.png' },
        
        // Theme and App
        { name: 'theme-color', content: '#0f172a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Radarplot' },
        
        // Additional SEO
        { name: 'application-name', content: 'Radarplot' },
        { name: 'generator', content: 'Nuxt' }
      ],
      link: [
        // Favicon - SVG for modern browsers, PNG fallback
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
        
        // Fonts
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
        
        // Canonical (will be set dynamically per page if needed)
        { rel: 'canonical', href: 'https://radarplot.app' }
      ]
    }
  }
})
