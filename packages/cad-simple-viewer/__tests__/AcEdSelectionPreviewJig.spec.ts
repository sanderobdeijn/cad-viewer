import {
  GeometryLine2d,
  GeometryMatrix3d,
  GeometryPoint2d,
  type ModelItem
} from '@mlightcad/geometry-engine'

import {
  AcEdSelectionStaticPreviewJig,
  AcEdSelectionTransformPreviewJig
} from '../src/editor/input/AcEdSelectionPreviewJig'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

function createItem(id: string): ModelItem {
  return {
    id,
    kind: 'shape',
    geometry: new GeometryLine2d({ x: 0, y: 0 }, { x: 10, y: 0 })
  }
}

function createTransientFallbackView() {
  return {
    createEntityPreview: jest.fn(() => null),
    updateEntityPreview: jest.fn(),
    removeEntityPreview: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as AcEdBaseView
}

function createBatchView() {
  return {
    createEntityPreview: jest.fn(() => 'preview-1'),
    updateEntityPreview: jest.fn(),
    removeEntityPreview: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as AcEdBaseView
}

class TestTransformJig extends AcEdSelectionTransformPreviewJig<GeometryPoint2d> {
  protected buildTransforms(point: GeometryPoint2d) {
    const matrix = new GeometryMatrix3d().makeTranslation(point.x, point.y, 0)
    return this.previewEntries.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}

describe('AcEdSelectionTransformPreviewJig', () => {
  it('publishes transient previews once and updates transforms on each render', () => {
    const view = createTransientFallbackView()
    const items = [createItem('line-1'), createItem('line-2')]
    const jig = new TestTransformJig(view, items)

    jig.update(new GeometryPoint2d(5, 0))
    jig.render()
    jig.update(new GeometryPoint2d(10, 2))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.updateTransientPreviewTransforms).toHaveBeenCalledTimes(2)
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(2)
  })

  it('updates batch preview matrix without publishing transients', () => {
    const view = createBatchView()
    const items = [createItem('line-1')]
    const jig = new TestTransformJig(view, items)

    jig.update(new GeometryPoint2d(3, 4))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.updateEntityPreview).toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })

  it('creates one preview per source item per copy factor', () => {
    const view = createTransientFallbackView()
    const items = [createItem('line-1'), createItem('line-2')]
    const jig = new TestTransformJig(view, items, 2)

    jig.update(new GeometryPoint2d(0, 0))
    jig.render()

    const published = (view.addTransientEntity as jest.Mock).mock
      .calls[0][0] as { objectId: string }[]
    expect(published).toHaveLength(4)
    // Previews get their own ids so they never clash with the drawn items.
    expect(new Set(published.map(preview => preview.objectId)).size).toBe(4)
  })
})

describe('AcEdSelectionStaticPreviewJig', () => {
  it('publishes static previews once and cleans up on end', () => {
    const view = createTransientFallbackView()
    const items = [createItem('line-1')]
    const jig = new AcEdSelectionStaticPreviewJig<number>(view, items)

    jig.update(0)
    jig.render()
    jig.render()
    jig.end()

    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.updateTransientPreviewTransforms).not.toHaveBeenCalled()
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(1)
  })

  it('skips transient publish when batch preview is active', () => {
    const view = createBatchView()
    const items = [createItem('line-1')]
    const jig = new AcEdSelectionStaticPreviewJig<number>(view, items)

    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })
})
