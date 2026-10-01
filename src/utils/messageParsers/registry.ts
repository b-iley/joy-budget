import { detectKbBankMessage, parseKbBankMessage } from './kbBank'
import type { ParsedMessage } from './types'

export interface MessagePlatform {
  id: string
  label: string
  detect: (text: string) => boolean
  parse: (text: string) => ParsedMessage
}

export const MESSAGE_PLATFORMS: MessagePlatform[] = [
  {
    id: 'kb-bank',
    label: 'KB국민은행',
    detect: detectKbBankMessage,
    parse: parseKbBankMessage,
  },
]

export function parseMessage(text: string): ParsedMessage | null {
  const platform = MESSAGE_PLATFORMS.find((p) => p.detect(text))
  return platform ? platform.parse(text) : null
}
