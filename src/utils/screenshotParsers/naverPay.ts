import type { OcrLine } from '../ocr'
import type { ParsedScreenshotRow } from './types'

// Each card is 3 lines top-to-bottom: status ("결제완료"/"결제취소"/"취소완료"),
// product name, then "금액원 M. D. HH:MM 결제" — anchored on that last line.
// The trailing label OCRs inconsistently ("결제"/"ZH"/"검제" all seen on a
// real screenshot) so it's deliberately not matched, and the "|" the UI shows
// before the date doesn't survive OCR at all. No year is shown anywhere, so
// (like 동백전) it comes from whenever this is uploaded instead.
const ROW_RE = /^([\d,]+)원\s+(\d{1,2})\.\s*(\d{1,2})\./

export function parseNaverPayScreenshot(lines: OcrLine[], year: number): ParsedScreenshotRow[] {
  const rows: ParsedScreenshotRow[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].text.trim().match(ROW_RE)
    if (!match) continue

    // Only "결제완료" — 결제취소/취소완료 (or anything else) rows are skipped per
    // the user's instruction, since those aren't real completed expenses.
    const status = lines[i - 2]?.text ?? ''
    if (!status.includes('결제완료')) continue

    const [, amountText, month, day] = match
    const amount = Number(amountText.replace(/,/g, ''))
    const merchant = lines[i - 1]?.text.trim() ?? ''

    rows.push({
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      merchant,
      amount: amount > 0 ? amount : null,
    })
  }

  return rows
}
