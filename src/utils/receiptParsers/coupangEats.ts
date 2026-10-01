import type { OcrLine } from '../ocr'
import type { ParsedReceipt } from './types'

// OCR occasionally misreads the "원" won-sign as a lookalike symbol (e.g. "¥"),
// so trailing-price patterns match on the digit run and allow the currency glyph
// itself to be anything short and non-numeric rather than requiring an exact "원".
function extractAmount(text: string): number | null {
  const matches = text.match(/-?[\d][\d,]*(?=\s*[^\d\s]{0,3}\s*$)/g)
  if (!matches || matches.length === 0) return null
  return Number(matches[matches.length - 1].replace(/,/g, ''))
}

function stripTrailingPrice(text: string): string {
  return text.replace(/-?[\d][\d,]*\s*[^\d\s]{0,3}\s*$/, '').trim()
}

export function parseCoupangEatsReceipt(lines: OcrLine[]): ParsedReceipt {
  const dateIdx = lines.findIndex((l) => /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(l.text))
  const date = dateIdx >= 0 ? (lines[dateIdx].text.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null) : null

  // The merchant name always sits two lines above the date line (name, order-no
  // line, date line), which is a much more reliable anchor than re-reading the
  // "주문번호" label text, since OCR sometimes garbles that label.
  const orderNoIdx = lines.findIndex((l) => /주문번호/.test(l.text.trim()))
  const merchant =
    dateIdx >= 2
      ? lines[dateIdx - 2].text.trim()
      : orderNoIdx > 0
        ? lines[orderNoIdx - 1].text.trim()
        : null

  const totalIdx = lines.findIndex((l) => /총\s*결제\s*금액/.test(l.text))
  const amount = totalIdx >= 0 ? extractAmount(lines[totalIdx].text) : null

  const orderAmountIdx = lines.findIndex((l) => /주문금액/.test(l.text.trim()))

  let mainItem: string | null = null
  let itemGroupCount = 0
  if (dateIdx >= 0 && orderAmountIdx > dateIdx) {
    const itemLines = lines.slice(dateIdx + 1, orderAmountIdx)
    if (itemLines.length > 0) {
      const baseX0 = Math.min(...itemLines.map((l) => l.x0))
      const topLevelNames = itemLines
        .filter((l) => l.x0 - baseX0 <= 6)
        .map((l) => stripTrailingPrice(l.text))
        .filter(Boolean)
      itemGroupCount = topLevelNames.length
      mainItem = topLevelNames[0] ?? null
    }
  }

  let title = ''
  if (merchant && mainItem) {
    title = `${merchant} - ${mainItem}`
    if (itemGroupCount > 1) title += ` 외 ${itemGroupCount - 1}건`
  } else if (merchant) {
    title = merchant
  } else if (mainItem) {
    title = mainItem
  }

  return { merchant, date, amount, title }
}
