<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <div class="flex items-center justify-between px-4 py-3 lg:px-6">
        <!-- Logo & Title -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <UIcon name="i-heroicons-signal" class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              {{ $t('app.title') }}
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {{ $t('app.subtitle') }}
            </p>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- File Actions -->
          <UButtonGroup class="hidden md:flex">
            <UButton
              icon="i-heroicons-document-plus"
              variant="ghost"
              color="neutral"
              @click="handleNew"
            >
              {{ $t('menu.new') }}
            </UButton>
            <UButton
              icon="i-heroicons-folder-open"
              variant="ghost"
              color="neutral"
              @click="handleOpen"
            >
              {{ $t('menu.open') }}
            </UButton>
            <UButton
              icon="i-heroicons-arrow-down-tray"
              variant="ghost"
              color="neutral"
              @click="handleSave"
            >
              {{ $t('menu.save') }}
            </UButton>
          </UButtonGroup>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden md:block" />
          
          <!-- Language Switcher -->
          <UButtonGroup>
            <UButton
              v-for="loc in availableLocales"
              :key="loc.code"
              :variant="locale === loc.code ? 'solid' : 'ghost'"
              :color="locale === loc.code ? 'primary' : 'neutral'"
              @click="setLocale(loc.code)"
              class="!px-3"
            >
              {{ loc.code.toUpperCase() }}
            </UButton>
          </UButtonGroup>
          
          <!-- Theme Toggle -->
          <UButton
            :icon="colorMode === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            variant="ghost"
            color="neutral"
            square
            @click="toggleColorMode"
          />
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex-1 p-3 lg:p-4">
      <div class="flex flex-col lg:flex-row gap-3 lg:gap-4 h-full">
        <!-- Left Sidebar - Controls -->
        <aside class="w-full lg:w-72 xl:w-80 shrink-0">
          <RadarControls />
        </aside>
        
        <!-- Center - Canvas -->
        <section class="flex-1 min-h-[400px] lg:min-h-0 flex items-start justify-center">
          <UCard class="aspect-square w-full max-w-full max-h-full overflow-hidden" :ui="{ body: { padding: 'p-0', base: 'h-full' } }">
            <RadarCanvas ref="canvasRef" />
          </UCard>
        </section>
        
        <!-- Right Sidebar - Target Data & Maneuver -->
        <aside class="w-full lg:w-80 xl:w-96 shrink-0 space-y-3 lg:space-y-4">
          <!-- Target Data Card -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ $t('radar.targetData') }}</span>
                <USelect
                  v-model="selectedTargetIndex"
                  :items="targetOptions"
                  value-attribute="value"
                  option-attribute="label"
                  class="w-32"
                />
              </div>
            </template>

            <!-- Target Observations & Results -->
            <RadarTargetPanel :target-index="selectedTargetIndex" />
          </UCard>
          
          <!-- Maneuver Planning Card (Separate) -->
          <UCard>
            <template #header>
              <span class="font-semibold">{{ $t('maneuver.title') }}</span>
            </template>
            <ManeuverPanel :target-index="selectedTargetIndex" />
          </UCard>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRadarStore } from '~/stores/radarStore'
import RadarTargetPanel from '~/components/radar/TargetPanel.vue'
import ManeuverPanel from '~/components/radar/ManeuverPanel.vue'
import { TARGET_LETTERS } from '~/utils/radarConstants'

const { locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const radarStore = useRadarStore()
const canvasRef = ref(null)
const selectedTargetIndex = ref(0)

// Available locales for language switcher
const availableLocales = computed(() => 
  (locales.value as any[]).map(l => ({
    code: l.code || l,
    name: l.name || l
  }))
)

// Toggle color mode
function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Target selection options
const targetOptions = TARGET_LETTERS.map((letter, index) => ({
  value: index,
  label: `Target ${letter}`
}))

// File actions
function handleNew() {
  if (radarStore.modified) {
    if (!confirm('Discard unsaved changes?')) return
  }
  radarStore.resetPlot()
}

function handleOpen() {
  console.log('Open file')
}

function handleSave() {
  console.log('Save file')
}

// Set page meta
useHead({
  title: 'Radarplot - Maritime Navigation Aid',
  meta: [
    { name: 'description', content: 'Nautical Radar Plotting Aid for Collision Avoidance' }
  ]
})
</script>
