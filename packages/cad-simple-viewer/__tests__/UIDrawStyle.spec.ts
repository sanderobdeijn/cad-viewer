import {
  uiBindDrawStyleSessionAccessory,
  uiResolveDrawStyleKind,
  uiShouldShowDrawStyleToolbar
} from '../src/ui/UIDrawStyle'
import { applicationDrawStyleKindForCommand } from '../src/util/ApplicationCommandUtil'

jest.mock('../src/app/ApplicationSettingManager', () => ({
  ApplicationSettingManager: {
    instance: {
      isShowRibbon: false,
      events: {
        modified: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }
    }
  }
}))

describe('applicationDrawStyleKindForCommand', () => {
  it('classifies measurement drawing commands', () => {
    expect(applicationDrawStyleKindForCommand('measuredistance')).toBe('measure')
    expect(applicationDrawStyleKindForCommand('measurecontinuous')).toBe('measure')
    expect(applicationDrawStyleKindForCommand('MEASUREANGLE')).toBe('measure')
  })

  it('ignores visibility / import commands', () => {
    expect(applicationDrawStyleKindForCommand('measurementvis')).toBeUndefined()
    expect(applicationDrawStyleKindForCommand('line')).toBeUndefined()
  })
})

describe('uiResolveDrawStyleKind', () => {
  it('keeps the overlay kind from overlay selection when no draw command is active', () => {
    expect(uiResolveDrawStyleKind({ measurementSelected: true })).toBe(
      'measure'
    )
    expect(uiResolveDrawStyleKind({})).toBeUndefined()
  })

  it('prefers an active draw command over overlay selection', () => {
    expect(
      uiResolveDrawStyleKind({
        commandKind: 'measure',
        measurementSelected: false
      })
    ).toBe('measure')
  })
})

describe('uiShouldShowDrawStyleToolbar', () => {
  it('shows the overlay when a draw command is active and the ribbon is hidden', () => {
    expect(uiShouldShowDrawStyleToolbar('measure', false)).toBe(true)
  })

  it('hides the overlay when the ribbon is visible so ribbon style controls stay usable', () => {
    expect(uiShouldShowDrawStyleToolbar('measure', true)).toBe(false)
  })

  it('hides the overlay when no draw command is active', () => {
    expect(uiShouldShowDrawStyleToolbar(undefined, false)).toBe(false)
    expect(uiShouldShowDrawStyleToolbar(undefined, true)).toBe(false)
  })
})

describe('uiBindDrawStyleSessionAccessory', () => {
  it('assigns a draw-style sessionAccessory that mounts the view host', () => {
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const setActiveKind = jest.fn()
    const host = {
      setActiveKind,
      createSessionAccessory: () => accessory
    }
    const providers = new Map<string, unknown>()
    const view = {
      container,
      sessionProviders: {
        get: <T>(id: string) => providers.get(id) as T | undefined,
        set: (id: string, value: unknown) => {
          providers.set(id, value)
        },
        delete: (id: string) => providers.delete(id)
      }
    }
    view.sessionProviders.set('draw-style', host)
    const command = {
      globalName: 'measuredistance',
      sessionAccessory: null as null | typeof accessory
    }
    uiBindDrawStyleSessionAccessory(command)
    expect(command.sessionAccessory?.id).toBe('draw-style')
    command.sessionAccessory!.mount({
      host: container,
      type: 'desktop',
      view: view as never
    })
    expect(setActiveKind).toHaveBeenCalledWith('measure')
    expect(accessory.mount).toHaveBeenCalled()
    view.sessionProviders.delete('draw-style')
    expect(() =>
      command.sessionAccessory!.mount({
        host: container,
        type: 'desktop',
        view: view as never
      })
    ).toThrow()
  })

  it('skips desktop chrome mount when the shortcut toolbar owns the slot', () => {
    const container = { parentElement: null } as unknown as HTMLElement
    const accessory = {
      id: 'draw-style',
      mount: jest.fn(),
      unmount: jest.fn()
    }
    const host = {
      setActiveKind: jest.fn(),
      createSessionAccessory: () => accessory
    }
    const providers = new Map<string, unknown>()
    const view = {
      container,
      sessionProviders: {
        get: <T>(id: string) => providers.get(id) as T | undefined,
        set: (id: string, value: unknown) => {
          providers.set(id, value)
        },
        delete: (id: string) => providers.delete(id)
      }
    }
    view.sessionProviders.set('draw-style', host)
    view.sessionProviders.set('shortcut-toolbar', { isVisible: true })
    const command = {
      globalName: 'measuredistance',
      sessionAccessory: null as null | {
        id: string
        mount: (options: unknown) => void
        unmount: () => void
      }
    }
    uiBindDrawStyleSessionAccessory(command)
    expect(() =>
      command.sessionAccessory!.mount({
        host: container,
        type: 'desktop',
        view: view as never
      })
    ).toThrow()
    expect(accessory.mount).not.toHaveBeenCalled()
  })
})
