<template>
  <div class="st-root">
    <!-- Callout lives OUTSIDE the toolbar border so it is not considered part
         of the shortcut toolbar. It sits to the left of the toolbar. -->
    <template v-if="highlightAccessory">
      <div class="st-callout-box" aria-hidden="true">
        <div class="st-callout-label">{{ calloutLabel }}</div>
        <div class="st-callout-arrow"></div>
      </div>
    </template>

    <div class="st-toolbar" role="toolbar" aria-label="Shortcut toolbar">
      <!-- Selection session accessory (left of divider) -->
      <div class="st-accessory-wrap" :class="{ 'is-highlighted': highlightAccessory }">
        <div class="st-accessory" role="toolbar" aria-label="Selection accessory">
          <button class="st-swatch" type="button" :title="labels.color" :aria-label="labels.color">
            <span class="st-swatch-fill"></span>
          </button>
          <button class="st-text-height" type="button" :title="labels.fontSize" :aria-label="labels.fontSize">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <text x="2" y="18" font-family="Georgia, Times New Roman, serif" font-size="16" font-weight="600" fill="currentColor">A</text>
              <g stroke="#2dd4bf" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <path d="M18 4v16" />
                <path d="M15.5 6.5 18 4l2.5 2.5" />
                <path d="M15.5 17.5 18 20l2.5-2.5" />
              </g>
            </svg>
          </button>
        </div>
      </div>

      <div class="st-divider" aria-hidden="true"></div>

      <!-- Shortcut actions -->
      <div class="st-actions">
        <button class="st-btn" type="button" :title="labels.delete" :aria-label="labels.delete">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm4-4h4l1 2h5v2H4V5h5l1-2z"/>
          </svg>
        </button>
        <div class="st-divider" aria-hidden="true"></div>
        <button class="st-btn st-btn-expand" type="button" :title="labels.expand" :aria-label="labels.expand">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M9 6 7.6 7.4 12.2 12l-4.6 4.6L9 18l6-6z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Labels {
  color: string
  fontSize: string
  delete: string
  more: string
  expand: string
  /** Default callout label */
  accessoryLabel: string
}

const labels: Labels = {
  color: 'Color',
  fontSize: 'Text height',
  delete: 'Delete',
  more: 'More',
  expand: 'Expand',
  accessoryLabel: 'Selection session accessory',
}

const props = withDefaults(defineProps<{
  highlightAccessory?: boolean
  accessoryLabelOverride?: string
}>(), {
  highlightAccessory: false,
  accessoryLabelOverride: '',
})

const calloutLabel = computed(() =>
  props.accessoryLabelOverride || labels.accessoryLabel
)
</script>

<style>
/* Outer wrapper centers callout + toolbar together */
.st-root {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.st-toolbar {
  color-scheme: dark;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px;
  background: rgba(28, 30, 34, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

/* ---- Accessory ---- */
.st-accessory-wrap {
  display: inline-block;
  position: relative;
}
.st-accessory-wrap.is-highlighted .st-accessory {
  outline: 2px solid #ff4d4f;
  outline-offset: 2px;
  border-radius: 6px;
}
.st-accessory {
  display: flex;
  align-items: center;
  gap: 4px;
}
.st-swatch,
.st-text-height {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #e8eaed;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 0;
}
.st-swatch { position: relative; }
.st-swatch-fill {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.4);
  background: #1a8cff;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
}
.st-text-height svg {
  display: block;
  width: 18px;
  height: 18px;
}

/* ---- Callout (outside toolbar) ---- */
.st-callout-box {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.st-callout-arrow {
  width: 26px;
  height: 2px;
  background: #ff4d4f;
  position: relative;
  flex-shrink: 0;
}
.st-callout-arrow::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 50%;
  transform: translateY(-50%);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 8px solid #ff4d4f;
}
.st-callout-label {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #ff4d4f;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.35);
}

/* ---- Divider ---- */
.st-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.18);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ---- Actions ---- */
.st-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.st-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #c4c9d0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.st-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
.st-btn svg {
  display: block;
  width: 20px;
  height: 20px;
}
/* Narrow expand button: arrow width + small margins, like the real shortcut toolbar */
.st-btn-expand {
  width: 16px;
  height: 32px;
  margin-left: -4px;
  margin-right: -4px;
  border-radius: 4px;
}
.st-btn-expand svg {
  width: 14px;
  height: 14px;
}
</style>
