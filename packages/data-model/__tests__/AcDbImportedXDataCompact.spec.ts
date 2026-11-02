import { AcGePoint2d } from '@mlightcad/geometry-engine'

import { AcDbDxfCode, AcDbResultBuffer } from '../src/base'
import { AcDbLine } from '../src/entity'

const imported = () => [
  { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'MYAPP' },
  { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'hello-xdata' },
  { code: AcDbDxfCode.ExtendedDataInteger16, value: 42 }
]

const threeApps = () => [
  { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'APP1' },
  { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'one' },
  { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'APP2' },
  { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'two' },
  { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'APP3' },
  { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'three' }
]

describe('compact imported XData', () => {
  it('materializes losslessly and preserves mutable getXData semantics', () => {
    const line = new AcDbLine(new AcGePoint2d(0, 0), new AcGePoint2d(1, 0))
    line.setImportedXData(imported() as never)

    const xdata = line.getXData('MYAPP')
    expect(xdata?.toArray()).toEqual(imported())

    xdata!.at(1)!.value = 'changed'
    expect(line.getXData('MYAPP')?.at(1)?.value).toBe('changed')
  })

  it('lets setXData replace imported data and removeXData remove it', () => {
    const line = new AcDbLine(new AcGePoint2d(0, 0), new AcGePoint2d(1, 0))
    line.setImportedXData(imported() as never)

    line.setXData(
      new AcDbResultBuffer([
        {
          code: AcDbDxfCode.ExtendedDataRegAppName,
          value: 'MYAPP'
        },
        {
          code: AcDbDxfCode.ExtendedDataAsciiString,
          value: 'replacement'
        }
      ])
    )

    expect(line.getXData('MYAPP')?.at(1)?.value).toBe('replacement')
    line.removeXData('MYAPP')
    expect(line.getXData('MYAPP')).toBeUndefined()
  })

  it('clones/restores compact imported XData without data loss', () => {
    const line = new AcDbLine(new AcGePoint2d(0, 0), new AcGePoint2d(1, 0))
    line.setImportedXData(imported() as never)

    const snapshot = line.clonePreservingIdentity()
    line.removeXData('MYAPP')
    line.restoreFrom(snapshot)

    expect(line.getXData('MYAPP')?.toArray()).toEqual(imported())
  })

  it('removes one imported app and leaves the others', () => {
    const line = new AcDbLine(new AcGePoint2d(0, 0), new AcGePoint2d(1, 0))
    line.setImportedXData(threeApps() as never)

    line.removeXData('APP2')

    expect(line.getXData('APP2')).toBeUndefined()
    expect(line.getXData('APP1')?.at(1)?.value).toBe('one')
    expect(line.getXData('APP3')?.at(1)?.value).toBe('three')
  })
})
