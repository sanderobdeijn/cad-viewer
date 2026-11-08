/**
 * Modal ACI index color dialog (no true-color tab).
 *
 * @module UIAciColorDialog
 * @packageDocumentation
 */

import type { EditorUiTheme } from '../editor/global/EditorUiTheme'
import {
  type UIAciIndexPicker,
  uiCreateAciIndexPicker
} from './UIAciPaletteUi'
import { UIDialog } from './UIDialog'

/** Localized labels for {@link UIAciColorDialog}. */
export interface UIAciColorDialogLabels {
  /** Dialog title. */
  title: string
  /** Accessible label for the header close button. */
  close: string
  /** Confirm button. */
  ok: string
  /** Cancel button. */
  cancel: string
  /** Prefix for the index line, e.g. `"Color Index: "`. */
  index: string
  /** Prefix for the RGB line, e.g. `"RGB: "`. */
  rgb: string
  /** Label beside the manual input. */
  input: string
  /** Placeholder for the manual input. */
  inputPlaceholder: string
}

/** Options for {@link UIAciColorDialog.open}. */
export interface UIAciColorDialogOptions {
  labels: UIAciColorDialogLabels
  /** Host that receives the backdrop. @default `document.body` */
  host?: HTMLElement
  /** Theme tokens applied to the backdrop. */
  theme?: EditorUiTheme
  /** Initial ACI index (1–255). */
  initialIndex?: number | null
}

/**
 * Index-only color dialog: ACI palettes, preview swatch, and numeric input.
 * Omits the true-color tab and ByLayer / ByBlock actions.
 */
export class UIAciColorDialog extends UIDialog {
  /** Index picker mounted in the dialog body. */
  private readonly picker: UIAciIndexPicker

  /** Confirmed index, or `null` when dismissed. */
  private result: number | null = null

  private constructor(options: UIAciColorDialogOptions) {
    super({
      host: options.host,
      title: options.labels.title,
      closeLabel: options.labels.close,
      dialogClassName: 'ml-ui-aci-color-dialog',
      theme: options.theme
    })

    this.picker = uiCreateAciIndexPicker({
      labels: {
        index: options.labels.index,
        rgb: options.labels.rgb,
        input: options.labels.input,
        inputPlaceholder: options.labels.inputPlaceholder
      },
      initialIndex: options.initialIndex ?? null,
      showByLayerByBlock: false
    })
    this.bodyEl.appendChild(this.picker.root)

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary'
    cancelBtn.textContent = options.labels.cancel
    cancelBtn.addEventListener('click', () => {
      this.result = null
      this.close()
    })

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-dialog-btn'
    okBtn.textContent = options.labels.ok
    okBtn.addEventListener('click', () => {
      const index = this.picker.getIndex()
      this.result =
        index != null && index >= 1 && index <= 255 ? index : null
      this.close()
    })

    this.footerEl.append(cancelBtn, okBtn)
    this.focusAfterOpen(okBtn)
  }

  /**
   * Opens the dialog and resolves with the confirmed ACI index, or `null`
   * when the user cancels, presses Escape, or clicks the backdrop.
   *
   * @param options - Labels, host, theme, and initial selection.
   */
  static open(options: UIAciColorDialogOptions): Promise<number | null> {
    const dialog = new UIAciColorDialog(options)
    return dialog.show().then(() => dialog.result)
  }

  override close(): void {
    this.picker.dispose()
    super.close()
  }
}
