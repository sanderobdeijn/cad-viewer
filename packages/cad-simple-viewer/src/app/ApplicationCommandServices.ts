import type { EditorMessageType } from '../editor/input/ui/EditorMessageType'

/**
 * Runtime services that commands need from the application layer.
 *
 * Kept in a tiny module (no DocManager / command imports) so {@link EditorCommand}
 * can call into the app without creating an ES-module cycle:
 * `EditorCommand` -> `ApplicationDocManager` -> commands -> `EditorCommand`.
 */
export interface ApplicationCommandServices {
  showMessage(message: string, type?: EditorMessageType, msgKey?: string): void
  showBusyIndicator(message?: string): void
  hideBusyIndicator(): void
  withBusyIndicator<T>(
    work: () => T | Promise<T>,
    message?: string
  ): Promise<T>
}

let services: ApplicationCommandServices | null = null

/**
 * Binds the live document-manager services used by {@link EditorCommand} helpers.
 *
 * Called once during {@link ApplicationDocManager} construction after the busy
 * indicator and editor are available.
 */
export function applicationBindCommandServices(next: ApplicationCommandServices): void {
  services = next
}

/**
 * Returns the bound command services.
 *
 * @throws If called before {@link ApplicationDocManager} has bound services
 */
export function applicationCommandServices(): ApplicationCommandServices {
  if (!services) {
    throw new Error(
      '[ApplicationCommandServices] Not bound. Create ApplicationDocManager before running commands.'
    )
  }
  return services
}
