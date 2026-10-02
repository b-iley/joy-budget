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

// This is the "지출 상세내역" (expense detail) screen specifically — every row
// on it is already an expense, so there's nothing to exclude the way the KB
// statement PDF has to exclude deposits.
export function parseKakaoBankScreenshot(lines: OcrLine[], year: number): ParsedScreenshotRow[] {
  const rows: ParsedScreenshotRow[] = []
  let currentDate: string | null = null

  for (const line of lines) {
    const text = line.text.trim()

    const dateMatch = text.match(DATE_HEADER_RE)
    if (dateMatch) {
      const [, month, day] = dateMatch
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      continue
    }

    if (!currentDate) continue
    const rowMatch = text.match(ROW_RE)
    if (!rowMatch) continue

    const [, merchantRaw, amountText] = rowMatch
    const amount = Math.abs(Number(amountText.replace(/,/g, '')))
    if (!amount) continue

    rows.push({ date: currentDate, merchant: merchantRaw.trim(), amount })
  }

  return rows
}
