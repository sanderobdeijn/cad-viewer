import {
  GeometryEllipseArc2d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryTol,
  GeometryVector3dLike,
  TAU
} from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorOpenMode,
  EditorPreviewJig,
  EditorPromptAngleOptions,
  EditorPromptDoubleOptions,
  EditorPromptPointOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { applicationPreviewDrawable } from '../../model/ApplicationItemDrawable'
import { ApplicationLineJig } from './ApplicationLineCmd'

type EllipseKeywordKey = 'arc' | 'center' | 'rotation'

interface EllipseDefinition {
  center: GeometryPoint2dLike
  majorAxis: GeometryVector3dLike
  majorRadius: number
  minorRadius: number
  startAngle: number
  endAngle: number
}

function distance2d(p1: GeometryPoint2dLike, p2: GeometryPoint2dLike) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

function midpoint2d(
  p1: GeometryPoint2dLike,
  p2: GeometryPoint2dLike
): GeometryPoint2dLike {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  }
}

function normalizeVector2d(
  x: number,
  y: number
): GeometryVector3dLike | undefined {
  const length = Math.hypot(x, y)
  if (!Number.isFinite(length) || GeometryTol.isNonPositive(length))
    return undefined
  return { x: x / length, y: y / length, z: 0 }
}

function perpendicular2d(unit: GeometryVector3dLike): GeometryVector3dLike {
  return { x: -unit.y, y: unit.x, z: 0 }
}

function degToRad(degree: number) {
  return (degree * Math.PI) / 180
}

function radToDeg(rad: number) {
  return (rad * 180) / Math.PI
}

function axisAngleDeg(axis: GeometryVector3dLike) {
  return radToDeg(Math.atan2(axis.y, axis.x))
}

/**
 * Converts a geometric direction angle (from center, relative to major axis)
 * to ellipse parameter angle used by GeometryEllipseArc2d.
 *
 * Ellipse parameterization:
 *   x = a * cos(t), y = b * sin(t)
 * Geometric ray angle alpha satisfies:
 *   tan(alpha) = (b * sin(t)) / (a * cos(t))
 * so:
 *   t = atan2(a * sin(alpha), b * cos(alpha))
 */
function geometricAngleDegToEllipseParamRad(
  geometricAngleDeg: number,
  majorRadius: number,
  minorRadius: number
) {
  const alpha = degToRad(geometricAngleDeg)
  return Math.atan2(
    majorRadius * Math.sin(alpha),
    minorRadius * Math.cos(alpha)
  )
}

function axisUnitFromCenterToPoint(
  center: GeometryPoint2dLike,
  point: GeometryPoint2dLike
) {
  return normalizeVector2d(point.x - center.x, point.y - center.y)
}

function buildEllipseDefinition(
  center: GeometryPoint2dLike,
  firstAxisUnit: GeometryVector3dLike,
  firstAxisRadius: number,
  secondAxisRadius: number,
  startAngle: number = 0,
  endAngle: number = TAU
): EllipseDefinition | undefined {
  if (
    !Number.isFinite(firstAxisRadius) ||
    !Number.isFinite(secondAxisRadius) ||
    GeometryTol.isNonPositive(firstAxisRadius) ||
    GeometryTol.isNonPositive(secondAxisRadius)
  ) {
    return undefined
  }

  const normalizedAngles = normalizeFullEllipseAngles(startAngle, endAngle)

  if (firstAxisRadius >= secondAxisRadius) {
    return {
      center: { x: center.x, y: center.y },
      majorAxis: firstAxisUnit,
      majorRadius: firstAxisRadius,
      minorRadius: secondAxisRadius,
      startAngle: normalizedAngles.startAngle,
      endAngle: normalizedAngles.endAngle
    }
  }

  return {
    center: { x: center.x, y: center.y },
    majorAxis: perpendicular2d(firstAxisUnit),
    majorRadius: secondAxisRadius,
    minorRadius: firstAxisRadius,
    startAngle: normalizedAngles.startAngle,
    endAngle: normalizedAngles.endAngle
  }
}

