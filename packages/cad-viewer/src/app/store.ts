import { reactive } from 'vue'

export const store = reactive({
  dialogs: {
    toolPalette: false,
    activePaletteTab: 'measurements'
  },
  /**
   * Bumped by the MEM command after publishing a fresh snapshot so an already
   * mounted Memory palette can pick it up without remounting.
   */
  memoryProfileTick: 0
})
