/** Unit tests for toolbar item resolution and open-mode visibility filtering. */
jest.mock('@mlightcad/cad-simple-viewer', () => {
  const { createCadSimpleViewerMock } = require('./helpers/mockCadSimpleViewer')
  const openMode = jest.requireActual(
    '../../cad-simple-viewer/src/editor/view/AcEdOpenMode'
  ) as typeof import('../../cad-simple-viewer/src/editor/view/AcEdOpenMode')

  return createCadSimpleViewerMock({
    AcApDocManager: {
      instance: {
        curDocument: undefined,
        isReadingModeEnabled: () => false
      }
    },
    AcApSettingManager: {
      instance: {
        get: () => true,
        toggle: jest.fn()
      }
    },
    isMeasurementVisible: () => true,
    AcEdOpenMode: openMode.AcEdOpenMode
  })
})

jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: jest.fn()
    }
  })
}))

import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'

import { acuiCreateDefaultToolbarItems } from '../src/config/defaultToolbarItems'
import { acuiMergeToolbarOptionsForLayout } from '../src/config/mergeToolbarOptionsForLayout'
import {
  acuiCreateDefaultToolbarPresetMap,
  acuiFilterVisibleToolbarItems,
  acuiIsToolbarItemVisible,
  acuiResolveEffectiveToolbarItem,
  acuiResolveParentToolbarDisplay,
  acuiResolveSelectedChildItem,
  acuiResolveToolbarItems
} from '../src/config/resolveToolbarItems'
import {
  acuiCreateToolbarSeparator,
  acuiIsDynamicToolbarChildren
} from '../src/config/toolbarItemUtils'

describe('acuiResolveToolbarItems', () => {
  it('returns default items when items is default', () => {
    const items = acuiResolveToolbarItems({ items: 'default' })
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].id).toBe('select')
    expect(items[1].id).toBe('pan')
    expect(items.some(item => item.id === 'open')).toBe(false)
  })

  it('returns phone default items when layout is phone', () => {
    const items = acuiResolveToolbarItems({ items: 'default' }, undefined, 'phone')
    expect(items.map(item => item.id)).toEqual([
      'zoom',
      'find',
      'measure',
      'layout',
      'settings'
    ])
    expect(items[0].children?.some(child => child.id === 'zoom-saved')).toBe(
      true
    )
    expect(
      items[0].children?.some(child => child.id === 'zoom-smart-extents')
    ).toBe(true)
  })

  it('binds the find button to the find command on desktop and phone', () => {
    const desktop = acuiCreateDefaultToolbarItems().find(
      item => item.id === 'find'
    )
    expect(desktop?.command).toBe('find')
    expect(desktop?.label).toBe('toolbar.find')
    expect(desktop?.icon).toContain('<svg')
    const phone = acuiResolveToolbarItems(
      { items: 'default' },
      undefined,
      'phone'
    ).find(item => item.id === 'find')
    expect(phone?.command).toBe('find')
  })

  it('omits excluded root item ids', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      excludeItems: ['select', 'pan']
    })
    expect(items.some(item => item.id === 'select')).toBe(false)
    expect(items.some(item => item.id === 'pan')).toBe(false)
    expect(items[0].id).toBe('zoom')
  })

  it('keeps excluded ids when excludeItems is empty', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      excludeItems: []
    })
    expect(items[0].id).toBe('select')
    expect(items[1].id).toBe('pan')
  })

  it('applies pad built-in excludeItems after resolving defaults', () => {
    const merged = acuiMergeToolbarOptionsForLayout('pad', undefined, undefined)
    const items = acuiResolveToolbarItems(merged, undefined, 'pad')
    expect(items.some(item => item.id === 'select')).toBe(false)
    expect(items.some(item => item.id === 'pan')).toBe(false)
    expect(items[0].id).toBe('zoom')
  })

  it('appends custom items after defaults', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'custom', command: 'test' }]
    })
    expect(items.some(item => item.id === 'custom')).toBe(true)
    expect(items[items.length - 1].id).toBe('custom')
  })

  it('inserts appendItems after a root toolbar item id', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsAfter: 'find'
    })
    const findIndex = items.findIndex(item => item.id === 'find')
    expect(items[findIndex + 1]?.id).toBe('agent')
  })

  it('inserts appendItems before a root toolbar item id', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsBefore: 'measure'
    })
    const measureIndex = items.findIndex(item => item.id === 'measure')
    expect(items[measureIndex - 1]?.id).toBe('agent')
  })

  it('prefers appendItemsBefore over appendItemsAfter', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'agent', command: 'agent' }],
      appendItemsAfter: 'select',
      appendItemsBefore: 'measure'
    })
    const measureIndex = items.findIndex(item => item.id === 'measure')
    expect(items[measureIndex - 1]?.id).toBe('agent')
    expect(items.findIndex(item => item.id === 'select') + 1).not.toBe(
      items.findIndex(item => item.id === 'agent')
    )
  })

  it('falls back to the end when the append anchor is missing', () => {
    const items = acuiResolveToolbarItems({
      items: 'default',
      appendItems: [{ id: 'custom', command: 'test' }],
      appendItemsAfter: 'missing-item'
    })
    expect(items[items.length - 1].id).toBe('custom')
  })

  it('uses custom item list when provided', () => {
    const items = acuiResolveToolbarItems({
      items: [{ id: 'only', command: 'only' }]
    })
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('only')
  })
})

