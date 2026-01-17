<template>
  <div class="space-y-4">
    <!-- Observation 1 -->
    <div class="space-y-2">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
        {{ $t('radar.observations') }} 1
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      
      <div class="grid grid-cols-2 gap-2">
        <!-- Row 1: Time & Distance -->
        <UFormField :label="$t('observation.time')">
          <UInput
            v-model="time0"
            type="time"
            placeholder="HH:MM"
            size="sm"
            class="font-mono w-full"
          />
        </UFormField>
        
        <UFormField :label="$t('observation.distance')">
          <UInput
            v-model.number="distance0"
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
        </UFormField>
        
        <!-- Row 2: Bearing Type Toggle & Bearing Value -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {{ $t('observation.bearing') }}
          </label>
          <UButtonGroup size="sm" class="w-full">
            <UButton
              :color="bearingType0 === 'rakrp' ? 'primary' : 'neutral'"
              :variant="bearingType0 === 'rakrp' ? 'solid' : 'outline'"
              class="flex-1"
              @click="bearingType0 = 'rakrp'"
            >
              {{ $t('observation.rakrpShort') }}
            </UButton>
            <UButton
              :color="bearingType0 === 'rasp' ? 'primary' : 'neutral'"
              :variant="bearingType0 === 'rasp' ? 'solid' : 'outline'"
              class="flex-1"
              @click="bearingType0 = 'rasp'"
            >
              {{ $t('observation.raspShort') }}
            </UButton>
          </UButtonGroup>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">&nbsp;</label>
          <UInput
            v-model.number="bearing0"
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
        </div>
        
        <!-- Row 3: Course Offset (conditional) -->
        <template v-if="bearingType0 === 'rasp'">
          <UFormField :label="$t('observation.courseOffset')">
            <UInput
              v-model.number="courseOffset0"
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
          </UFormField>
          <div></div>
        </template>
      </div>
    </div>
    
    <!-- Observation 2 -->
    <div class="space-y-2">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
        {{ $t('radar.observations') }} 2
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      
      <div class="grid grid-cols-2 gap-2">
        <!-- Row 1: Time & Distance -->
        <UFormField :label="$t('observation.time')">
          <UInput
            v-model="time1"
            type="time"
            placeholder="HH:MM"
            size="sm"
            class="font-mono w-full"
          />
        </UFormField>
        
        <UFormField :label="$t('observation.distance')">
          <UInput
            v-model.number="distance1"
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
        </UFormField>
        
        <!-- Row 2: Bearing Type Toggle & Bearing Value -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            {{ $t('observation.bearing') }}
          </label>
          <UButtonGroup size="sm" class="w-full">
            <UButton
              :color="bearingType1 === 'rakrp' ? 'primary' : 'neutral'"
              :variant="bearingType1 === 'rakrp' ? 'solid' : 'outline'"
              class="flex-1"
              @click="bearingType1 = 'rakrp'"
            >
              {{ $t('observation.rakrpShort') }}
            </UButton>
            <UButton
              :color="bearingType1 === 'rasp' ? 'primary' : 'neutral'"
              :variant="bearingType1 === 'rasp' ? 'solid' : 'outline'"
              class="flex-1"
              @click="bearingType1 = 'rasp'"
            >
              {{ $t('observation.raspShort') }}
            </UButton>
          </UButtonGroup>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">&nbsp;</label>
          <UInput
            v-model.number="bearing1"
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
        </div>
        
        <!-- Row 3: Course Offset (conditional) -->
        <template v-if="bearingType1 === 'rasp'">
          <UFormField :label="$t('observation.courseOffset')">
            <UInput
              v-model.number="courseOffset1"
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
          </UFormField>
          <div></div>
        </template>
      </div>
    </div>
    
    <!-- Results -->
    <div v-if="target && target.deltaTime > 0" class="space-y-3">
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
        {{ $t('radar.results') }}
        <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      
      <div class="space-y-1.5 text-sm">
        <RadarResultRow
          :label="$t('results.intervalShort')"
          :tooltip="$t('results.intervalTooltip')"
          :value="target.deltaTime"
          unit="min"
          :decimals="0"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="target.vBr > 0"
          :label="$t('results.drmShort')"
          :tooltip="$t('results.drmTooltip')"
          :value="target.KBr"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="target.vBr > 0"
          :label="$t('results.srmShort')"
          :tooltip="$t('results.srmTooltip')"
          :value="target.vBr"
          unit="kn"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="target.vB > 0"
          :label="$t('results.trueCourseShort')"
          :tooltip="$t('results.trueCourseTooltip')"
          :value="target.KB"
          format="bearing"
          unit="°"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <RadarResultRow
          v-if="target.vB > 0"
          :label="$t('results.trueSpeedShort')"
          :tooltip="$t('results.trueSpeedTooltip')"
          :value="target.vB"
          unit="kn"
          label-class="text-gray-500 dark:text-gray-500"
          value-class="text-gray-900 dark:text-white"
        />
        
        <!-- CPA Section -->
        <div v-if="target.haveCPA" class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
          <RadarResultRow
            :label="$t('results.cpaShort')"
            :tooltip="$t('results.cpaTooltip')"
            :value="target.CPA"
            unit="nm"
            label-class="text-gray-500 dark:text-gray-500"
            :value-class="target.CPA < 0.5 ? 'text-red-600 dark:text-red-400 font-bold' : target.CPA < 1.0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'"
          />
          
          <RadarResultRow
            :label="$t('results.tcpaShort')"
            :tooltip="$t('results.tcpaTooltip')"
            :value="target.TCPA"
            unit="min"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            v-if="target.TCPA_clock > 0"
            :label="$t('results.tCPAShort')"
            :tooltip="$t('results.tCPATooltip')"
            :value="target.TCPA_clock"
            format="clock"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            :label="$t('results.pcpaShort')"
            :tooltip="$t('results.pcpaTooltip')"
            :value="target.PCPA"
            format="bearing"
            unit="°"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            :label="$t('results.spcpaShort')"
            :tooltip="$t('results.spcpaTooltip')"
            :value="target.SPCPA"
            format="bearing"
            unit="°"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
        </div>
        
        <!-- Bow Crossing Section -->
        <div v-if="target.haveCrossing && target.BCR >= 0" class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
          <RadarResultRow
            :label="$t('results.bcrShort')"
            :tooltip="$t('results.bcrTooltip')"
            :value="target.BCR"
            unit="nm"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            :label="$t('results.bctShort')"
            :tooltip="$t('results.bctTooltip')"
            :value="target.BCT"
            unit="min"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
          
          <RadarResultRow
            v-if="target.BCt > 0"
            :label="$t('results.bCtShort')"
            :tooltip="$t('results.bCtTooltip')"
            :value="target.BCt"
            format="clock"
            label-class="text-gray-500 dark:text-gray-500"
            value-class="text-gray-900 dark:text-white"
          />
        </div>
      </div>
      
      <!-- KVR/COLREGs Analysis -->
      <div v-if="kvrAnalysis" class="space-y-3 pt-3">
        <div class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-2">
          {{ $t('maneuver.kvrTitle') }}
          <div class="flex-1 h-px bg-amber-200 dark:bg-amber-800/50" />
        </div>
        
        <div class="text-sm space-y-2">
          <!-- Encounter type -->
          <div class="flex items-center gap-2">
            <span 
              class="px-2 py-0.5 rounded text-xs font-bold"
              :class="kvrAnalysis.roleClass"
            >
              {{ kvrAnalysis.role }}
            </span>
            <span class="text-gray-700 dark:text-gray-300">
              {{ kvrAnalysis.encounterType }}
            </span>
          </div>
          
          <!-- Rule reference -->
          <div class="text-xs text-amber-700 dark:text-amber-500 font-semibold">
            {{ kvrAnalysis.rule }}
          </div>
          
          <!-- Explanation -->
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ kvrAnalysis.explanation }}
          </div>
          
          <!-- Maneuver recommendation -->
          <div v-if="kvrAnalysis.recommendation" class="text-xs text-primary-600 dark:text-primary-400 font-medium">
            {{ kvrAnalysis.recommendation }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRadarStore } from '~/stores/radarStore'
