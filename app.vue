<template>
  <UApp>
    <NuxtLoadingIndicator color="#14b8a6" />
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
// Locale-specific SEO meta tags
const { locale } = useI18n()

const seoConfig = computed(() => {
  const isGerman = locale.value === 'de'
  const baseUrl = 'https://radarplot.app'
  
  return {
    title: isGerman 
      ? 'Radarplot - Kostenloses Online Radar-Plotting-Tool' 
      : 'Radarplot - Free Online Maritime Radar Plotting Tool',
    description: isGerman
      ? 'Kostenloses Online-Tool für Radar-Plotting in der Schifffahrt. Berechne CPA, TCPA, wahre Bewegungsvektoren und plane Ausweichmanöver. Perfekt für nautische Ausbildung und KVR-Schulung.'
      : 'Free online radar plotting tool for maritime navigation. Calculate CPA, TCPA, true motion vectors, and plan collision avoidance maneuvers. Perfect for nautical training and COLREGs education.',
    keywords: isGerman
      ? 'Radar-Plotting, Schifffahrt, Navigation, CPA-Rechner, TCPA, Kollisionsverhütung, KVR, nautische Ausbildung, Radar Plot, relative Bewegung, wahre Bewegung, Schiffsortung, Marine-Navigation, Seemannschaft, Navigationshilfe'
      : 'radar plotting, maritime navigation, CPA calculator, TCPA, collision avoidance, COLREGs, nautical training, radar plot, relative motion, true motion, vessel tracking, marine navigation tool, seamanship, navigation aid',
    ogImage: isGerman ? `${baseUrl}/og-image-de.png` : `${baseUrl}/og-image.png`,
    url: isGerman ? `${baseUrl}/de` : baseUrl,
    locale: isGerman ? 'de_DE' : 'en_US',
    alternateLocale: isGerman ? 'en_US' : 'de_DE',
    lang: locale.value
  }
})

useHead({
  htmlAttrs: {
    lang: () => seoConfig.value.lang
  },
  title: () => seoConfig.value.title,
  meta: [
    // Primary meta
    { name: 'description', content: () => seoConfig.value.description },
    { name: 'keywords', content: () => seoConfig.value.keywords },
    
    // Open Graph
    { property: 'og:title', content: () => seoConfig.value.title },
    { property: 'og:description', content: () => seoConfig.value.description },
    { property: 'og:image', content: () => seoConfig.value.ogImage },
    { property: 'og:url', content: () => seoConfig.value.url },
    { property: 'og:locale', content: () => seoConfig.value.locale },
    { property: 'og:locale:alternate', content: () => seoConfig.value.alternateLocale },
    
    // Twitter
    { name: 'twitter:title', content: () => seoConfig.value.title },
    { name: 'twitter:description', content: () => seoConfig.value.description },
    { name: 'twitter:image', content: () => seoConfig.value.ogImage }
  ],
  link: [
    // Canonical URL
    { rel: 'canonical', href: () => seoConfig.value.url },
    // Alternate language links (hreflang)
    { rel: 'alternate', hreflang: 'en', href: 'https://radarplot.app' },
    { rel: 'alternate', hreflang: 'de', href: 'https://radarplot.app/de' },
    { rel: 'alternate', hreflang: 'x-default', href: 'https://radarplot.app' }
  ]
})
</script>
