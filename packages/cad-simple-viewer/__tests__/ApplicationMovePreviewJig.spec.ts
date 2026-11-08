import {
  GeometryLine2d,
  GeometryPoint2d,
  type ModelItem
} from '@mlightcad/geometry-engine'

import { ApplicationMovePreviewJig } from '../src/command/modify/ApplicationMovePreviewJig'
import { EditorBaseView } from '../src/editor/view/EditorBaseView'

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
  } as unknown as EditorBaseView
}

function createBatchView() {
  return {
    createEntityPreview: jest.fn(() => 'preview-1'),
    updateEntityPreview: jest.fn(),
    removeEntityPreview: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as EditorBaseView
}

describe('ApplicationMovePreviewJig', () => {
  it('publishes transient previews once and updates transforms on each render', () => {
    const view = createTransientFallbackView()
    const items = [createItem('line-1'), createItem('line-2')]
    const jig = new ApplicationMovePreviewJig(view, items, new GeometryPoint2d(0, 0))

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
    const jig = new ApplicationMovePreviewJig(view, items, new GeometryPoint2d(0, 0))

    jig.update(new GeometryPoint2d(3, 4))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.updateEntityPreview).toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })
})
