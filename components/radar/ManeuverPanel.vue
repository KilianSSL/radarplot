<template>
  <div class="space-y-4">
    <!-- Maneuver Point -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
        {{ $t('maneuver.maneuverPoint') }}
      </label>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <UButtonGroup size="sm" class="w-full">
            <UButton
              :color="maneuverByTime ? 'primary' : 'neutral'"
              :variant="maneuverByTime ? 'solid' : 'outline'"
              class="flex-1"
              @click="maneuverByTime = true"
            >
              {{ $t('maneuver.byTimeShort') }}
            </UButton>
            <UButton
              :color="!maneuverByTime ? 'primary' : 'neutral'"
              :variant="!maneuverByTime ? 'solid' : 'outline'"
              class="flex-1"
              @click="maneuverByTime = false"
            >
              {{ $t('maneuver.byDistanceShort') }}
            </UButton>
          </UButtonGroup>
        </div>
        
        <div>
          <UInput
            v-if="maneuverByTime"
            v-model="maneuverTime"
            type="time"
            placeholder="HH:MM"
            size="sm"
            class="font-mono w-full"
          />
          <UInput
            v-else
            v-model.number="maneuverDistance"
            type="number"
            :min="0"
            step="0.1"
            size="sm"
            class="font-mono w-full"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">nm</span>
            </template>
          </UInput>
        </div>
      </div>
    </div>

    <!-- Maneuver Type -->
    <div class="space-y-2">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
        {{ $t('maneuver.type') }}
      </label>
      <USelect
        v-model="maneuverType"
        :items="maneuverTypeOptions"
        value-attribute="value"
        option-attribute="label"
        size="sm"
        class="w-full"
      />
    </div>

    <!-- Goal Input: CPA and Course/Speed with toggle -->
    <!-- Row 1: CPA input -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <UButton
          size="xs"
          :color="maneuverByCPA ? 'primary' : 'neutral'"
          :variant="maneuverByCPA ? 'solid' : 'ghost'"
          class="shrink-0"
          @click="maneuverByCPA = true"
        >
          {{ $t('maneuver.byCPAShort') }}
        </UButton>
        <div class="flex-1">
          <UInput
            v-model.number="desiredCPA"
            type="number"
            :min="0"
            step="0.1"
            size="sm"
            class="font-mono w-full"
            :disabled="!maneuverByCPA"
            :class="{ 'opacity-60': !maneuverByCPA }"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">nm</span>
            </template>
          </UInput>
        </div>
      </div>
      
      <!-- Row 2: Course/Speed input -->
      <div class="flex items-center gap-2">
        <UButton
          size="xs"
          :color="!maneuverByCPA ? 'primary' : 'neutral'"
          :variant="!maneuverByCPA ? 'solid' : 'ghost'"
          class="shrink-0"
          @click="maneuverByCPA = false"
        >
          {{ isCourseChange ? $t('maneuver.byCourseShort') : $t('maneuver.bySpeedShort') }}
        </UButton>
        <div class="flex-1">
          <UInput
            v-if="isCourseChange"
            v-model="courseInput"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="3"
            size="sm"
            class="font-mono w-full"
            :disabled="maneuverByCPA"
            :class="{ 'opacity-60': maneuverByCPA }"
            @blur="onCourseBlur"
            @focus="selectAll"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">°</span>
            </template>
          </UInput>
          <UInput
            v-else
            v-model.number="courseOrSpeedValue"
            type="number"
            :min="0"
            step="0.1"
            size="sm"
            class="font-mono w-full"
            :disabled="maneuverByCPA"
            :class="{ 'opacity-60': maneuverByCPA }"
          >
            <template #trailing>
              <span class="text-sm text-gray-500 dark:text-gray-400">kn</span>
            </template>
          </UInput>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="hasManeuverResults" class="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {{ $t('maneuver.results') }}
      </div>
      
      <div class="space-y-1.5 text-sm">
        <!-- Course/Speed change amount (delta) -->
        <RadarResultRow
          v-if="r.courseChange !== undefined && isCourseChange"
          :label="$t('results.courseChangeShort')"
          :tooltip="$t('results.courseChangeTooltip')"
          :value="Math.abs(r.courseChange)"
          format="bearing"
          :unit="r.courseChange > 0 ? '° Stb' : '° Bb'"
          label-class="text-gray-500 dark:text-gray-500"
          :value-class="r.courseChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'"
        />
        
        <RadarResultRow
          v-if="r.requiredSpeed !== undefined && !isCourseChange"
          :label="$t('results.speedChangeShort')"
          :tooltip="$t('results.speedChangeTooltip')"
          :value="Math.round((radarStore.ownSpeed - r.requiredSpeed) * 10) / 10"
          :unit="(radarStore.ownSpeed - r.requiredSpeed) > 0 ? 'kn ↓' : 'kn ↑'"
          label-class="text-gray-500 dark:text-gray-500"
          :value-class="(radarStore.ownSpeed - r.requiredSpeed) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'"
        />
        
        <!-- New relative motion -->
        <RadarResultRow
          v-if="r.newKBr !== undefined"
          :label="$t('results.drmShort')"
          :tooltip="$t('results.drmTooltip')"
          :value="r.newKBr"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.newVBr !== undefined"
          :label="$t('results.srmShort')"
          :tooltip="$t('results.srmTooltip')"
          :value="r.newVBr"
          unit="kn"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.delta !== undefined"
          :label="$t('results.deltaShort')"
          :tooltip="$t('results.deltaTooltip')"
          :value="r.delta"
          format="delta"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.newRaSP !== undefined"
          :label="$t('results.newRaSPShort')"
          :tooltip="$t('results.newRaSPTooltip')"
          :value="r.newRaSP"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <!-- Separator -->
        <div class="border-t border-gray-100 dark:border-gray-800 my-2" />
        
        <!-- New CPA data -->
        <RadarResultRow
          v-if="r.newCPA !== undefined"
          :label="$t('results.cpaShort')"
          :tooltip="$t('results.cpaTooltip')"
          :value="r.newCPA"
          unit="nm"
          label-class="text-gray-500 dark:text-gray-500"
          :value-class="cpaResultClass"
        />
        
        <RadarResultRow
          v-if="r.newPCPA !== undefined"
          :label="$t('results.pcpaShort')"
          :tooltip="$t('results.pcpaTooltip')"
          :value="r.newPCPA"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.newSPCPA !== undefined"
          :label="$t('results.spcpaShort')"
          :tooltip="$t('results.spcpaTooltip')"
          :value="r.newSPCPA"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.newTCPA !== undefined"
          :label="$t('results.tcpaShort')"
          :tooltip="$t('results.tcpaTooltip')"
          :value="r.newTCPA"
          unit="min"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="r.newTCPA_clock !== undefined && r.newTCPA_clock > 0"
          :label="$t('results.tCPAShort')"
          :tooltip="$t('results.tCPATooltip')"
          :value="r.newTCPA_clock"
          format="clock"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <!-- Bow Crossing data -->
        <template v-if="r.newHaveCrossing">
          <RadarResultRow
            :label="$t('results.bcrShort')"
            :tooltip="$t('results.bcrTooltip')"
            :value="r.newBCR"
            unit="nm"
            label-class="text-gray-500 dark:text-gray-500"
            :value-class="r.newBCR && r.newBCR < 0 ? 'text-gray-500' : 'text-gray-900 dark:text-white'"
          />
          
          <RadarResultRow
            v-if="r.newBCT !== undefined"
            :label="$t('results.bctShort')"
            :tooltip="$t('results.bctTooltip')"
            :value="r.newBCT"
            unit="min"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            v-if="r.newBCt !== undefined && r.newBCt > 0"
            :label="$t('results.bCtShort')"
            :tooltip="$t('results.bCtTooltip')"
            :value="r.newBCt"
            format="clock"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
        </template>
        
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRadarStore } from '~/stores/radarStore'
import { timeStringToMinutes, minutesToTimeString } from '~/utils/radarConstants'

