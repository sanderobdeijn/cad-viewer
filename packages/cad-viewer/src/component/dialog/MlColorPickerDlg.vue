<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="title"
    :width="360"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <MlColorPickerTabs v-model="selectedColor" />
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { CommonColor } from '@mlightcad/common'
import { computed, shallowRef, watch } from 'vue'

import { MlBaseDialog, MlColorPickerTabs } from '../common'

/**
 * Props
 */
const props = defineProps<{
  modelValue: boolean
  color?: string
  title: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'ok', v: CommonColor): void
  (e: 'cancel', v: undefined): void
}>()

/**
 * Dialog visibility
 */
const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const selectedColor = shallowRef<CommonColor | undefined>(
  props.color ? (CommonColor.fromString(props.color) ?? undefined) : undefined
)

// Watch for changes to color
watch(
  () => props.color,
  newColor => {
    selectedColor.value = newColor
      ? (CommonColor.fromString(newColor) ?? undefined)
      : undefined
  }
)

/**
 * Confirm
 */
function handleOk() {
  if (selectedColor.value) {
    emit('ok', selectedColor.value)
    return
  }
  const fallback = new CommonColor()
  fallback.setByLayer()
  emit('ok', fallback)
}

/**
 * Cancel
 */
function handleCancel() {
  emit('cancel', undefined)
}
</script>
