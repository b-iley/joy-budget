import type { ParsedMessage } from './types'

// KB국민은행 입출금 알림 문자 형식:
// [Web발신]
// [KB]09/22 00:07
// 011202**208
// 쿠팡
// 출금
// 4,330
// 잔액2,214,428
export function detectKbBankMessage(text: string): boolean {
  return /\[KB\]/.test(text) && /^(출금|입금)$/m.test(text)
}

export function parseKbBankMessage(text: string): ParsedMessage {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const dateLineIdx = lines.findIndex((l) => /^\[KB\]/.test(l))
  const dateMatch = dateLineIdx >= 0 ? lines[dateLineIdx].match(/(\d{2})\/(\d{2})\s+\d{2}:\d{2}/) : null
  const year = new Date().getFullYear()
  const date = dateMatch ? `${year}-${dateMatch[1]}-${dateMatch[2]}` : null

  const typeLineIdx = lines.findIndex((l) => l === '출금' || l === '입금')
  const type: ParsedMessage['type'] = lines[typeLineIdx] === '입금' ? 'income' : 'expense'
  const merchant = typeLineIdx > 0 ? lines[typeLineIdx - 1] : null

  const amountLine = typeLineIdx >= 0 ? lines[typeLineIdx + 1] : undefined
  const amount = amountLine ? Number(amountLine.replace(/[^\d]/g, '')) || null : null

  return { merchant, date, amount, type, title: merchant ?? '' }
}