function normalizeFullEllipseAngles(startAngle: number, endAngle: number) {
  const span = Math.abs(endAngle - startAngle)
  if (Math.abs(span - TAU) < 1e-10 || Math.abs(span - 2 * TAU) < 1e-10) {
    return { startAngle: 0, endAngle: 0 }
  }
  return { startAngle, endAngle }
}

function createFallbackEllipse(point: GeometryPoint2dLike) {
  return new GeometryEllipseArc2d(point, 1e-6, 1e-6, 0, TAU)
}

/** Returns the ellipse a definition describes. */
function createEllipse(definition: EllipseDefinition) {
  return new GeometryEllipseArc2d(
    definition.center,
    definition.majorRadius,
    definition.minorRadius,
    definition.startAngle,
    definition.endAngle,
    false,
    Math.atan2(definition.majorAxis.y, definition.majorAxis.x)
  )
}

function applyEllipseDefinition(
  ellipse: GeometryEllipseArc2d,
  definition: EllipseDefinition
) {
  ellipse.center = definition.center
  ellipse.majorAxisRadius = definition.majorRadius
  ellipse.minorAxisRadius = definition.minorRadius
  ellipse.startAngle = definition.startAngle
  ellipse.endAngle = definition.endAngle
  ellipse.rotation = Math.atan2(definition.majorAxis.y, definition.majorAxis.x)
}

/**
 * Dynamic point-driven ellipse preview jig.
 */
class ApplicationEllipsePointJig extends EditorPreviewJig<GeometryPoint2dLike> {
  /**
   * Transient ellipse entity reused during preview updates.
   */
  private _ellipse: GeometryEllipseArc2d
  private _drawable: GraphicsInterfaceDrawable
  /**
   * Callback that maps cursor point to ellipse definition.
   */
  private _builder: (
    point: GeometryPoint2dLike
  ) => EllipseDefinition | undefined

  /**
   * Creates point-driven ellipse preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Cursor point to ellipse definition resolver.
   * @param fallbackPoint - Fallback point used to create valid initial entity.
   */
  constructor(
    view: EditorBaseView,
    builder: (point: GeometryPoint2dLike) => EllipseDefinition | undefined,
    fallbackPoint: GeometryPoint2dLike
  ) {
    super(view)
    this._builder = builder
    this._ellipse = createFallbackEllipse(fallbackPoint)
    this._drawable = applicationPreviewDrawable({
      kind: 'shape',
      geometry: this._ellipse
    })
  }

  /**
   * Gets transient ellipse entity displayed by this jig.
   */
  get entity(): GraphicsInterfaceDrawable {
    return this._drawable
  }

  /**
   * Recomputes preview ellipse from cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: GeometryPoint2dLike) {
    const definition = this._builder(point)
    if (!definition) return
    applyEllipseDefinition(this._ellipse, definition)
  }
}

/**
 * Dynamic numeric-input ellipse preview jig.
 */
class ApplicationEllipseDistanceJig extends EditorPreviewJig<number> {
  /**
   * Transient ellipse entity reused during numeric preview updates.
   */
  private _ellipse: GeometryEllipseArc2d
  private _drawable: GraphicsInterfaceDrawable
  /**
   * Callback that maps numeric input to ellipse definition.
   */
  private _builder: (value: number) => EllipseDefinition | undefined

  /**
   * Creates numeric-input ellipse preview jig.
   *
   * @param view - Active editor view.
   * @param builder - Numeric value to ellipse definition resolver.
   * @param fallbackPoint - Fallback point used to create valid initial entity.
   */
  constructor(
    view: EditorBaseView,
    builder: (value: number) => EllipseDefinition | undefined,
    fallbackPoint: GeometryPoint2dLike
  ) {
    super(view)
    this._builder = builder
    this._ellipse = createFallbackEllipse(fallbackPoint)
    this._drawable = applicationPreviewDrawable({
      kind: 'shape',
      geometry: this._ellipse
    })
  }

  /**
   * Gets transient ellipse entity displayed by this jig.
   */
  get entity(): GraphicsInterfaceDrawable {
    return this._drawable
  }