describe('toolbar visibility', () => {
  it('keeps default items visible in read mode', () => {
    const defaults = acuiCreateDefaultToolbarItems()
    const visible = acuiFilterVisibleToolbarItems(defaults, AcEdOpenMode.Read)
    expect(visible.some(item => item.id === 'settings')).toBe(true)
    expect(visible.some(item => item.id === 'layout')).toBe(true)
    expect(visible.some(item => item.id === 'select')).toBe(true)
  })

  it('respects minOpenMode on individual items', () => {
    expect(
      acuiIsToolbarItemVisible(
        { id: 'x', minOpenMode: AcEdOpenMode.Write },
        AcEdOpenMode.Read
      )
    ).toBe(false)
    expect(
      acuiIsToolbarItemVisible(
        { id: 'x', minOpenMode: AcEdOpenMode.Write },
        AcEdOpenMode.Write
      )
    ).toBe(true)
  })

  it('filters nested submenu children by open mode', () => {
    const items = [
      {
        id: 'parent',
        children: [
          { id: 'read-child', command: 'a' },
          {
            id: 'write-child',
            command: 'b',
            minOpenMode: AcEdOpenMode.Write
          }
        ]
      }
    ]
    const visible = acuiFilterVisibleToolbarItems(items, AcEdOpenMode.Read)
    expect(visible[0].children?.map(child => child.id)).toEqual(['read-child'])
  })
})

describe('acuiResolveEffectiveToolbarItem', () => {
  it('uses off branch when toggle value is false', () => {
    const item = acuiResolveEffectiveToolbarItem({
      id: 'toggle',
      toggle: {
        getValue: () => false,
        on: { label: 'on-label', command: 'on-cmd' },
        off: { label: 'off-label', command: 'off-cmd' }
      }
    })
    expect(item.label).toBe('off-label')
    expect(item.command).toBe('off-cmd')
  })
})

