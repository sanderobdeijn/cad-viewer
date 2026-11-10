const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

/**
 * Clamp the value to be between min and max.
 * @param value Input value to be clamped
 * @param min Input minimum value
 * @param max Input maximum value
 * @returns Return clamped value between min and max
 */
function geometryClamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Random float in the interval [low, high].
 * @param low Input interval lower boundary value
 * @param high Input interval upper boundary value
 * @returns Return random float in the interval [low, high]
 */
// Random float from <low, high> interval
/**
 * Convert degrees to radians.
 * @param degrees Input degrees value to be converted
 * @returns Return converted angle value in radians
 */
function geometryDegToRad(degrees: number) {
  return degrees * DEG2RAD
}

/**
 * Convert radians to degrees.
 * @param radians Input radians value to be converted
 * @returns Return converted angle value in degrees
 */
function geometryRadToDeg(radians: number) {
  return radians * RAD2DEG
}

/**
 * Normalize one angle in radian to value in range 0 to 2*PI
 * @param angle Input one angle value in radians
 * @returns Return normalized angle value in radians
 */
function geometryNormalizeAngle(angle: number): number {
  const TAU = Math.PI * 2
  return ((angle % TAU) + TAU) % TAU
}

/**
 * Return true if the algleToTest is between startAngle and endAngle
 * @param angleToTest Input angle to test
 * @param startAngle Input start angle
 * @param endAngle Input end angle
 * @param clockwise Input rotation direction from start angle to end angle
 * @returns Return true if the algleToTest is between startAngle and endAngle
 */
function geometryIsBetweenAngle(
  angleToTest: number,
  startAngle: number,
  endAngle: number,
  clockwise: boolean = false
) {
  angleToTest = geometryNormalizeAngle(angleToTest)
  startAngle = geometryNormalizeAngle(startAngle)
  endAngle = geometryNormalizeAngle(endAngle)
  if (clockwise) {
    if (startAngle > endAngle) {
      return angleToTest <= startAngle && angleToTest >= endAngle
    } else {
      return angleToTest <= startAngle || angleToTest >= endAngle
    }
  } else {
    if (startAngle < endAngle) {
      return angleToTest >= startAngle && angleToTest <= endAngle
    } else {
      return angleToTest >= startAngle || angleToTest <= endAngle
    }
  }
}

/**
 * Return true if `mid` lies on the counterclockwise sweep from `start` to `end`.
 * Angles are treated as radians and normalized to `[0, 2π)`.
 */
function geometryIsAngleOnCcwSweep(start: number, mid: number, end: number) {
  const total = geometryNormalizeAngle(end - start)
  const offset = geometryNormalizeAngle(mid - start)
  return offset <= total + 1e-7
}

function geometryIntPartLength(num: number) {
  num = Math.abs(num)
  if (num < 1.0) {
    return 0
  }
  return Math.ceil(Math.log10(Math.abs(num) + 1))
}

function geometryRelativeEps(num: number, epsilon = 1.0e-7) {
  const count = geometryIntPartLength(num)
  return Math.max(Math.pow(10, count) * epsilon, epsilon)
}

const GeometryMathUtil = {
  DEG2RAD: DEG2RAD,
  RAD2DEG: RAD2DEG,
  clamp: geometryClamp,
  degToRad: geometryDegToRad,
  radToDeg: geometryRadToDeg,
  normalizeAngle: geometryNormalizeAngle,
  isBetweenAngle: geometryIsBetweenAngle,
  isAngleOnCcwSweep: geometryIsAngleOnCcwSweep,
  intPartLength: geometryIntPartLength,
  relativeEps: geometryRelativeEps
}

export {
  DEG2RAD,
  RAD2DEG,
  geometryClamp,
  geometryDegToRad,
  geometryRadToDeg,
  geometryNormalizeAngle,
  geometryIsBetweenAngle,
  geometryIsAngleOnCcwSweep,
  geometryIntPartLength,
  geometryRelativeEps,
  GeometryMathUtil
}
