<template>
  <div 
    ref="containerRef" 
    class="w-full h-full min-h-[300px] overflow-hidden relative"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @dblclick="resetZoom"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="bg-white dark:bg-slate-900 w-full h-full"
      :class="isDragging ? 'cursor-grabbing' : (zoom > 1 ? 'cursor-grab' : 'cursor-crosshair')"
      @click="handleCanvasClick"
    />
    <!-- Hover tooltip -->
    <Transition name="tooltip-fade">
      <div 
        v-if="hoveredVector && tooltipVisible"
        class="absolute pointer-events-none z-10 px-4 py-2.5 rounded-lg shadow-lg font-mono
               bg-slate-800/95 text-white dark:bg-slate-700/95 border border-slate-600/50
               backdrop-blur-sm min-w-[200px] whitespace-nowrap"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      >
        <div class="font-semibold mb-1.5 flex items-center gap-2 text-sm">
          <span 
            class="w-3 h-0.5 rounded"
            :class="getVectorColorClass(hoveredVector.type)"
          ></span>
          {{ getVectorLabel(hoveredVector) }}
        </div>
        <div class="text-xs space-y-1 text-slate-300">
          <div v-if="hoveredVector.info.course !== undefined" class="flex justify-between gap-4">
            <span>{{ $t('radar.course') }}:</span>
            <span class="text-white">{{ formatDegrees(hoveredVector.info.course) }}°</span>
          </div>
          <div v-if="hoveredVector.info.speed !== undefined" class="flex justify-between gap-4">
            <span>{{ $t('radar.speed') }}:</span>
            <span class="text-white">{{ hoveredVector.info.speed.toFixed(1) }} kn</span>
          </div>
          <div v-if="hoveredVector.info.bearing !== undefined" class="flex justify-between gap-4">
            <span>{{ $t('radar.bearing') }}:</span>
            <span class="text-white">{{ formatDegrees(hoveredVector.info.bearing) }}°</span>
          </div>
          <div v-if="hoveredVector.info.cpa !== undefined" class="flex justify-between gap-4">
            <span>CPA:</span>
            <span class="text-white">{{ hoveredVector.info.cpa.toFixed(2) }} nm</span>
          </div>
          <div v-if="hoveredVector.info.tcpa !== undefined" class="flex justify-between gap-4">
            <span>TCPA:</span>
            <span class="text-white">{{ formatTime(hoveredVector.info.tcpa) }}</span>
          </div>
          <div v-if="hoveredVector.info.newCpa !== undefined" class="flex justify-between gap-4">
            <span>CPA':</span>
            <span class="text-white">{{ hoveredVector.info.newCpa.toFixed(2) }} nm</span>
          </div>
          <div v-if="hoveredVector.info.newTcpa !== undefined" class="flex justify-between gap-4">
            <span>TCPA':</span>
            <span class="text-white">{{ formatTime(hoveredVector.info.newTcpa) }}</span>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Zoom indicator -->
    <div 
      v-if="zoom !== 1" 
      class="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded font-mono"
    >
      {{ Math.round(zoom * 100) }}% · {{ $t('radar.dblClickReset') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useRadarStore } from '~/stores/radarStore'
import { useRadarRenderer, type TrackedVector } from '~/composables/radar/useRadarRenderer'
import { minutesToTimeString } from '~/utils/radarConstants'

const radarStore = useRadarStore()
const colorMode = useColorMode()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// Computed dark mode state
const isDark = computed(() => colorMode.value === 'dark')

// ResizeObserver for responsive scaling
let resizeObserver: ResizeObserver | null = null

// Canvas dimensions - always match container
const canvasWidth = computed(() => radarStore.canvasWidth)
const canvasHeight = computed(() => radarStore.canvasHeight)

// Zoom and pan state (applied during rendering, not to canvas size)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const panStart = ref({ x: 0, y: 0 })

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

// Touch state
const lastTouchDistance = ref(0)
const lastTouchCenter = ref({ x: 0, y: 0 })
const lastTapTime = ref(0)

// Hover tooltip state
const hoveredVector = ref<TrackedVector | null>(null)
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

// Keep renderer reference for hover detection
let currentRenderer: ReturnType<typeof useRadarRenderer> | null = null

// Calculate optimal canvas size based on container
function updateCanvasSize() {
  if (!containerRef.value) return
  
  const containerRect = containerRef.value.getBoundingClientRect()
  const size = Math.floor(Math.min(containerRect.width, containerRect.height))
  
  if (size > 0) {
    radarStore.setCanvasSize(size, size)
  }
}

// Render function - passes zoom and pan to renderer
function render(highlightVectorId?: string) {
  if (!canvasRef.value) return
  
  const renderer = useRadarRenderer(canvasRef as Ref<HTMLCanvasElement | null>, isDark.value)
  currentRenderer = renderer
  renderer.render(radarStore.$state, zoom.value, panX.value, panY.value, highlightVectorId)
}

// Setup ResizeObserver
onMounted(async () => {
  // Wait for next tick to ensure DOM is fully rendered
  await nextTick()
  
  // Initial size update
  updateCanvasSize()
  render()
  
  // Setup ResizeObserver for responsive updates
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
      nextTick(() => {
        render()
      })
    })
    resizeObserver.observe(containerRef.value)
  }
  
  window.addEventListener('resize', handleResize)
  
  // Fallback: re-check size after a short delay for layout stabilization
  setTimeout(() => {
    updateCanvasSize()
    render()
  }, 100)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  updateCanvasSize()
  nextTick(() => {
    render()
  })
}

