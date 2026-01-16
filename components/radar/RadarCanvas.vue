<template>
  <div 
    ref="containerRef" 
    class="w-full h-full min-h-[300px] overflow-hidden relative touch-none"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dblclick="resetZoom"
    @touchstart.prevent="handleTouchStart"
    @touchmove.prevent="handleTouchMove"
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
import { useRadarRenderer } from '~/composables/radar/useRadarRenderer'

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
function render() {
  if (!canvasRef.value) return
  
  const renderer = useRadarRenderer(canvasRef as Ref<HTMLCanvasElement | null>, isDark.value)
  renderer.render(radarStore.$state, zoom.value, panX.value, panY.value)
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

// Handle mouse move for panning
function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return
  
  const dx = event.clientX - dragStart.value.x
  const dy = event.clientY - dragStart.value.y
  
  // Limit pan based on zoom level
  const maxPan = (canvasWidth.value * (zoom.value - 1)) / (2 * zoom.value)
  panX.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.x + dx / zoom.value))
  panY.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.y + dy / zoom.value))
}

// Handle mouse up for pan end
function handleMouseUp() {
  isDragging.value = false
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
    resetZoom()
    lastTapTime.value = 0
    return
  }
  lastTapTime.value = now
  
  if (touches.length === 2) {
    // Pinch start
    lastTouchDistance.value = getTouchDistance(touches)
    lastTouchCenter.value = getTouchCenter(touches)
  } else if (touches.length === 1 && zoom.value > MIN_ZOOM) {
    // Pan start
    isDragging.value = true
    dragStart.value = { x: touches[0].clientX, y: touches[0].clientY }
    panStart.value = { x: panX.value, y: panY.value }
  }
}

// Handle touch move
function handleTouchMove(event: TouchEvent) {
  const touches = event.touches
  
  if (touches.length === 2) {
    // Pinch zoom
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
    // Single finger pan
    const dx = touches[0].clientX - dragStart.value.x
    const dy = touches[0].clientY - dragStart.value.y
    const maxPan = (canvasWidth.value * (zoom.value - 1)) / (2 * zoom.value)
    panX.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.x + dx / zoom.value))
    panY.value = Math.min(maxPan, Math.max(-maxPan, panStart.value.y + dy / zoom.value))
  }
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

// Expose render function
defineExpose({
  render
})
</script>
