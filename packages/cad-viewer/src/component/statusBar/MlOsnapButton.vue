<template>
  <el-tooltip :content="t('main.statusBar.osnap.tooltip')" :hide-after="0">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-button class="ml-osnap-setting-button" :icon="osnap" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="mode in osnapModes"
            :key="mode.value"
            :command="mode.value"
            :icon="
              applicationHasOsnapMode(features.osnapModes, mode.value)
                ? Check
                : undefined
            "
          >
            {{ mode.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Check } from '@element-plus/icons-vue'
import {
  applicationHasOsnapMode,
  ApplicationOsnapMode,
  applicationToggleOsnapMode
} from '@mlightcad/cad-simple-viewer'
import { ApplicationSettingManager } from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElTooltip
} from 'element-plus'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'
import { osnap } from '../../svg'

const { t } = useI18n()
const features = useSettings()

/**
 * All object snap modes generated from ApplicationOsnapMode enum.
 *
 * Label key format:
 *   main.statusBar.osnap.<LowerCaseEnumName>
 *
 * Example:
 *   ApplicationOsnapMode.EndPoint → main.statusBar.osnap.endpoint
 */
const osnapModes = [
  { value: ApplicationOsnapMode.EndPoint, label: t('main.statusBar.osnap.endpoint') },
  { value: ApplicationOsnapMode.MidPoint, label: t('main.statusBar.osnap.midpoint') },
  { value: ApplicationOsnapMode.Center, label: t('main.statusBar.osnap.center') },
  { value: ApplicationOsnapMode.Node, label: t('main.statusBar.osnap.node') },
  { value: ApplicationOsnapMode.Quadrant, label: t('main.statusBar.osnap.quadrant') },
  {
    value: ApplicationOsnapMode.Intersection,
    label: t('main.statusBar.osnap.intersection')
  },
  {
    value: ApplicationOsnapMode.Insertion,
    label: t('main.statusBar.osnap.insertion')
  },
  { value: ApplicationOsnapMode.Nearest, label: t('main.statusBar.osnap.nearest') }
  // { value: ApplicationOsnapMode.Perpendicular, label: t('main.statusBar.osnap.perpendicular') },
  // { value: ApplicationOsnapMode.Tangent, label: t('main.statusBar.osnap.tangent') },
  // { value: ApplicationOsnapMode.Centroid, label: t('main.statusBar.osnap.centroid') }
]

/**
 * Toggle osnap mode and update the bitmask.
 */
const handleCommand = (mode: ApplicationOsnapMode) => {
  features.osnapModes = applicationToggleOsnapMode(features.osnapModes, mode)
  ApplicationSettingManager.instance.osnapModes = features.osnapModes
}
</script>

<style scoped>
.ml-osnap-setting-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