import { timeStringToMinutes, minutesToTimeString } from '~/utils/radarConstants'

const props = defineProps<{
  targetIndex: number
}>()

const { t } = useI18n()
const radarStore = useRadarStore()

// Get target from store
const target = computed(() => radarStore.targets[props.targetIndex])

// KVR/COLREGs Rule 19 analysis (Restricted Visibility - Radar)
// Uses the same data as maneuver planning: SPCPA, haveCrossing, aspect
const kvrAnalysis = computed(() => {
  if (!target.value || !target.value.haveCPA) return null
  
  // Use SPCPA (Relative bearing at CPA) - this tells us where the collision point is
  // relative to our heading, which is what matters for collision avoidance
  const spcpa = target.value.SPCPA
  const haveCrossing = target.value.haveCrossing
  const aspect = target.value.aspect // Target's aspect angle (how target sees us)
  
  // Normalize SPCPA to -180 to +180 for port/starboard analysis
  let spcpaNorm = ((spcpa % 360) + 360) % 360
  if (spcpaNorm > 180) spcpaNorm -= 360
  
  // Determine where the CPA point is relative to our bow
  // Forward: |SPCPA| <= 90° (collision point is ahead)
  // Aft: |SPCPA| > 90° (collision point is behind)
  const cpaIsForward = Math.abs(spcpaNorm) <= 90
  const cpaOnPort = spcpaNorm < 0
  const cpaOnStarboard = spcpaNorm > 0
  
  // Determine encounter type based on aspect angle
  // Aspect 0-30° or 330-360°: We see target's stern (overtaking)
  // Aspect 150-210°: We see target's bow (head-on or being overtaken)
  // Aspect 30-150° or 210-330°: Crossing situation
  const aspectNorm = ((aspect % 360) + 360) % 360
  const isOvertaking = aspectNorm < 30 || aspectNorm > 330
  const isHeadOn = aspectNorm > 150 && aspectNorm < 210
  const isCrossing = !isOvertaking && !isHeadOn
  
  let situation = ''
  let rule = t('maneuver.kvr.rule19d')
  let action = ''
  let actionClass = ''
  let explanation = ''
  let recommendation = ''
  
  if (isHeadOn) {
    // Head-on or nearly head-on situation
    situation = t('maneuver.kvr.headOn')
    action = t('maneuver.kvr.turnStarboard')
    actionClass = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    explanation = t('maneuver.kvr.headOnExplanation')
    recommendation = t('maneuver.kvr.rule19StarboardOrSpeed')
  } else if (isOvertaking) {
    // We are overtaking the target
    situation = t('maneuver.kvr.overtaking')
    action = t('maneuver.kvr.keepClear')
    actionClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    explanation = t('maneuver.kvr.overtakingExplanation')
    recommendation = t('maneuver.kvr.overtakingRecommendation')
  } else if (isCrossing) {
    // Crossing situation - the most complex case
    if (haveCrossing && cpaIsForward) {
      // Target will cross ahead of us - CPA is forward
      // Turning towards target's current position moves CPA astern (good!)
      if (cpaOnStarboard) {
        situation = t('maneuver.kvr.crossingAheadStarboard')
        action = t('maneuver.kvr.starboardOk')
        actionClass = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        explanation = t('maneuver.kvr.crossingAheadStarboardExplanation')
        recommendation = t('maneuver.kvr.starboardMovesAstern')
      } else {
        situation = t('maneuver.kvr.crossingAheadPort')
        action = t('maneuver.kvr.avoidPort')
        actionClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
        explanation = t('maneuver.kvr.crossingAheadPortExplanation')
        recommendation = t('maneuver.kvr.rule19StarboardOrSpeed')
      }
    } else {
      // Target passes astern or CPA is aft
      // Avoid turning towards the target
      if (cpaOnPort) {
        situation = t('maneuver.kvr.passingAsternPort')
        action = t('maneuver.kvr.avoidPort')
        actionClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
        explanation = t('maneuver.kvr.passingAsternPortExplanation')
        recommendation = t('maneuver.kvr.rule19AvoidPortTurn')
      } else {
        situation = t('maneuver.kvr.passingAsternStarboard')
        action = t('maneuver.kvr.avoidStarboard')
        actionClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
        explanation = t('maneuver.kvr.passingAsternStarboardExplanation')
        recommendation = t('maneuver.kvr.rule19AvoidStarboardTurn')
      }
    }
  }
  
  return {
    encounterType: situation,
    rule,
    role: action,
    roleClass: actionClass,
    explanation,
    recommendation
  }
})

