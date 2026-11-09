import { CommonPerformanceCollector, log } from '@mlightcad/common'

import { ApplicationContext } from '../app'
import { EditorCommand } from '../editor'
import { ThreeRendererView2d } from '../view'

/**
 * This is an internal command used to log some debug information in console.
 * @internal
 */
export class ApplicationLogCmd extends EditorCommand {
  async execute(context: ApplicationContext) {
    this.printSelectionSet(context)
    this.printStats(context)
    this.printPerformanceData()
  }

  private printSelectionSet(context: ApplicationContext) {
    const sync = context.doc.modelSync
    context.view.selectionSet.ids.forEach(id => {
      const item = sync.model.get(id)
      if (item) log.info(item)
    })
  }

  private printStats(context: ApplicationContext) {
    const stats = (context.view as ThreeRendererView2d).stats
    const layouts = stats.layouts
    log.info('Geometry information in current drawing:')
    for (let index = 0; index < layouts.length; ++index) {
      console.group(`Layout: ${index}`)
      const layout = layouts[index]
      const batch = layout.batch
      const kb = (bytes: number) => (bytes / 1024).toFixed(1)
      const data = [
        {
          'idx line (KB)': kb(batch.line.indexed.geometrySize),
          'line (KB)': kb(batch.line.nonIndexed.geometrySize),
          'idx mesh (KB)': kb(batch.mesh.indexed.geometrySize),
          'mesh (KB)': kb(batch.mesh.nonIndexed.geometrySize),
          'idx point (KB)': kb(batch.point.indexed.geometrySize),
          'point (KB)': kb(batch.point.nonIndexed.geometrySize),
          'unbatched (KB)': kb(batch.unbatched.geometrySize),
          'unbatched count': batch.unbatched.count,
          'unbatched line': batch.unbatched.byType.line,
          'unbatched mesh': batch.unbatched.byType.mesh,
          'unbatched point': batch.unbatched.byType.point,
          'unbatched other': batch.unbatched.byType.other,
          'total geo (KB)': kb(batch.summary.totalGeometrySize),
          'total mapping (KB)': kb(batch.summary.totalMappingSize)
        }
      ]
      console.table(data)
      console.table([
        {
          layoutCount: stats.summary.layoutCount,
          entityCount: stats.summary.entityCount,
          'scene line (KB)': (stats.summary.totalSize.line / 1024).toFixed(1),
          'scene mesh (KB)': (stats.summary.totalSize.mesh / 1024).toFixed(1),
          'scene point (KB)': (stats.summary.totalSize.point / 1024).toFixed(1),
          'scene unbatched (KB)': (
            stats.summary.totalSize.unbatched / 1024
          ).toFixed(1),
          'scene unbatched count': stats.summary.totalSize.unbatchedCount,
          'scene unbatched line': stats.summary.totalSize.unbatchedByType.line,
          'scene unbatched mesh': stats.summary.totalSize.unbatchedByType.mesh,
          'scene unbatched point':
            stats.summary.totalSize.unbatchedByType.point,
          'scene unbatched other':
            stats.summary.totalSize.unbatchedByType.other,
          'scene total geo (KB)': (
            stats.summary.totalSize.geometry / 1024
          ).toFixed(1),
          'scene total mapping (KB)': (
            stats.summary.totalSize.mapping / 1024
          ).toFixed(1)
        }
      ])
      console.groupEnd()
    }
  }

  private printPerformanceData() {
    CommonPerformanceCollector.getInstance().printAll()
  }
}
