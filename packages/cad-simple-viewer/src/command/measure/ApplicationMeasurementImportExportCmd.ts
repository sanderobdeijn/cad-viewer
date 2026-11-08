import { ApplicationContext } from '../../app'
import {
  EditorCommand,
  EditorOpenMode,
  EditorPromptStringOptions
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { ThreeRendererView2d } from '../../view'
import { placeMeasurementRecord } from './ApplicationMeasurementPlace'
import {
  measurementSidecarFileName,
  parseMeasurementSidecar,
  stringifyMeasurementSidecar
} from './ApplicationMeasurementSidecar'
import {
  collectMeasurementRecords,
  runMeasurementEdit
} from './ApplicationMeasurementStore'

function downloadText(filename: string, text: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pickJsonFile(): Promise<string | undefined> {
  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      resolve(undefined)
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    let settled = false
    const finish = (text?: string) => {
      if (settled) return
      settled = true
      resolve(text)
    }
    input.addEventListener('cancel', () => finish())
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        finish()
        return
      }
      finish(await file.text())
    }
    input.click()
  })
}

/**
 * Export current measurements to a `{drawing}.measurement.json` download.
 */
export class ApplicationMeasurementExportCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  async execute(context: ApplicationContext) {
    const view = context.view as ThreeRendererView2d
    const drawingName = context.doc.fileName || context.doc.docTitle
    const text = stringifyMeasurementSidecar({
      version: 1,
      drawingName,
      measurements: collectMeasurementRecords(view)
    })
    downloadText(measurementSidecarFileName(drawingName), text)
  }
}

/**
 * Import measurements from a sidecar JSON file and place them on the view.
 */
export class ApplicationMeasurementImportCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  async execute(context: ApplicationContext) {
    // Keep a prompt in i18n for hosts that show status text before the picker.
    void new EditorPromptStringOptions(
      ApplicationI18n.t('jig.measurement.import.chooseFile')
    )
    const text = await pickJsonFile()
    if (text == null) return
    let sidecar
    try {
      sidecar = parseMeasurementSidecar(text)
    } catch (err) {
      console.error(err)
      return
    }
    const view = context.view as ThreeRendererView2d
    runMeasurementEdit(() => {
      for (const record of sidecar.measurements) {
        placeMeasurementRecord(view, record)
      }
    })
  }
}
