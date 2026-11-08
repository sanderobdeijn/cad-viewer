import { ApplicationPlugin } from './ApplicationPlugin'

/**
 * Descriptor for a plugin that is registered up front but loaded only when triggered.
 *
 * Register with {@link ApplicationPluginManager.registerLazyPlugin}. The plugin module is not
 * fetched until the user runs one of the {@link triggers} commands.
 *
 * @example
 * ```typescript
 * pluginManager.registerLazyPlugin({
 *   name: 'my-plugin',
 *   triggers: ['mycommand'],
 *   loader: async () => new (await import('./MyPlugin')).MyPlugin()
 * })
 * ```
 */
export interface ApplicationLazyPluginRegistration {
  /** Unique plugin identifier; must match {@link ApplicationPlugin.name} returned by {@link loader}. */
  name: string
  /** Command names that load this plugin when executed (case-insensitive). */
  triggers: string[]
  /** Factory that creates the plugin instance when a trigger command runs. */
  loader: () => ApplicationPlugin | Promise<ApplicationPlugin>
}
