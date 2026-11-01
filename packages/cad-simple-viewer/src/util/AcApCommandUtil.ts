/**
 * Kind of drawing session tied to command global names.
 *
 * - `'measure'` — measurement tools (distance, area, angle, arc, point)
 */
export type AcApDrawStyleKind = 'measure'

/** Global command names that enter a measurement drawing session. */
const MEASURE_DRAW_COMMANDS = new Set([
  'measuredistance',
  'measurecontinuous',
  'measurearea',
  'measureangle',
  'measurearc',
  'measurepoint'
])

/**
 * Maps a command global name to the draw-style session kind.
 *
 * @param commandName - Command global name; comparison is case-insensitive.
 * @returns `'measure'`, or `undefined` if the command is unrelated.
 */
export function acapDrawStyleKindForCommand(
  commandName: string | undefined
): AcApDrawStyleKind | undefined {
  const name = commandName?.trim().toLowerCase()
  if (!name) return undefined
  if (MEASURE_DRAW_COMMANDS.has(name)) return 'measure'
  return undefined
}