// Watch store state changes
watch(() => radarStore.$state, () => {
  nextTick(() => {
    render()
  })
}, { deep: true })

// Watch color mode changes to re-render canvas
watch(isDark, () => {
  nextTick(() => {
    render()
  })
})

// Watch zoom/pan changes to re-render
watch([zoom, panX, panY], () => {
  nextTick(() => {
    render()
  })
})

// Handle canvas click (for maneuver point selection)
function handleCanvasClick(event: MouseEvent) {
  // Don't process click if we just finished dragging
  if (isDragging.value) return
  if (!canvasRef.value) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  console.log('Canvas clicked at:', x, y)
}

// Handle mouse wheel for zoom
function handleWheel(event: WheelEvent) {
  const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + delta))
  
  // If zooming out to 1x, reset pan
  if (newZoom <= MIN_ZOOM) {
    zoom.value = MIN_ZOOM
    panX.value = 0
    panY.value = 0
  } else {
    zoom.value = newZoom
  }
}

// Handle mouse down for pan start
function handleMouseDown(event: MouseEvent) {
  if (zoom.value <= MIN_ZOOM) return
  
  isDragging.value = true
  dragStart.value = { x: event.clientX, y: event.clientY }
  panStart.value = { x: panX.value, y: panY.value }
}

// Handle mouse move for panning and hover detection
function handleMouseMove(event: MouseEvent) {
  // Handle panning if dragging
  if (isDragging.value) {
    const dx = event.clientX - dragStart.value.x
    const dy = event.clientY - dragStart.value.y
    
    // Limit pan based on zoom level
    const maxPan = (canvasWidth.value * (zoom.value - 1)) / (2 * zoom.value)
    panX.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.x + dx / zoom.value))
    panY.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.y + dy / zoom.value))
    return
  }
  
  // Handle hover detection for tooltips
  if (!canvasRef.value || !currentRenderer) return
  
  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Scale coordinates to actual canvas size
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  const canvasX = x * scaleX
  const canvasY = y * scaleY
  
  // Check for vector under cursor
  const vector = currentRenderer.getVectorAtPosition(
    canvasX, canvasY, 10,
    zoom.value, panX.value, panY.value,
    canvasRef.value.width, canvasRef.value.height
  )
  
  const prevHovered = hoveredVector.value?.id
  
  if (vector) {
    hoveredVector.value = vector
    tooltipX.value = event.clientX - rect.left + 15
    tooltipY.value = event.clientY - rect.top - 10
    
    // Keep tooltip within container bounds
    const containerRect = containerRef.value?.getBoundingClientRect()
    if (containerRect) {
      const maxX = containerRect.width - 220 // Approximate tooltip width
      const maxY = containerRect.height - 120 // Approximate tooltip height
      tooltipX.value = Math.min(tooltipX.value, maxX)
      tooltipY.value = Math.max(10, Math.min(tooltipY.value, maxY))
    }
    
    tooltipVisible.value = true
    
    // Re-render with highlight if changed
    if (prevHovered !== vector.id) {
      render(vector.id)
    }
  } else {
    tooltipVisible.value = false
    hoveredVector.value = null
    
    // Re-render without highlight if was highlighted
    if (prevHovered) {
      render()
    }
  }
}

// Handle mouse up for pan end
function handleMouseUp() {
  isDragging.value = false
}

// Handle mouse leave - hide tooltip
function handleMouseLeave() {
  isDragging.value = false
  tooltipVisible.value = false
  hoveredVector.value = null
}

// Reset zoom and pan
function resetZoom() {
  zoom.value = MIN_ZOOM
  panX.value = 0
  panY.value = 0
}

