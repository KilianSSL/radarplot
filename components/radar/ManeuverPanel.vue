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

    <!-- Goal Input (CPA or Course/Speed) -->
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {{ $t('maneuver.desiredCPA') }}
        </label>
        <UButtonGroup size="sm" class="w-full">
          <UButton
            :color="maneuverByCPA ? 'primary' : 'neutral'"
            :variant="maneuverByCPA ? 'solid' : 'outline'"
            class="flex-1"
            @click="maneuverByCPA = true"
          >
            {{ $t('maneuver.byCPAShort') }}
          </UButton>
          <UButton
            :color="!maneuverByCPA ? 'primary' : 'neutral'"
            :variant="!maneuverByCPA ? 'solid' : 'outline'"
            class="flex-1"
            @click="maneuverByCPA = false"
          >
            {{ isCourseChange ? $t('maneuver.byCourseShort') : $t('maneuver.bySpeedShort') }}
          </UButton>
        </UButtonGroup>
      </div>
      
      <div>
        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">&nbsp;</label>
        <UInput
          v-if="maneuverByCPA"
          v-model.number="desiredCPA"
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
        <UInput
          v-else-if="isCourseChange"
          v-model.number="newCourse"
          type="number"
          :min="0"
          :max="359"
          step="1"
          size="sm"
          class="font-mono w-full"
        >
          <template #trailing>
            <span class="text-sm text-gray-500 dark:text-gray-400">°</span>
          </template>
        </UInput>
        <UInput
          v-else
          v-model.number="newSpeed"
          type="number"
          :min="0"
          step="0.1"
          size="sm"
          class="font-mono w-full"
        >
          <template #trailing>
            <span class="text-sm text-gray-500 dark:text-gray-400">kn</span>
          </template>
        </UInput>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="hasManeuverResults" class="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {{ $t('maneuver.results') }}
      </div>
      
      <div class="space-y-1.5 text-sm">
        <!-- Required course/speed result -->
        <RadarResultRow
          v-if="r.requiredCourse !== undefined"
          :label="$t('results.requiredCourseShort')"
          :tooltip="$t('results.requiredCourseTooltip')"
          :value="r.requiredCourse"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="font-bold text-primary-600 dark:text-primary-400"
        />
        
        <RadarResultRow
          v-if="r.courseChange !== undefined && r.requiredCourse !== undefined"
          :label="$t('results.courseChangeShort')"
          :tooltip="$t('results.courseChangeTooltip')"
          :value="r.courseChange"
          format="delta"
          :unit="r.courseChange > 0 ? '° Stb' : '° Bb'"
          label-class="text-gray-400 dark:text-gray-600"
          :value-class="r.courseChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'"
        />
        
        <RadarResultRow
          v-if="r.requiredSpeed !== undefined"
          :label="$t('results.requiredSpeedShort')"
          :tooltip="$t('results.requiredSpeedTooltip')"
          :value="r.requiredSpeed"
          unit="kn"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="font-bold text-primary-600 dark:text-primary-400"
        />
        
        <!-- Separator -->
        <div class="border-t border-gray-100 dark:border-gray-800 my-2" />
        
        <!-- New relative motion -->
        <RadarResultRow
          v-if="r.newKBr !== undefined"
          :label="$t('results.drmShort')"
          :tooltip="$t('results.drmTooltip')"
          :value="r.newKBr"
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
import { computed, watch } from 'vue'
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

const desiredCPA = computed({
  get: () => radarStore.desiredCPA,
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
