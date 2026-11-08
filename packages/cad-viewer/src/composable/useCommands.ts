import { EditorOpenMode } from '@mlightcad/cad-simple-viewer'

export interface CommandInfo {
  globalName: string
  commandName: string
  groupName: string
  mode: EditorOpenMode
}