// Get distance between two touch points
function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// Get center point between two touches
function getTouchCenter(touches: TouchList): { x: number; y: number } {
  if (touches.length < 2) {
    return { x: touches[0].clientX, y: touches[0].clientY }
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

// Handle touch start
function handleTouchStart(event: TouchEvent) {
  const touches = event.touches
  
  // Double-tap detection
  const now = Date.now()
  if (touches.length === 1 && now - lastTapTime.value < 300) {
    event.preventDefault() // Prevent zoom on double-tap
    resetZoom()
    lastTapTime.value = 0
    return
  }
  lastTapTime.value = now
  
  if (touches.length === 2) {
    // Pinch start - prevent page zoom
    event.preventDefault()
    lastTouchDistance.value = getTouchDistance(touches)
    lastTouchCenter.value = getTouchCenter(touches)
  } else if (touches.length === 1 && zoom.value > MIN_ZOOM) {
    // Pan start (only when zoomed in) - prevent page scroll
    event.preventDefault()
    isDragging.value = true
    dragStart.value = { x: touches[0].clientX, y: touches[0].clientY }
    panStart.value = { x: panX.value, y: panY.value }
  }
  // Single finger when not zoomed: let page scroll naturally (don't prevent default)
}

// Handle touch move
function handleTouchMove(event: TouchEvent) {
  const touches = event.touches
  
  if (touches.length === 2) {
    // Pinch zoom - prevent page zoom/scroll
    event.preventDefault()
    
    const newDistance = getTouchDistance(touches)
    if (lastTouchDistance.value > 0) {
      const scale = newDistance / lastTouchDistance.value
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * scale))
      
      if (newZoom <= MIN_ZOOM) {
        zoom.value = MIN_ZOOM
        panX.value = 0
        panY.value = 0
      } else {
        zoom.value = newZoom
      }
    }
    lastTouchDistance.value = newDistance
    
    // Pan while pinching
    const newCenter = getTouchCenter(touches)
    if (zoom.value > MIN_ZOOM) {
      const dx = newCenter.x - lastTouchCenter.value.x
      const dy = newCenter.y - lastTouchCenter.value.y
      const maxPan = (canvasWidth.value * (zoom.value - 1)) / (2 * zoom.value)
      panX.value = Math.min(maxPan, Math.max(-maxPan, panX.value + dx / zoom.value))
      panY.value = Math.min(maxPan, Math.max(-maxPan, panY.value + dy / zoom.value))
    }
    lastTouchCenter.value = newCenter
    
  } else if (touches.length === 1 && isDragging.value) {
    // Single finger pan (only when zoomed in) - prevent page scroll
    event.preventDefault()
    
    const dx = touches[0].clientX - dragStart.value.x
    const dy = touches[0].clientY - dragStart.value.y
    const maxPan = (canvasWidth.value * (zoom.value - 1)) / (2 * zoom.value)
    panX.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.x + dx / zoom.value))
    panY.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.y + dy / zoom.value))
  }
  // Single finger when not zoomed/dragging: let page scroll naturally
}

// Handle touch end
function handleTouchEnd(event: TouchEvent) {
  if (event.touches.length < 2) {
    lastTouchDistance.value = 0
  }
  if (event.touches.length === 0) {
    isDragging.value = false
  }
}

// Format degrees with leading zeros
function formatDegrees(deg: number): string {
  const rounded = Math.round(deg) % 360
  return rounded.toString().padStart(3, '0')
}

// Format time in minutes to readable string
function formatTime(minutes: number): string {
  return minutesToTimeString(minutes)
}

// Get Tailwind color class for vector type indicator
function getVectorColorClass(type: TrackedVector['type']): string {
  switch (type) {
    case 'own':
    case 'new_own':
      return 'bg-green-500'
    case 'true':
      return 'bg-blue-500'
    case 'relative':
    case 'new_relative':
      return 'bg-red-500'
    case 'cpa':
    case 'new_cpa':
      return 'bg-red-600'
    default:
      return 'bg-gray-500'
  }
}

// Get localized label for vector type
const { t } = useI18n()
function getVectorLabel(vector: TrackedVector): string {
  const targetLetter = vector.targetIndex !== undefined ? ` (${String.fromCharCode(65 + vector.targetIndex)})` : ''
  
  switch (vector.type) {
    case 'own':
      return t('tooltip.ownShipVector')
    case 'new_own':
      return t('tooltip.newOwnVector')
    case 'true':
      return t('tooltip.trueMotion') + targetLetter
    case 'relative':
      return t('tooltip.relativeMotion') + targetLetter
    case 'new_relative':
      return t('tooltip.newRelativeMotion') + targetLetter
    case 'cpa':
      return t('tooltip.cpaLine') + targetLetter
    case 'new_cpa':
      return t('tooltip.newCpaLine') + targetLetter
    default:
      return vector.info.label
  }
}

// Expose render function
defineExpose({
  render
})
</script>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