describe('default toolbar items', () => {
  it('has no export button and includes a settings strip with theme and placement', () => {
    const items = acuiCreateDefaultToolbarItems()
    expect(items.find(item => item.id === 'export')).toBeUndefined()
    const settings = items.find(item => item.id === 'settings')
    expect(settings?.childrenUi).toBe('toolbar')
    const childIds = settings?.children?.map(child => child.id) ?? []
    expect(childIds).toContain('simulated-mouse')
    expect(childIds).toContain('theme')
    expect(childIds).not.toContain('locale')
    expect(childIds).toContain('toolbar-placement')
  })

  it('exposes reading mode as a toggle and disables switch-bg while reading mode is on', () => {
    const items = acuiCreateDefaultToolbarItems()
    const settings = items.find(item => item.id === 'settings')
    const readingMode = settings?.children?.find(
      child => child.id === 'reading-mode'
    )
    const switchBg = settings?.children?.find(child => child.id === 'switch-bg')

    expect(readingMode?.toggle?.getValue).toEqual(expect.any(Function))
    expect(readingMode?.toggle?.on.command).toBe('readingmode')
    expect(readingMode?.toggle?.off.command).toBe('readingmode')
    expect(readingMode?.toggle?.getValue()).toBe(false)

    expect(switchBg?.disabled).toEqual(expect.any(Function))
    expect(typeof switchBg?.disabled === 'function' && switchBg.disabled()).toBe(
      false
    )
  })

  it('places toolbar placement before theme inside settings', () => {
    const items = acuiCreateDefaultToolbarItems()
    const settings = items.find(item => item.id === 'settings')
    const childIds = settings?.children?.map(child => child.id) ?? []
    const themeIndex = childIds.indexOf('theme')
    expect(childIds[themeIndex - 1]).toBe('toolbar-placement')
  })

  it('places the layout switcher after find', () => {
    const items = acuiCreateDefaultToolbarItems()
    const findIndex = items.findIndex(item => item.id === 'find')
    expect(items[findIndex + 1]?.id).toBe('layout')
    expect(items[findIndex + 1]?.childrenUi).toBe('menu')
    expect(items[findIndex + 1]?.icon).toContain('rect x="2" y="2" width="8.2"')
    expect(items[findIndex + 2]?.id).toBe('measure')
  })

  it('includes a separator before the settings button', () => {
    const items = acuiCreateDefaultToolbarItems()
    const settingsIndex = items.findIndex(item => item.id === 'settings')
    expect(settingsIndex).toBeGreaterThan(0)
    expect(items[settingsIndex - 1]).toEqual({
      type: 'separator',
      id: 'sep-settings'
    })
  })

  it('uses selected child icon for toolbar placement', () => {
    const items = acuiCreateDefaultToolbarItems()
    const settings = items.find(item => item.id === 'settings')
    expect(
      settings?.children?.find(child => child.id === 'toolbar-placement')
        ?.childIcon
    ).toBe('selected')
    expect(items.find(item => item.id === 'measure')?.childIcon).toBeUndefined()
  })

  it('places measurement visibility in the measure submenu', () => {
    const items = acuiCreateDefaultToolbarItems()
    const measure = items.find(item => item.id === 'measure')
    expect(
      measure?.children?.map(child =>
        child.type === 'separator'
          ? 'separator'
          : (child.command ?? child.toggle?.on.command)
      )
    ).toEqual([
      'measuredistance',
      'measurecontinuous',
      'measureangle',
      'measurearea',
      'measurearc',
      'measurepoint',
      'measurementpanel',
      'measurementvis',
      'clearmeasurements',
      'separator',
      'measurementimport',
      'measurementexport'
    ])
    expect(
      measure?.children?.find(child => child.id === 'measurement-vis')?.toggle
    ).toBeDefined()
  })

  it('uses dismissible sub-toolbars for measure and settings', () => {
    const items = acuiCreateDefaultToolbarItems()
    const settings = items.find(item => item.id === 'settings')
    expect(items.find(item => item.id === 'measure')?.childrenUi).toBe('toolbar')
    expect(items.find(item => item.id === 'layout')?.childrenUi).toBe('menu')
    expect(settings?.childrenUi).toBe('toolbar')
    expect(
      settings?.children?.find(child => child.id === 'toolbar-placement')
        ?.childrenUi
    ).toBe('toolbar')
  })

  it('uses the same measurement submenu icons as cad-viewer', () => {
    const items = acuiCreateDefaultToolbarItems()
    const measure = items.find(item => item.id === 'measure')
    const iconOf = (id: string) =>
      measure?.children?.find(child => child.id === id)?.icon

    expect(iconOf('measure-distance')).toContain('M4.4 6.9 7.2 5.05v3.7Z')
    expect(iconOf('measure-distance')).toContain('--el-color-primary')
    expect(iconOf('measure-continuous')).toContain('M4.4 6.9 7.2 5.05v3.7Z')
    expect(iconOf('measure-continuous')).toContain('>n</text>')
    expect(iconOf('measure-continuous')).toContain('--el-color-primary')
    expect(iconOf('measure-angle')).toContain('M16.9 12.25H4.9L11.6 3.03')
    expect(iconOf('measure-angle')).toContain('--el-color-primary')
    expect(iconOf('measure-area')).toContain('M5 12V4.2A7.8 7.8 0 0 1 12.8 12Z')
    expect(iconOf('measure-area')).toContain('--el-color-primary')
    expect(iconOf('measure-arc')).toContain('M4.9 11.6A8.3 8.3 0 0 1 13.2 3.3')
    expect(iconOf('measure-arc')).toContain('--el-color-primary')
    expect(iconOf('measure-point')).toContain('M4 4.8v7.4h7.6')
    expect(iconOf('measure-point')).toContain('--el-color-primary')
    expect(iconOf('measurement-panel')).toContain('M3.5 6.5h13')
    expect(iconOf('measurement-panel')).toContain('cx="14.5" cy="14.7" r="4.2"')
    expect(iconOf('measurement-panel')).toContain('--el-color-primary')
    expect(iconOf('clear-measurements')).toContain('viewBox="0 0 512 512"')
    expect(iconOf('clear-measurements')).toContain('M 459.5 0')
    expect(iconOf('measurement-import')).toContain('M4.5 2h6.4L15.5 6.6')
    expect(iconOf('measurement-export')).toContain('M15.5 2H9.1L4.5 6.6')
    expect(
      measure?.children?.find(child => child.id === 'measurement-vis')?.toggle
        ?.on.icon
    ).toContain('M512 160c320 0 512 352')
  })
})

