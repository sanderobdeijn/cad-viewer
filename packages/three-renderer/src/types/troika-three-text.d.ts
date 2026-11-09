/**
 * The parts of troika-three-text that the renderer uses. The package ships
 * JSDoc-generated declarations that its package.json does not point to, and
 * those declare `Text` without its `THREE.Mesh` base class.
 */
declare module 'troika-three-text' {
  import { ColorRepresentation, Mesh } from 'three'

  export class Text extends Mesh {
    text: string
    fontSize: number
    font: string | null
    anchorX: number | 'left' | 'center' | 'right'
    anchorY: number | 'top' | 'middle' | 'bottom' | 'baseline'
    color: ColorRepresentation | null
    sync(callback?: () => void): void
    dispose(): void
  }
}
