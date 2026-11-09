<template>
  <div
    :class="{ 'is-disabled': isStatusBarDisabled }"
    :aria-disabled="isStatusBarDisabled"
    class="ml-status-bar"
  >
    <div class="ml-status-bar-left"></div>
    <div class="ml-status-bar-right">
      <el-button-group class="ml-status-bar-right-button-group">
        <el-button
          v-if="features.isShowCoordinate && !isMobile"
          class="ml-status-bar-current-pos"
          >{{ posText }}</el-button
        >
        <ml-notification-button @click="toggleNotificationCenter" />
        <ml-theme-button
          :is-dark="props.isDark"
          :toggle-dark="props.toggleDark"
        />
        <ml-full-screen-button />
        <ml-point-style-button />
        <ml-osnap-button />
        <ml-setting-toggle-button
          setting="orthoMode"
          :on-icon="orthoMode"
          :off-icon="orthoMode"
          :on-tooltip="t('main.statusBar.orthoMode.on')"
          :off-tooltip="t('main.statusBar.orthoMode.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
        />
        <ml-polar-tracking-button />
        <ml-setting-toggle-button
          setting="lineWeightDisplay"
          :on-icon="lineWidth"
          :off-icon="lineWidth"
          :on-tooltip="t('main.statusBar.lineWidth.on')"
          :off-tooltip="t('main.statusBar.lineWidth.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
        />
        <ml-setting-toggle-button
          v-if="!isMobileOrPad"
          setting="dynamicInputMode"
          :on-icon="dynamicInput"
          :off-icon="dynamicInput"
          :on-tooltip="t('main.statusBar.dynamicInput.on')"
          :off-tooltip="t('main.statusBar.dynamicInput.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
          remember-last-enabled
        />
        <ml-setting-button />
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApplicationDocManager } from '@mlightcad/cad-simple-viewer'
import { ElButton, ElButtonGroup } from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  useCurrentPos,
  useDocument,
  useIsMobile,
  useSettings
} from '../../composable'
import { dynamicInput, lineWidth, orthoMode } from '../../svg'
import { MlSettingToggleButton } from '../common'
import MlFullScreenButton from './MlFullScreenButton.vue'
import MlNotificationButton from './MlNotificationButton.vue'
import MlOsnapButton from './MlOsnapButton.vue'
import MlPointStyleButton from './MlPointStyleButton.vue'
import MlPolarTrackingButton from './MlPolarTrackingButton.vue'
import MlSettingButton from './MlSettingButton.vue'
import MlThemeButton from './MlThemeButton.vue'

const props = defineProps<{
  isDark: boolean
  toggleDark: () => void
}>()

const { text: posText } = useCurrentPos(ApplicationDocManager.instance.curView)
const features = useSettings()
const { isDocumentOpening } = useDocument()
const { isMobile, isMobileOrPad } = useIsMobile()
const { t } = useI18n()
const isStatusBarDisabled = computed(() => isDocumentOpening.value)

const emit = defineEmits<{
  toggleNotificationCenter: []
}>()

const toggleNotificationCenter = () => {
  if (isStatusBarDisabled.value) return
  emit('toggleNotificationCenter')
}
</script>

<style scoped>
.ml-status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--el-fill-color);
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
}

.ml-status-bar.is-disabled {
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

.ml-status-bar-left {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.ml-status-bar-right {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.ml-status-bar-right > * {
  margin-left: 10px;
}

.ml-status-bar-right-button-group {
  border: none;
  padding: 0px;
  height: var(--ml-status-bar-height);
}

.ml-status-bar-current-pos {
  border: none;
  height: 100%;
  /*
   * Hold a baseline slot for coordinates so the buttons do not move while the
   * mouse moves.
   */
  min-width: 180px;
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
  justify-content: flex-start;
}
</style>
