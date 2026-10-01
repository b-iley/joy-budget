import type { PdfTextItem } from '../pdf'
import type { ParsedStatementRow } from './types'

// KB국민은행 "계좌 거래내역 조회" PDF table columns, identified by x-position
// (pdf.js gives each text run its own x/y — there's no reliable whitespace
// structure to split on like plain-text extraction would have). Column
// x-ranges below were measured from a real exported statement; the columns
// are: 거래일시 | 적요 | 보낸분/받는분 | 출금액 | 입금액 | 잔액 | 송금메모 | 거래점
const COUNTERPARTY_X = [155, 250] as const
const WITHDRAWAL_X = [250, 320] as const
const DEPOSIT_X = [320, 365] as const

const DATE_RE = /^(\d{4})\.(\d{2})\.(\d{2})\s+\d{2}:\d{2}:\d{2}$/

// Some rows (loan auto-payments) wrap their 보낸분/받는분 text onto a second
// line inside the same table row — that continuation lands a few points above
// or below the row's true y, well under half a row's height (~22-23pt) away.
// Anchoring every item to its nearest 거래일시 item (which is never wrapped)
// reassembles those rows correctly regardless of extraction order.
const ROW_ANCHOR_TOLERANCE = 15

function inRange(x: number, [min, max]: readonly [number, number]): boolean {
  return x >= min && x < max
}

function parseAmount(items: PdfTextItem[]): number {
  const text = items
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((it) => it.text)
    .join('')
  const n = Number(text.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function parseKbStatement(items: PdfTextItem[]): ParsedStatementRow[] {
  const rows: ParsedStatementRow[] = []

  const itemsByPage = new Map<number, PdfTextItem[]>()
  for (const item of items) {
    const list = itemsByPage.get(item.page) ?? []
    list.push(item)
    itemsByPage.set(item.page, list)
  }

  for (const pageItems of itemsByPage.values()) {
    const anchors = pageItems.filter((it) => DATE_RE.test(it.text))
    if (anchors.length === 0) continue

    const rowItems: PdfTextItem[][] = anchors.map(() => [])
    for (const item of pageItems) {
      let closestIdx = -1
      let closestDist = Infinity
      anchors.forEach((anchor, idx) => {
        const dist = Math.abs(anchor.y - item.y)
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = idx
        }
      })
      if (closestIdx >= 0 && closestDist <= ROW_ANCHOR_TOLERANCE) {
        rowItems[closestIdx].push(item)
      }
    }

    anchors.forEach((anchor, idx) => {
      const cells = rowItems[idx]
      const match = anchor.text.match(DATE_RE)
      const date = match ? `${match[1]}-${match[2]}-${match[3]}` : null

      const counterparty =
        cells
          .filter((it) => inRange(it.x, COUNTERPARTY_X))
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((it) => it.text)
          .join(' ')
          .trim() || null

      const withdrawal = parseAmount(cells.filter((it) => inRange(it.x, WITHDRAWAL_X)))
      const deposit = parseAmount(cells.filter((it) => inRange(it.x, DEPOSIT_X)))

      rows.push({ date, counterparty, withdrawal, deposit })
    })
  }

  return rows
}
