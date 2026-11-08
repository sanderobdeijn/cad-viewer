import { ApplicationSettingManager, ApplicationSettings } from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

export function useSettings() {
  const settings = reactive<ApplicationSettings>(ApplicationSettingManager.instance.settings)

  ApplicationSettingManager.instance.events.modified.addEventListener(args => {
    // @ts-expect-error Hard to describe its type
    settings[args.key] = args.value
  })

  return settings
}
