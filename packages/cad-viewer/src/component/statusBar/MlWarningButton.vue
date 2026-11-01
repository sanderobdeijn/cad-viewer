<template>
  <el-button
    v-if="hasMissing"
    class="ml-warning-button"
    type="warning"
    :icon="Warning"
    @click="click()"
  />
</template>

<script lang="ts" setup>
import { Warning } from '@element-plus/icons-vue'
import { ElButton } from 'element-plus'
import { computed } from 'vue'

import { openMissingResourcesPalette, useMissedData } from '../../composable'

const { fonts } = useMissedData()

const hasMissing = computed(() => {
  return fonts.size > 0
})

const click = () => {
  openMissingResourcesPalette()
}
</script>

<style scoped>
.ml-warning-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
