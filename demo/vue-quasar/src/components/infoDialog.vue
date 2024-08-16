<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
    title?: string,
    text?: string,
    closeButton?: boolean
  }>()

const emit = defineEmits(['close']);

const showDialog = ref(true)
const backdropFilter = ref('blur(4px) saturate(150%)')

watch(showDialog, () => {
  if(!showDialog.value) emit('close')
})
</script>

<template>
  <div class="quasar-style-wrap">
  <q-dialog v-model="showDialog" :backdrop-filter="backdropFilter">
    <q-card>
      <q-card-section class="row items-center q-pb-none text-h6">
        {{ title }}
      </q-card-section>

      <q-card-section>
        {{ text }}
      </q-card-section>

      <q-card-actions v-if="closeButton" align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
  </div>
</template>