const props = defineProps<{
  targetIndex: number
}>()

const { t } = useI18n()
const radarStore = useRadarStore()

// Sync the store's maneuverTargetIndex with the prop
watch(() => props.targetIndex, (newIndex) => {
  if (radarStore.maneuverTargetIndex !== newIndex) {
    radarStore.setManeuverTarget(newIndex)
  }
}, { immediate: true })

// Shorthand for maneuver result
const r = computed(() => radarStore.maneuverResult || {})

// Maneuver type options
const maneuverTypeOptions = computed(() => [
  { value: 'course', label: t('maneuver.courseChange') },
  { value: 'speed', label: t('maneuver.speedChange') }
])

// Global maneuver settings - read/write from store
const maneuverByTime = computed({
  get: () => radarStore.maneuverByTime,
  set: (value: boolean) => radarStore.setManeuverByTime(value)
})

const maneuverTime = computed({
  get: () => minutesToTimeString(radarStore.maneuverTime),
  set: (value: string) => radarStore.setManeuverTime(timeStringToMinutes(value))
})

const maneuverDistance = computed({
  get: () => radarStore.maneuverDistance,
  set: (value: number) => radarStore.setManeuverDistance(value)
})

const maneuverType = computed({
  get: () => radarStore.maneuverType,
  set: (value: 'course' | 'speed') => radarStore.setManeuverType(value)
})

