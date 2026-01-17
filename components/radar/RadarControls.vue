<template>
  <div class="space-y-3 lg:space-y-4">
    <!-- Orientation Card -->
    <UCard>
      <template #header>
        <span class="font-semibold">{{ $t('radar.orientation') }}</span>
      </template>

      <div class="grid grid-cols-2 gap-2">
        <!-- Orientation Toggle -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {{ $t('radar.orientation') }}
          </label>
          <UButtonGroup size="sm" class="w-full">
            <UButton
              :color="orientation === 'north' ? 'primary' : 'neutral'"
              :variant="orientation === 'north' ? 'solid' : 'outline'"
              class="flex-1"
              @click="orientation = 'north'"
            >
              {{ $t('radar.northUpShort') }}
            </UButton>
            <UButton
              :color="orientation === 'course' ? 'primary' : 'neutral'"
              :variant="orientation === 'course' ? 'solid' : 'outline'"
              class="flex-1"
              @click="orientation = 'course'"
            >
              {{ $t('radar.courseUpShort') }}
            </UButton>
          </UButtonGroup>
        </div>
        
        <!-- Range Selection -->
        <UFormField :label="$t('radar.range')">
          <USelect
            v-model="rangeIndex"
            :items="rangeOptions"
            value-attribute="value"
            option-attribute="label"
            size="sm"
            class="w-full"
          />
        </UFormField>
        
        <!-- Show Heading Toggle - spans full width -->
        <div class="col-span-2 pt-1">
          <UCheckbox
            v-model="showHeading"
            :label="$t('radar.showHeading')"
          />
        </div>
      </div>
    </UCard>
    
    <!-- Own Ship Panel -->
    <UCard>
      <template #header>
        <span class="font-semibold">{{ $t('radar.ownShip') }}</span>
      </template>

      <div class="grid grid-cols-2 gap-2">
        <!-- Course Input -->
        <UFormField :label="$t('radar.course')">
          <UInput
            v-model="ownCourseInput"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="3"
            size="sm"
            class="font-mono w-full"
            @blur="onOwnCourseBlur"
            @focus="selectAll"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">°</span>
            </template>
          </UInput>
        </UFormField>
        
        <!-- Speed Input -->
        <UFormField :label="$t('radar.speed')">
          <UInput
            v-model.number="ownSpeed"
            type="number"
            :min="0"
            :max="50"
            step="0.1"
            size="sm"
            class="font-mono w-full"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">kn</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRadarStore } from '~/stores/radarStore'
import { RADAR_RANGES } from '~/utils/radarConstants'

const radarStore = useRadarStore()

// Orientation model
const orientation = computed({
  get: () => radarStore.northUp ? 'north' : 'course',
  set: (value: string) => radarStore.setOrientation(value === 'north')
})

// Range options
const rangeOptions = computed(() => 
  RADAR_RANGES.map((range, index) => ({
    value: index,
    label: range.digits > 0
      ? `${range.range.toFixed(range.digits)} nm`
      : `${range.range} nm`
  }))
)

// Range index model
const rangeIndex = computed({
  get: () => radarStore.rangeIndex,
  set: (value: number) => radarStore.setRangeIndex(value)
})

// Show heading model
const showHeading = computed({
  get: () => radarStore.showHeading,
  set: () => radarStore.toggleHeading()
})

// Helper to format degrees as 3-digit string with leading zeros
const formatDegrees = (value: number) => String(Math.round(value) % 360).padStart(3, '0')
const parseDegrees = (value: string) => {
  const num = parseInt(value, 10)
  return isNaN(num) ? 0 : Math.max(0, Math.min(359, num))
}

// Select all text on focus for easy replacement
const selectAll = (event: FocusEvent) => {
  const input = event.target as HTMLInputElement
  input.select()
}

// Own course - local ref for typing, format on blur
const ownCourseInput = ref(formatDegrees(radarStore.ownCourse))

// Watch for external changes
watch(() => radarStore.ownCourse, (val) => {
  ownCourseInput.value = formatDegrees(val)
}, { immediate: true })

// Format and save on blur
function onOwnCourseBlur() {
  const value = parseDegrees(ownCourseInput.value)
  radarStore.setOwnCourse(value)
  ownCourseInput.value = formatDegrees(value)
}

// Own speed model
const ownSpeed = computed({
  get: () => radarStore.ownSpeed,
  set: (value: number) => radarStore.setOwnSpeed(Math.max(0, value))
})
</script>
