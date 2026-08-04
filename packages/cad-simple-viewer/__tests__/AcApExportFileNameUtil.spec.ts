import {
  getDrawingExportBaseName,
  resetExportDownloadNamesForTests,
  resolveExportDownloadName
} from '../src/util/AcApExportFileNameUtil'

describe('AcApExportFileNameUtil', () => {
  beforeEach(() => {
    resetExportDownloadNamesForTests()
  })

  it('derives the base name from a drawing file path', () => {
    expect(getDrawingExportBaseName('C:/drawings/floor-plan.dwg')).toBe(
      'floor-plan'
    )
    expect(getDrawingExportBaseName('nested\\room.dxf')).toBe('room')
  })

  it('falls back when the source name is empty', () => {
    expect(getDrawingExportBaseName(undefined)).toBe('drawing')
    expect(getDrawingExportBaseName('   ')).toBe('drawing')
  })

  it('prefers the drawing name for the first export', () => {

    expect(resolveExportDownloadName('floor-plan.dwg', '.html')).toBe(
      'floor-plan.html'
    )
  })

  it('tracks duplicate names independently per extension', () => {
    expect(resolveExportDownloadName('room.dxf', 'html')).toBe('room.html')
  })
})
