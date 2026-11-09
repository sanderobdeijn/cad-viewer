<template>
  <el-tooltip :content="t('main.statusBar.setting.tooltip')" :hide-after="0">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-button class="ml-setting-button" :icon="Setting" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            :icon="features.isShowCommandLine ? Check : ''"
            command="isShowCommandLine"
          >
            {{ t('main.statusBar.setting.commandLine') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowEntityInfo ? Check : ''"
            command="isShowEntityInfo"
          >
            {{ t('main.statusBar.setting.entityInfo') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowRibbon ? Check : ''"
            command="isShowRibbon"
          >
            {{ t('main.statusBar.setting.ribbon') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowCoordinate ? Check : ''"
            command="isShowCoordinate"
          >
            {{ t('main.statusBar.setting.coordinate') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowToolbar ? Check : ''"
            command="isShowToolbar"
          >
            {{ t('main.statusBar.setting.toolbar') }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Check, Setting } from '@element-plus/icons-vue'
import { ApplicationSettingManager, ApplicationSettings } from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElTooltip
} from 'element-plus'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'

const { t } = useI18n()
const features = useSettings()

const handleCommand = (command: keyof ApplicationSettings) => {
  if (command == 'isShowCoordinate') {
    features.isShowCoordinate = !features.isShowCoordinate
    ApplicationSettingManager.instance.isShowCoordinate = features.isShowCoordinate
  } else if (command == 'isShowCommandLine') {
    features.isShowCommandLine = !features.isShowCommandLine
    ApplicationSettingManager.instance.isShowCommandLine = features.isShowCommandLine
  } else if (command == 'isShowEntityInfo') {
    features.isShowEntityInfo = !features.isShowEntityInfo
    ApplicationSettingManager.instance.isShowEntityInfo = features.isShowEntityInfo
  } else if (command == 'isShowRibbon') {
    features.isShowRibbon = !features.isShowRibbon
    ApplicationSettingManager.instance.isShowRibbon = features.isShowRibbon
  } else if (command == 'isShowToolbar') {
    features.isShowToolbar = !features.isShowToolbar
    ApplicationSettingManager.instance.isShowToolbar = features.isShowToolbar
  }
}
</script>

<style scoped>
.ml-setting-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
