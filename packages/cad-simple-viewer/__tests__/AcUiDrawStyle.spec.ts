import {
  acuiBindDrawStyleSessionAccessory,
  acuiResolveDrawStyleKind,
  acuiShouldShowDrawStyleToolbar
} from '../src/ui/AcUiDrawStyle'
import { acapDrawStyleKindForCommand } from '../src/util/AcApCommandUtil'

jest.mock('../src/app/AcApSettingManager', () => ({
  AcApSettingManager: {
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

describe('acapDrawStyleKindForCommand', () => {
  it('classifies measurement drawing commands', () => {
    expect(acapDrawStyleKindForCommand('measuredistance')).toBe('measure')
    expect(acapDrawStyleKindForCommand('measurecontinuous')).toBe('measure')
    expect(acapDrawStyleKindForCommand('MEASUREANGLE')).toBe('measure')
  })

  it('ignores visibility / import commands', () => {
    expect(acapDrawStyleKindForCommand('measurementvis')).toBeUndefined()
    expect(acapDrawStyleKindForCommand('line')).toBeUndefined()
  })
})

describe('acuiResolveDrawStyleKind', () => {
  it('keeps the overlay kind from overlay selection when no draw command is active', () => {
    expect(acuiResolveDrawStyleKind({ measurementSelected: true })).toBe(
      'measure'
    )
    expect(acuiResolveDrawStyleKind({})).toBeUndefined()
  })

  it('prefers an active draw command over overlay selection', () => {
    expect(
      acuiResolveDrawStyleKind({
        commandKind: 'measure',
        measurementSelected: false
      })
    ).toBe('measure')
  })
})

describe('acuiShouldShowDrawStyleToolbar', () => {
  it('shows the overlay when a draw command is active and the ribbon is hidden', () => {
    expect(acuiShouldShowDrawStyleToolbar('measure', false)).toBe(true)
  })

  it('hides the overlay when the ribbon is visible so ribbon style controls stay usable', () => {
    expect(acuiShouldShowDrawStyleToolbar('measure', true)).toBe(false)
  })

  it('hides the overlay when no draw command is active', () => {
    expect(acuiShouldShowDrawStyleToolbar(undefined, false)).toBe(false)
    expect(acuiShouldShowDrawStyleToolbar(undefined, true)).toBe(false)
  })
})

describe('acuiBindDrawStyleSessionAccessory', () => {
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
        get: <T,>(id: string) => providers.get(id) as T | undefined,
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
    acuiBindDrawStyleSessionAccessory(command)
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
        get: <T,>(id: string) => providers.get(id) as T | undefined,
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
    acuiBindDrawStyleSessionAccessory(command)
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