// Time 0
const time0 = computed({
  get: () => minutesToTimeString(target.value?.time[0] ?? 0),
  set: (value: string) => {
    const minutes = timeStringToMinutes(value)
    radarStore.updateTargetObservation(props.targetIndex, 0, { time: minutes })
  }
})

// Time 1
const time1 = computed({
  get: () => minutesToTimeString(target.value?.time[1] ?? 0),
  set: (value: string) => {
    const minutes = timeStringToMinutes(value)
    radarStore.updateTargetObservation(props.targetIndex, 1, { time: minutes })
  }
})

// Distance 0
const distance0 = computed({
  get: () => target.value?.distance[0] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 0, { distance: value })
  }
})

// Distance 1
const distance1 = computed({
  get: () => target.value?.distance[1] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 1, { distance: value })
  }
})

// Bearing type 0
const bearingType0 = computed({
  get: () => target.value?.bearingType[0] ?? 'rakrp',
  set: (value: 'rasp' | 'rakrp') => {
    radarStore.updateTargetObservation(props.targetIndex, 0, { bearingType: value })
  }
})

// Bearing type 1
const bearingType1 = computed({
  get: () => target.value?.bearingType[1] ?? 'rakrp',
  set: (value: 'rasp' | 'rakrp') => {
    radarStore.updateTargetObservation(props.targetIndex, 1, { bearingType: value })
  }
})

// Bearing 0
const bearing0 = computed({
  get: () => target.value?.bearing[0] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 0, { bearing: value })
  }
})

// Bearing 1
const bearing1 = computed({
  get: () => target.value?.bearing[1] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 1, { bearing: value })
  }
})

// Course offset 0
const courseOffset0 = computed({
  get: () => target.value?.bearingCourseOffset[0] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 0, { bearingCourseOffset: value })
  }
})

// Course offset 1
const courseOffset1 = computed({
  get: () => target.value?.bearingCourseOffset[1] ?? 0,
  set: (value: number) => {
    radarStore.updateTargetObservation(props.targetIndex, 1, { bearingCourseOffset: value })
  }
})
</script>
