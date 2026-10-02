import type { OcrLine } from '../ocr'
import type { ParsedReceipt } from './types'

// Same OCR-lookalike-currency-glyph leniency as the 쿠팡이츠 parser (e.g. "원"
// occasionally misread) — duplicated rather than shared, since each receipt
// parser in this project stays self-contained (see coupangEats.ts).
function extractAmount(text: string): number | null {
  const matches = text.match(/-?[\d][\d,]*(?=\s*[^\d\s]{0,3}\s*$)/g)
  if (!matches || matches.length === 0) return null
  return Number(matches[matches.length - 1].replace(/,/g, ''))
}

// "2026. 10. 1 주문" — the 쿠팡 "주문상세" page actually shows the year, unlike
// 쿠팡이츠/동백전/네이버페이, so no upload-time fallback is needed here.
const DATE_RE = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*주문/

// Between the amount info and the product name sits the recipient's name,
// address and phone number — never usable as the title, and of variable
// length, so a fixed line-offset (like 쿠팡이츠's "2 lines above date") can't
// skip past it reliably. Anchoring on the order-status label right before
// the product name does, regardless of how long the address block is.
const STATUS_RE = /^(배송완료|배송중|배송준비중|상품준비중|결제완료|주문완료|구매확정|취소완료|반품완료|교환완료)/

export function parseCoupangReceipt(lines: OcrLine[]): ParsedReceipt {
  const dateIdx = lines.findIndex((l) => DATE_RE.test(l.text.trim()))
  const dateMatch = dateIdx >= 0 ? lines[dateIdx].text.trim().match(DATE_RE) : null
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : null

  const totalIdx = lines.findIndex((l) => /총\s*결제\s*금액/.test(l.text))
  const amount = totalIdx >= 0 ? extractAmount(lines[totalIdx].text) : null

  const statusIdx = lines.findIndex((l) => STATUS_RE.test(l.text.trim()))
  const rawItem = statusIdx >= 0 ? lines[statusIdx + 1]?.text.trim() : undefined
  const merchant = rawItem ? rawItem.replace(/^[-•\s]+/, '').trim() || null : null

  return { merchant, date, amount, title: merchant ?? '쿠팡 주문' }
}
