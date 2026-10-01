import type { PdfTextItem } from '../pdf'
import { parseKbStatement } from './kbBank'
import type { ParsedStatementRow } from './types'

export interface StatementPlatform {
  id: string
  label: string
  requiresPassword: boolean
  defaultCategoryId: string
  parse: (items: PdfTextItem[]) => ParsedStatementRow[]
  shouldExclude: (row: ParsedStatementRow) => boolean
}

export const STATEMENT_PLATFORMS: StatementPlatform[] = [
  {
    id: 'kb-bank',
    label: 'KB국민은행 거래내역서',
    requiresPassword: true,
    defaultCategoryId: 'etc_expense',
    parse: parseKbStatement,
    // per user: skip deposits entirely, and skip 쿠팡이츠 withdrawals (already
    // captured via the receipt-upload flow, so keeping them here would double-count).
    shouldExclude: (row) => row.deposit > 0 || row.counterparty === '쿠팡이츠',
  },
]
