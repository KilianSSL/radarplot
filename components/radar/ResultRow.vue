<template>
  <div class="flex justify-between items-baseline">
    <UTooltip :text="tooltip" :popper="{ placement: 'left' }">
      <span 
        class="font-mono text-xs cursor-help border-b border-dotted border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white"
        :class="labelClass"
      >
        {{ label }}:
      </span>
    </UTooltip>
    <span class="font-mono" :class="valueClass">
      {{ formattedValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  tooltip: string
  value: number | string | undefined
  unit?: string
  format?: 'number' | 'bearing' | 'clock' | 'delta'
  decimals?: number
  labelClass?: string
  valueClass?: string
}>()

const formattedValue = computed(() => {
  if (props.value === undefined || props.value === null) return '-'
  
  if (typeof props.value === 'string') {
    // No space before degree symbol (handles '°', '° Stb', '° Bb', etc.)
    const separator = props.unit?.startsWith('°') ? '' : ' '
    return props.unit ? `${props.value}${separator}${props.unit}` : props.value
  }
  
  const num = props.value
  const dec = props.decimals ?? 1
  
  let formatted: string
  
  switch (props.format) {
    case 'bearing':
      // Format bearing with leading zeros (e.g., 007.8° or 007°)
      // For integers (dec=0): 3 digits, for decimals: 3 digits + decimal point + decimal places
      const padWidth = dec > 0 ? 4 + dec : 3
      formatted = num.toFixed(dec).padStart(padWidth, '0')
      break
    case 'clock':
      // Format as HH:MM
      const hours = Math.floor(num / 60) % 24
      const mins = Math.round(num % 60)
      formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      break
    case 'delta':
      // Format with +/- sign and leading zeros (e.g., +007.8° or -007.8°)
      const deltaWidth = dec > 0 ? 4 + dec : 3
      const absFormatted = Math.abs(num).toFixed(dec).padStart(deltaWidth, '0')
      formatted = num >= 0 ? `+${absFormatted}` : `-${absFormatted}`
      break
    default:
      formatted = num.toFixed(dec)
  }
  
  // No space before degree symbol (handles '°', '° Stb', '° Bb', etc.)
  const separator = props.unit?.startsWith('°') ? '' : ' '
  return props.unit ? `${formatted}${separator}${props.unit}` : formatted
})
</script>