  /**
   * Recomputes preview ellipse from numeric input value.
   *
   * @param value - Current numeric prompt value.
   */
  update(value: number) {
    const definition = this._builder(value)
    if (!definition) return
    applyEllipseDefinition(this._ellipse, definition)
  }
}

/**
 * Command to create one ellipse or ellipse arc.
 */
export class ApplicationEllipseCmd extends EditorCommand {
  /**
   * Creates ELLIPSE command instance.
   */
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supported branches:
   * - Axis endpoint workflow
   * - Center-first workflow
   * - Arc-prefixed variants for ellipse arc creation
   *
   * @param context - Current application/document context.
   */
  async execute(context: ApplicationContext) {
    const entryPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.ellipse.axisEndpointOrOptions')
    )
    this.addKeyword(entryPrompt, 'arc')
    this.addKeyword(entryPrompt, 'center')
    const entryResult =
      await ApplicationDocManager.instance.editor.getPoint(entryPrompt)

    if (entryResult.status === EditorPromptStatus.Keyword) {
      const keyword = entryResult.stringResult ?? ''
      if (keyword === 'Center') {
        await this.runCenterFlow(context, false)
      } else if (keyword === 'Arc') {
        await this.runArcEntryFlow(context)
      }
      return
    }

    if (entryResult.status !== EditorPromptStatus.OK) return
    await this.runAxisEndFlow(context, entryResult.value!, false)
  }

  /**
   * Adds one localized keyword to a point prompt.
   *
   * @param prompt - Target point prompt.
   * @param key - Keyword i18n key suffix.
   */
  private addKeyword(prompt: EditorPromptPointOptions, key: EllipseKeywordKey) {
    prompt.keywords.add(
      ApplicationI18n.t(`jig.ellipse.keywords.${key}.display`),
      ApplicationI18n.t(`jig.ellipse.keywords.${key}.global`),
      ApplicationI18n.t(`jig.ellipse.keywords.${key}.local`)
    )
  }

  /**
   * Appends final ellipse entity to model space.
   *
   * @param context - Current application/document context.
   * @param definition - Ellipse geometric definition to append.
   */
  private appendEllipse(context: ApplicationContext, definition: EllipseDefinition) {
    context.doc.modelSync.addItems({
      kind: 'shape',
      geometry: createEllipse(definition)
    })
  }

  /**
   * Emits one warning message for invalid ellipse input.
   *
   * @param key - Invalid-input category key.
   */
  private warnInvalidInput(key: 'axis' | 'otherAxis' | 'rotation') {
    this.notify(ApplicationI18n.t(`jig.ellipse.invalid.${key}`), 'warning')
  }

