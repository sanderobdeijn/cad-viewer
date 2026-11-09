import { CommonColor } from '@mlightcad/common'
import type { ThreeRendererHtmlGroup } from '@mlightcad/three-renderer'

import {
  collectMeasurementRecords,
  commitMeasurementGroup,
  MEASUREMENT_LAYER,
  resetMeasurementSession
} from '../src/command/measure/ApplicationMeasurementStore'
import type { ApplicationMeasurementRecord } from '../src/command/measure/ApplicationMeasurementTypes'
import {
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT,
  OVERLAY_HAIRLINE_LINE_WEIGHT
} from '../src/util/ApplicationMeasurementUtil'
import type { ThreeRendererView2d } from '../src/view'

function createView() {
  const groups = new Map<string, ThreeRendererHtmlGroup>()
  const manager = {
    groupsOnLayer(layer: string) {
      return [...groups.values()].filter(group => group.layer === layer)
    },
    add(group: ThreeRendererHtmlGroup) {
      groups.set(group.id, group)
    },
    detach(id: string) {
      const group = groups.get(id)
      groups.delete(id)
      return group
    },
    reattach(group: ThreeRendererHtmlGroup) {
      groups.set(group.id, group)
    },
    has(id: string) {
      return groups.has(id)
    },
    getGroup(id: string) {
      return groups.get(id)
    }
  }
  const view = {
    htmlTransientManager: manager,
    isDirty: false,
    isHtmlDirty: false,
    internalCamera: { zoom: 1 },
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * 10,
      y: p.y * 10
    }),
    removeTransientEntity: jest.fn(),
    addTransientEntity: jest.fn(),
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    setTransientEntityVisible: jest.fn()
  } as unknown as ThreeRendererView2d
  return { view, manager }
}

function makeGroup(id: string): ThreeRendererHtmlGroup {
  return {
    id,
    layer: MEASUREMENT_LAYER,
    children: [],
    canvases: [],
    dispose: jest.fn()
  } as unknown as ThreeRendererHtmlGroup
}

function hairlineSnapshot(id: string): ApplicationMeasurementRecord {
  return {
    id,
    type: 'point',
    style: {
      color: 'rgb(10,20,30)',
      lineWeight: MEASUREMENT_LINE_WEIGHT,
      fontSize: MEASUREMENT_FONT_SIZE,
      textHeightWcs: 1.3,
      // Legacy field ignored on export.
      strokeWidthWcs: 0.25
    },
    geometry: { type: 'point', position: { x: 1, y: 2 } }
  }
}

describe('ApplicationMeasurementStore hairline stroke', () => {
  afterEach(() => {
    resetMeasurementSession()
  })

  it('does not invent a 0 WCS stroke for a hairline snapshot', () => {
    const { view } = createView()
    const group = makeGroup('hairline-commit')
    const color = new CommonColor()
    color.setRGB(8, 232, 222)
    commitMeasurementGroup(view, group, {
      style: {
        color,
        lineWeight: OVERLAY_HAIRLINE_LINE_WEIGHT,
        fontSize: MEASUREMENT_FONT_SIZE
      },
      snapshot: {
        id: group.id,
        type: 'point',
        style: {
          color: 'rgb(8,232,222)',
          lineWeight: OVERLAY_HAIRLINE_LINE_WEIGHT,
          fontSize: MEASUREMENT_FONT_SIZE,
          textHeightWcs: 1.3
        },
        geometry: { type: 'point', position: { x: 0, y: 0 } }
      }
    })

    const [record] = collectMeasurementRecords(view)
    expect(record?.style.lineWeight).toBe(0)
    expect(record?.style.strokeWidthWcs).toBeUndefined()
  })

})
