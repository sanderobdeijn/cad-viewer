import { type Ref } from 'vue'

export interface UseRibbonContextualTabOptions {
  activeTabId: Ref<string>
  tabId: string
  commandGlobalNames: string | readonly string[]
  fallbackTabId?: string
}
