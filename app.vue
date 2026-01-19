<template>
  <UApp>
    <NuxtLoadingIndicator color="#14b8a6" />
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
// Locale-specific SEO meta tags
const { locale, t } = useI18n()

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
    ogImage: isGerman ? `${baseUrl}/og-image-de.png` : `${baseUrl}/og-image.png`,
    lang: locale.value
  }
})

useHead({
  htmlAttrs: {
    lang: () => seoConfig.value.lang
  },
  title: () => seoConfig.value.title,
  meta: [
    { name: 'description', content: () => seoConfig.value.description },
    { property: 'og:title', content: () => seoConfig.value.title },
    { property: 'og:description', content: () => seoConfig.value.description },
    { property: 'og:image', content: () => seoConfig.value.ogImage },
    { name: 'twitter:title', content: () => seoConfig.value.title },
    { name: 'twitter:description', content: () => seoConfig.value.description },
    { name: 'twitter:image', content: () => seoConfig.value.ogImage }
  ]
})
</script>
