<script setup lang="ts">
// Simple test page
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
    <UCard>
      <template #header>
        <span class="font-semibold">Test Card Title</span>
      </template>

      <p>This is some text content inside the card body. It demonstrates the default Nuxt UI card styling with a header slot and body content.</p>
    </UCard>
  </div>
</template>
