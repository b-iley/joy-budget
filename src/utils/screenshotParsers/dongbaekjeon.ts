import type { OcrLine } from '../ocr'
import type { ParsedScreenshotRow } from './types'

// The app's list rows never show a year, only "M.DD" (e.g. "8.23") — the
// year comes from whenever the screenshot happens to be uploaded (today's
// year) instead, since these are always uploaded close to when they're
// taken. In practice OCR drops the "." entirely ("8.23" -> "823"), so both
// forms are handled (verified against a real screenshot: "823 ... 500,000
// 원" -> month 8, day 23).
const DOTTED_ROW = /^(\d{1,2})\.(\d{1,2})\s+(.+?)\s+([\d,]+)\s*원$/
const SQUASHED_ROW = /^(\d{2,4})\s+(.+?)\s+([\d,]+)\s*원$/

function toRow(year: number, month: number, day: number, merchant: string, amountText: string): ParsedScreenshotRow {
  const amount = Number(amountText.replace(/,/g, ''))
  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    merchant: merchant.trim(),
    amount: amount > 0 ? amount : null,
  }
}

// A squashed run like "823" almost always has only one calendar-valid
// month/day split (month=8, day=23 — "82" isn't a month). It's only
// genuinely ambiguous for months 10-12 with a single-digit day (e.g. "123"
// could be Jan 23 or Dec 3) — tried in this order, so the single-digit-month
// reading wins by default (9 of 12 months are single-digit, so it's the more
// likely reading, and the review step can still fix a wrong guess).
function splitSquashedDate(digits: string): { month: number; day: number } | null {
  for (const monthLen of [1, 2]) {
    if (digits.length <= monthLen) continue
    const month = Number(digits.slice(0, monthLen))
    const day = Number(digits.slice(monthLen))
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day }
  }
  return null
}

export function parseDongbaekjeonScreenshot(lines: OcrLine[], year: number): ParsedScreenshotRow[] {
  const rows: ParsedScreenshotRow[] = []

  for (const line of lines) {
    const text = line.text.trim()

    const dotted = text.match(DOTTED_ROW)
    if (dotted) {
      const [, m, d, merchant, amountText] = dotted
      rows.push(toRow(year, Number(m), Number(d), merchant, amountText))
      continue
    }

    const squashed = text.match(SQUASHED_ROW)
    if (squashed) {
      const [, digits, merchant, amountText] = squashed
      const split = splitSquashedDate(digits)
      if (!split) continue
      rows.push(toRow(year, split.month, split.day, merchant, amountText))
    }
  }

  return rows
}
