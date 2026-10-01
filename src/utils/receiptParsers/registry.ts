import type { OcrLine } from '../ocr'
import { parseCoupangEatsReceipt } from './coupangEats'
import type { ParsedReceipt } from './types'

export interface ReceiptPlatform {
  id: string
  label: string
  defaultCategoryId: string
  defaultSubcategoryId?: string
  parse: (lines: OcrLine[]) => ParsedReceipt
}

export const RECEIPT_PLATFORMS: ReceiptPlatform[] = [
  {
    id: 'coupang-eats',
    label: '쿠팡이츠',
    defaultCategoryId: 'food',
    defaultSubcategoryId: 'delivery',
    parse: parseCoupangEatsReceipt,
  },
]
