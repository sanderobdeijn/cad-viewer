<template>
  <el-card v-if="visible" ref="cardRef" class="ml-entity-info">
    <el-row class="ml-entity-info-text">
      <el-col :span="24">
        <el-text size="small" class="ml-entity-info-title">
          {{ info.type }}
        </el-text>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { AcApDocManager, itemTypeName } from '@mlightcad/cad-simple-viewer'
import { ElCard, ElCol, ElRow, ElText } from 'element-plus'
import { ComponentPublicInstance, computed, nextTick, ref, watch } from 'vue'

import { useHover, useSettings } from '../../composable'
import { entityName } from '../../locale'

const cardRef = ref<ComponentPublicInstance<{}, HTMLElement> | null>(null)
const { hovered, item, mouse } = useHover()
const features = useSettings()

const cardWidth = ref(180)
const cardHeight = ref(120)
const margin = 8

const left = computed(
  () =>
    `${Math.min(Math.max(mouse.value.x, margin), window.innerWidth - cardWidth.value - margin)}px`
)
const top = computed(
  () =>
    `${Math.min(Math.max(mouse.value.y, margin), window.innerHeight - cardHeight.value - margin)}px`
)

const info = computed(() => {
  const hoveredItem = item.value
  return { type: hoveredItem ? entityName(itemTypeName(hoveredItem)) : '' }
})

const visible = computed(
  () =>
    hovered.value &&
    info.value.type !== '' &&
    features.isShowEntityInfo &&
    !AcApDocManager.instance.editor.isActive
)

watch(visible, async val => {
  if (val) {
    await nextTick()
    const el = cardRef.value?.$el as HTMLElement | undefined
    if (el) {
      cardWidth.value = el.offsetWidth
      cardHeight.value = el.offsetHeight
    }
  }
})
</script>

<style scoped>
.ml-entity-info {
  position: fixed;
  left: v-bind(left);
  top: v-bind(top);
  z-index: 99999;
  width: 180px;
  margin: 0;
  transition: none !important;
}
.ml-entity-info-title {
  font-weight: bold;
}
.ml-entity-info-text {
  margin-bottom: 6px;
  margin-top: 6px;
}
</style>
