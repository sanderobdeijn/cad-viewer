import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerLazySvgPlugin } from '@mlightcad/cad-svg-plugin/register'

let isLazyPluginRegistered = false

/**
 * Registers export plugins used by this example.
 *
 * Import from each plugin's `/register` subpath so only the registration stub is in the
 * initial bundle; plugin code loads when a trigger command runs.
 * Safe to call multiple times; registration runs once per application lifetime.
 */
export const registerLazyPlugins = async () => {
  if (isLazyPluginRegistered) {
    return
  }
  isLazyPluginRegistered = true

  registerLazySvgPlugin(AcApDocManager.instance.pluginManager)
}