  /**
   * Runs `Arc` entry branch where user can provide axis endpoints or center.
   *
   * @param context - Current application/document context.
   */
  private async runArcEntryFlow(context: ApplicationContext) {
    const prompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.ellipse.arcAxisEndpointOrCenter')
    )
    this.addKeyword(prompt, 'center')
    const result = await ApplicationDocManager.instance.editor.getPoint(prompt)
    if (result.status === EditorPromptStatus.Keyword) {
      if (result.stringResult === 'Center') {
        await this.runCenterFlow(context, true)
      }
      return
    }
    if (result.status !== EditorPromptStatus.OK) return
    await this.runAxisEndFlow(context, result.value!, true)
  }

  /**
   * Runs center-first workflow:
   * center -> first axis endpoint -> other axis/rotation -> optional arc angles.
   *
   * @param context - Current application/document context.
   * @param arcMode - Whether to continue into arc-angle prompts.
   */
  private async runCenterFlow(context: ApplicationContext, arcMode: boolean) {
    const centerPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.ellipse.center')
    )
    const centerResult =
      await ApplicationDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== EditorPromptStatus.OK) return
    const center = centerResult.value!

    const axisEndPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.ellipse.firstAxisEndpoint')
    )
    axisEndPrompt.useDashedLine = true
    axisEndPrompt.useBasePoint = true
    axisEndPrompt.basePoint = new GeometryPoint2d(center)
    axisEndPrompt.jig = new ApplicationLineJig(context.view, center)
    const axisEndResult =
      await ApplicationDocManager.instance.editor.getPoint(axisEndPrompt)
    if (axisEndResult.status !== EditorPromptStatus.OK) return

    const axisUnit = axisUnitFromCenterToPoint(center, axisEndResult.value!)
    if (!axisUnit) {
      this.warnInvalidInput('axis')
      return
    }
    const axisRadius = distance2d(center, axisEndResult.value!)
    const definition = await this.promptOtherAxis(
      context,
      center,
      axisUnit,
      axisRadius,
      arcMode
    )
    if (!definition) return
    this.appendEllipse(context, definition)
  }

  /**
   * Runs axis-endpoint workflow:
   * first axis endpoint -> second axis endpoint -> other axis/rotation.
   *
   * @param context - Current application/document context.
   * @param firstAxisEndpoint - First endpoint of major/minor axis line.
   * @param arcMode - Whether to continue into arc-angle prompts.
   */
  private async runAxisEndFlow(
    context: ApplicationContext,
    firstAxisEndpoint: GeometryPoint2dLike,
    arcMode: boolean
  ) {
    const secondAxisPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.ellipse.secondAxisEndpoint')
    )
    secondAxisPrompt.useDashedLine = true
    secondAxisPrompt.useBasePoint = true
    secondAxisPrompt.basePoint = new GeometryPoint2d(firstAxisEndpoint)
    secondAxisPrompt.jig = new ApplicationLineJig(context.view, firstAxisEndpoint)
    const secondAxisResult =
      await ApplicationDocManager.instance.editor.getPoint(secondAxisPrompt)
    if (secondAxisResult.status !== EditorPromptStatus.OK) return

    const secondAxisEndpoint = secondAxisResult.value!
    const axisVectorX = secondAxisEndpoint.x - firstAxisEndpoint.x
    const axisVectorY = secondAxisEndpoint.y - firstAxisEndpoint.y
    const axisUnit = normalizeVector2d(axisVectorX, axisVectorY)
    if (!axisUnit) {
      this.warnInvalidInput('axis')
      return
    }

    const center = midpoint2d(firstAxisEndpoint, secondAxisEndpoint)
    const axisRadius = distance2d(firstAxisEndpoint, secondAxisEndpoint) / 2
    const definition = await this.promptOtherAxis(
      context,
      center,
      axisUnit,
      axisRadius,
      arcMode
    )
    if (!definition) return
    this.appendEllipse(context, definition)
  }

  /**
   * Prompts for the second axis radius by point or rotation angle option.
   *
   * In arc mode, this method also continues into arc start/end angle prompts.
   *
   * @param context - Current application/document context.
   * @param center - Ellipse center point.
   * @param firstAxisUnit - Unit direction of first specified axis.
   * @param firstAxisRadius - Radius length along first specified axis.
   * @param arcMode - Whether to return an ellipse arc definition.
   * @returns Final ellipse definition, or `undefined` on cancel/invalid.
   */
  private async promptOtherAxis(
    context: ApplicationContext,
    center: GeometryPoint2dLike,
    firstAxisUnit: GeometryVector3dLike,
    firstAxisRadius: number,
    arcMode: boolean
  ) {
    while (true) {
      const otherAxisPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.ellipse.otherAxisOrRotation')
      )
      this.addKeyword(otherAxisPrompt, 'rotation')
      otherAxisPrompt.useDashedLine = true
      otherAxisPrompt.useBasePoint = true
      otherAxisPrompt.basePoint = new GeometryPoint2d(center)
      otherAxisPrompt.jig = new ApplicationEllipsePointJig(
        context.view,
        point => {
          const otherAxisRadius = distance2d(center, point)
          return buildEllipseDefinition(
            center,
            firstAxisUnit,
            firstAxisRadius,
            otherAxisRadius
          )
        },
        center
      )

      const otherAxisResult =
        await ApplicationDocManager.instance.editor.getPoint(otherAxisPrompt)
      if (otherAxisResult.status === EditorPromptStatus.Keyword) {
        if (otherAxisResult.stringResult !== 'Rotation') return undefined

        const rotationPrompt = new EditorPromptDoubleOptions(
          ApplicationI18n.t('jig.ellipse.rotationAngle')
        )
        rotationPrompt.allowNegative = false
        rotationPrompt.allowZero = true
        rotationPrompt.jig = new ApplicationEllipseDistanceJig(
          context.view,
          degreeValue => {
            const secondAxisRadius =
              firstAxisRadius * Math.abs(Math.cos(degToRad(degreeValue)))
            return buildEllipseDefinition(
              center,
              firstAxisUnit,
              firstAxisRadius,
              secondAxisRadius
            )
          },
          center
        )

        const rotationResult =
          await ApplicationDocManager.instance.editor.getDouble(rotationPrompt)
        if (rotationResult.status !== EditorPromptStatus.OK) return undefined

        const secondAxisRadius =
          firstAxisRadius *
          Math.abs(Math.cos(degToRad(rotationResult.value ?? 0)))
        const definition = buildEllipseDefinition(
          center,
          firstAxisUnit,
          firstAxisRadius,
          secondAxisRadius
        )
        if (!definition) {
          this.warnInvalidInput('rotation')
          continue
        }
        if (!arcMode) return definition
        return await this.promptArcAngles(context, definition)
      }

      if (otherAxisResult.status !== EditorPromptStatus.OK) return undefined
      const otherAxisRadius = distance2d(center, otherAxisResult.value!)
      const definition = buildEllipseDefinition(
        center,
        firstAxisUnit,
        firstAxisRadius,
        otherAxisRadius
      )
      if (!definition) {
        this.warnInvalidInput('otherAxis')
        continue
      }

      if (!arcMode) return definition
      return await this.promptArcAngles(context, definition)
    }
  }

  /**
   * Prompts start and end angles for ellipse-arc creation.
   *
   * @param context - Current application/document context.
   * @param baseEllipse - Base full-ellipse definition before arc trimming.
   * @returns Arc ellipse definition, or `undefined` when canceled.
   */
  private async promptArcAngles(
    context: ApplicationContext,
    baseEllipse: EllipseDefinition
  ) {
    const majorAxisBaseAngle = axisAngleDeg(baseEllipse.majorAxis)
    const startPrompt = new EditorPromptAngleOptions(
      ApplicationI18n.t('jig.ellipse.arcStartAngle')
    )
    startPrompt.allowNegative = true
    startPrompt.useBasePoint = true
    startPrompt.useDashedLine = true
    startPrompt.basePoint = new GeometryPoint2d(baseEllipse.center)
    startPrompt.baseAngle = majorAxisBaseAngle
    startPrompt.jig = new ApplicationEllipseDistanceJig(
      context.view,
      degreeValue => ({
        ...baseEllipse,
        startAngle: geometricAngleDegToEllipseParamRad(
          degreeValue,
          baseEllipse.majorRadius,
          baseEllipse.minorRadius
        ),
        endAngle: TAU
      }),
      baseEllipse.center
    )
    const startResult =
      await ApplicationDocManager.instance.editor.getAngle(startPrompt)
    if (startResult.status !== EditorPromptStatus.OK) return undefined

    const startAngle = geometricAngleDegToEllipseParamRad(
      startResult.value ?? 0,
      baseEllipse.majorRadius,
      baseEllipse.minorRadius
    )
    const endPrompt = new EditorPromptAngleOptions(
      ApplicationI18n.t('jig.ellipse.arcEndAngle')
    )
    endPrompt.allowNegative = true
    endPrompt.useBasePoint = true
    endPrompt.useDashedLine = true
    endPrompt.basePoint = new GeometryPoint2d(baseEllipse.center)
    endPrompt.baseAngle = majorAxisBaseAngle
    endPrompt.jig = new ApplicationEllipseDistanceJig(
      context.view,
      degreeValue => ({
        ...baseEllipse,
        startAngle,
        endAngle: geometricAngleDegToEllipseParamRad(
          degreeValue,
          baseEllipse.majorRadius,
          baseEllipse.minorRadius
        )
      }),
      baseEllipse.center
    )
    const endResult = await ApplicationDocManager.instance.editor.getAngle(endPrompt)
    if (endResult.status !== EditorPromptStatus.OK) return undefined

    return {
      ...baseEllipse,
      startAngle,
      endAngle: geometricAngleDegToEllipseParamRad(
        endResult.value ?? 0,
        baseEllipse.majorRadius,
        baseEllipse.minorRadius
      )
    }
  }
}