describe('parent toolbar display', () => {
  it('keeps parent icon when childIcon is fixed', () => {
    const parent = acuiResolveParentToolbarDisplay({
      id: 'measure',
      icon: 'parent-icon',
      childIcon: 'fixed',
      children: [{ id: 'child', icon: 'child-icon', command: 'x' }]
    })
    expect(parent.icon).toBe('parent-icon')
  })

  it('uses selected child icon when childIcon is selected', () => {
    const parent = acuiResolveParentToolbarDisplay(
      {
        id: 'export',
        label: 'toolbar.export',
        icon: 'parent-icon',
        childIcon: 'selected',
        selectedChildId: 'export-pdf',
        children: [
          { id: 'export-html', icon: 'html-icon', command: 'chtml' },
          { id: 'export-pdf', icon: 'pdf-icon', command: 'cpdf' }
        ]
      },
      'export-pdf'
    )
    expect(parent.icon).toBe('pdf-icon')
    expect(parent.label).toBe('toolbar.export')
  })

  it('resolves active child by runtime selection first', () => {
    const child = acuiResolveSelectedChildItem(
      {
        id: 'export',
        selectedChildId: 'export-html',
        children: [
          { id: 'export-html', icon: 'html-icon' },
          { id: 'export-pdf', icon: 'pdf-icon' }
        ]
      },
      'export-pdf'
    )
    expect(child?.id).toBe('export-pdf')
  })
})

describe('toolbar presets and separators', () => {
  it('expands preset references in a custom layout', () => {
    const items = acuiResolveToolbarItems({
      items: [
        { preset: 'select' },
        { preset: 'pan' },
        acuiCreateToolbarSeparator('sep-tools'),
        { preset: 'measure' }
      ]
    })
    expect(
      items.map(item => ('preset' in item ? item.preset : item.id))
    ).toEqual(['select', 'pan', 'sep-tools', 'measure'])
    expect(items[3].children?.length).toBeGreaterThan(0)
  })

  it('keeps desktop labels for shared presets and still resolves phone-only ids', () => {
    const items = acuiResolveToolbarItems({
      items: [
        { preset: 'find' },
        { preset: 'zoom' },
        { preset: 'settings' }
      ]
    })
    expect(items[0].id).toBe('find')
    expect(items[1].id).toBe('zoom')
    expect(items[2].id).toBe('settings')
  })

  it('does not let phone variants overwrite desktop shared presets', () => {
    const desktop = acuiCreateDefaultToolbarPresetMap(undefined, 'desktop')
    expect(desktop.get('zoom')?.id).toBe('zoom')
    expect(desktop.get('settings')?.id).toBe('settings')

    const phone = acuiCreateDefaultToolbarPresetMap(undefined, 'phone')
    expect(phone.get('zoom')?.id).toBe('zoom')
  })

  it('preserves live layout children when expanding the layout preset', () => {
    const items = acuiResolveToolbarItems({
      items: [{ preset: 'layout' }]
    })
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('layout')
    expect(acuiIsDynamicToolbarChildren(items[0])).toBe(true)
    expect(items[0].childrenUi).toBe('menu')
  })

  it('keeps separators when filtering by open mode', () => {
    const items = acuiResolveToolbarItems({
      items: [
        { preset: 'select' },
        acuiCreateToolbarSeparator(),
        { preset: 'measure' }
      ]
    })
    const visible = acuiFilterVisibleToolbarItems(items, AcEdOpenMode.Read)
    expect(visible.some(item => item.type === 'separator')).toBe(true)
    expect(visible.some(item => item.id === 'select')).toBe(true)
    expect(visible.some(item => item.id === 'measure')).toBe(true)
  })
})