const maneuverByCPA = computed({
  get: () => radarStore.maneuverByCPA,
  set: (value: boolean) => radarStore.setManeuverByCPA(value)
})

// CPA value that shows user input when maneuverByCPA is true,
// or calculated result when maneuverByCPA is false
const desiredCPA = computed({
  get: () => {
    if (radarStore.maneuverByCPA) {
      // User input mode
      return radarStore.desiredCPA
    } else {
      // Show calculated CPA from the maneuver result
      return radarStore.maneuverResult?.newCPA ?? radarStore.desiredCPA
    }
  },
  set: (value: number) => radarStore.setDesiredCPA(value)
})

const newCourse = computed({
  get: () => radarStore.newCourse,
  set: (value: number) => radarStore.setNewCourse(value)
})

const newSpeed = computed({
  get: () => radarStore.newSpeed,
  set: (value: number) => radarStore.setNewSpeed(value)
})

// Helper computeds
const isCourseChange = computed(() => radarStore.maneuverType === 'course')

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

// Local ref for course input - allows typing without immediate formatting
const courseInput = ref(formatDegrees(radarStore.newCourse))

// Watch for external changes (e.g., calculated result when maneuverByCPA is true)
watch([
  () => radarStore.newCourse,
  () => radarStore.maneuverByCPA,
  () => radarStore.maneuverResult?.requiredCourse
], () => {
  if (radarStore.maneuverByCPA) {
    courseInput.value = formatDegrees(radarStore.maneuverResult?.requiredCourse ?? radarStore.newCourse)
  } else {
    courseInput.value = formatDegrees(radarStore.newCourse)
  }
}, { immediate: true })

// Format and save on blur
function onCourseBlur() {
  const value = parseDegrees(courseInput.value)
  radarStore.setNewCourse(value)
  courseInput.value = formatDegrees(value)
}

// Combined course/speed value that shows calculated result when maneuverByCPA is true,
// or allows user input when maneuverByCPA is false
const courseOrSpeedValue = computed({
  get: () => {
    if (isCourseChange.value) {
      // Course change mode
      if (radarStore.maneuverByCPA) {
        // Show calculated required course
        return radarStore.maneuverResult?.requiredCourse ?? radarStore.newCourse
      } else {
        // User input mode
        return radarStore.newCourse
      }
    } else {
      // Speed change mode
      if (radarStore.maneuverByCPA) {
        // Show calculated required speed
        return radarStore.maneuverResult?.requiredSpeed ?? radarStore.newSpeed
      } else {
        // User input mode
        return radarStore.newSpeed
      }
    }
  },
  set: (value: number) => {
    if (isCourseChange.value) {
      radarStore.setNewCourse(value)
    } else {
      radarStore.setNewSpeed(value)
    }
  }
})

const hasManeuverResults = computed(() => {
  const result = radarStore.maneuverResult
  return result && (
    result.newCPA !== undefined ||
    result.requiredCourse !== undefined ||
    result.requiredSpeed !== undefined ||
    result.newKBr !== undefined
  ) && !result.error
})

const cpaResultClass = computed(() => {
  const cpa = radarStore.maneuverResult?.newCPA
  if (cpa === undefined) return ''
  if (cpa < 0.5) return 'text-red-600 dark:text-red-400 font-bold'
  if (cpa < 1.0) return 'text-orange-600 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
})

</script>
