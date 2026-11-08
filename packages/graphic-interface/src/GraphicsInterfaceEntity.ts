
/**
 * Interface that all of display objects need to implement.
 */
export interface GraphicsInterfaceEntity {
  /**
   * Object id of the associated entity in drawing database. When adding this entity into scene,
   * do remember setting the value of this property.
   */
  get objectId(): string
  set objectId(value: string)

  /**
   * The object Id of the owner of the object. When adding this entity into scene, do remember
   * setting the value of this property.
   */
  get ownerId(): string
  set ownerId(value: string)

  /**
   * The name of the layer referenced by this entity
   */
  get layerName(): string
  set layerName(value: string)

  /**
   * Object's visibility
   */
  get visible(): boolean
  set visible(value: boolean)

  /**
   * An object that can be used to store custom data about the entity.
   */
  get userData(): object
  set userData(value: object)

  /**
   * Adds one child entity for the current entity
   * @param child - The child entity to add
   */
  addChild(child: GraphicsInterfaceEntity): void

  /**
   * Highlight this entity.
   */
  highlight(): void

  /**
   * Unhighlight this entity
   */
  unhighlight(): void

  /**
   * Optionally releases GPU/CPU resources owned by this entity.
   *
   * Implementations that do not own disposable resources may omit this method. Shared materials from a
   * style cache should not be disposed here unless the implementation owns them.
   *
   * @returns Nothing.
   */
  dispose?(): void
}
