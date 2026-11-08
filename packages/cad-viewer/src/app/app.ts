import 'element-plus/dist/index.css'
import '../style/style.css'
import '../style/index.scss'

import {
  ApplicationDocManager,
  ApplicationDocManagerOptions
} from '@mlightcad/cad-simple-viewer'

import { registerCadViewerNotificationCenter } from './cadViewerNotificationCenter'
import { registerCmds, registerDialogs } from './register'

/** Options for {@link initializeCadViewer}. */
export type InitializeCadViewerOptions = ApplicationDocManagerOptions

export const initializeCadViewer = (
  options: InitializeCadViewerOptions = {}
) => {
  ApplicationDocManager.createInstance({
    ...options,
    // Keep the shared event bridge; Vue panel replaces the built-in DOM UI.
    notificationCenter: {
      showDefaultUi: false,
      host: options.busyIndicatorHost ?? options.container
    }
  })
  registerCadViewerNotificationCenter()
  registerCmds()
  registerDialogs()
}
