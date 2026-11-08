import { EditorCommandStack } from '../editor'
import { ApplicationI18n, type ApplicationLocale, type ApplicationLocaleChangedEventArgs } from './ApplicationI18n'
import enCommand from './en/command'
import enJig from './en/jig'
import enMain from './en/main'

// Register core locale messages
ApplicationI18n.mergeLocaleMessage('en', {
  command: enCommand,
  jig: enJig,
  main: enMain
})

export const cmdDescription = (groupName: string, cmdName: string) => {
  const key = `command.${groupName}.${cmdName}`
  return ApplicationI18n.t(key)
}

export const sysCmdDescription = (name: string) => {
  return cmdDescription(EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME, name)
}

export const userCmdDescription = (name: string) => {
  return cmdDescription(EditorCommandStack.DEFAUT_COMMAND_GROUP_NAME, name)
}

export { ApplicationI18n, type ApplicationLocale, type ApplicationLocaleChangedEventArgs }
