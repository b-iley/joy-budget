import type { OcrLine } from '../ocr'
import type { ParsedScreenshotRow } from './types'

// A standalone "MM.DD" line is a day header — everything below it (until the
// next one) belongs to that date. No year is shown anywhere, so (like
// 동백전/네이버페이) it comes from whenever this is uploaded instead.
const DATE_HEADER_RE = /^(\d{1,2})\.(\d{1,2})$/

// The merchant name (left) and amount (right) sit on the same visual row, so
// OCR merges them into one line with a wide gap in between. The amount is
// anchored as a proper 3-digit comma-grouped number rather than matching "원"
// literally — on a real screenshot the won sign was sometimes misread as a
// stray digit fused directly onto the number (e.g. "40,260원" -> "40,2608"),
// so up to 2 trailing characters after the number are tolerated and
// discarded instead of required to be "원".
const ROW_RE = /^(.+?)\s+(-?\d{1,3}(?:,\d{3})*)\s*(?:원)?.{0,2}$/

// The payment-method label line under each entry — used only to recognize
// that a line is "just a label" so it's never picked as the fallback name
// below, not to anchor successful rows (the last entry in a cropped
// screenshot can be missing this line entirely).
const PAYMENT_LABEL_RE = /카드|계좌이체|현금/

// This is the "지출 상세내역" (expense detail) screen specifically — every row
// on it is already an expense, so there's nothing to exclude the way the KB
// statement PDF has to exclude deposits.
export function parseKakaoBankScreenshot(lines: OcrLine[], year: number): ParsedScreenshotRow[] {
  // Group lines into day blocks first: everything from one "MM.DD" header up
  // to (not including) the next one.
  const blocks: { date: string; lines: OcrLine[] }[] = []
  for (const line of lines) {
    const dateMatch = line.text.trim().match(DATE_HEADER_RE)
    if (dateMatch) {
      const [, month, day] = dateMatch
      blocks.push({ date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, lines: [] })
      continue
    }
    if (blocks.length > 0) blocks[blocks.length - 1].lines.push(line)
  }

  const rows: ParsedScreenshotRow[] = []

  for (const block of blocks) {
    let matchedAny = false

    for (const line of block.lines) {
      const rowMatch = line.text.trim().match(ROW_RE)
      if (!rowMatch) continue
      matchedAny = true
      const [, merchantRaw, amountText] = rowMatch
      const amount = Math.abs(Number(amountText.replace(/,/g, '')))
      rows.push({ date: block.date, merchant: merchantRaw.trim(), amount: amount > 0 ? amount : null })
    }

    // The amount didn't OCR anywhere in this day's block (seen on a real
    // screenshot) — surface whatever text was recognized with no amount
    // instead of silently dropping the day entirely. The review screen
    // already shows a "금액 인식 실패" warning and leaves it unchecked for
    // anything with amount: null, so this just needs to reach that path.
    if (!matchedAny) {
      const fallback = block.lines.find((l) => {
        const t = l.text.trim()
        return t.length > 0 && !PAYMENT_LABEL_RE.test(t)
      })
      if (fallback) rows.push({ date: block.date, merchant: fallback.text.trim(), amount: null })
    }
  }

  return rows
}
