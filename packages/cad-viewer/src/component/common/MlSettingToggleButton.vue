<template>
  <ml-toggle-button
    v-model="isEnabled"
    :data="buttonData"
    @click="toggleSetting"
  />
</template>

<script lang="ts" setup>
import {
  ApplicationSettingManager,
  type ApplicationSettings
} from '@mlightcad/cad-simple-viewer'
import { computed, ref, watch } from 'vue'

import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import { useSettings } from '../../composable/useSettings'
import MlToggleButton, { type MlIconType } from './MlToggleButton.vue'

/** A setting that is on or off, or a number where `disabledValue` is off. */
type ToggleSetting = {
  [K in keyof ApplicationSettings]: ApplicationSettings[K] extends number | boolean
    ? K
    : never
}[keyof ApplicationSettings]

interface Props {
  setting: ToggleSetting
  onIcon: MlIconType
  offIcon: MlIconType
  onTooltip: string
  offTooltip: string
  onColor?: string
  offColor?: string
  disabledValue?: number
  enabledValue?: number
  rememberLastEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabledValue: 0,
  enabledValue: 1,
  rememberLastEnabled: false
})

const settings = useSettings()
const lastEnabledValue = ref(
  props.rememberLastEnabled
    ? Number(ApplicationSettingManager.instance.get(props.setting))
    : props.enabledValue
)

watch(
  () => settings[props.setting],
  value => {
    if (!props.rememberLastEnabled || typeof value !== 'number') return
    if (Number.isNaN(value) || value === props.disabledValue) return
    lastEnabledValue.value = value
  },
  { immediate: true }
)

const buttonData = computed(() =>
  markComponentConfigRaw({
    onIcon: props.onIcon,
    offIcon: props.offIcon,
    onTooltip: props.onTooltip,
    offTooltip: props.offTooltip,
    onColor: props.onColor,
    offColor: props.offColor
  })
)

const isEnabled = computed(() => {
  const value = settings[props.setting]
  return typeof value === 'boolean'
    ? value
    : Number(value ?? props.disabledValue) !== props.disabledValue
})

const toggleSetting = () => {
  const manager = ApplicationSettingManager.instance
  const current = manager.get(props.setting)
  if (typeof current === 'boolean') {
    manager.set(props.setting, !current as never)
    return
  }
  const nextValue = isEnabled.value
    ? props.disabledValue
    : props.rememberLastEnabled
      ? lastEnabledValue.value
      : props.enabledValue
  manager.set(props.setting, nextValue as never)
}
</script>
