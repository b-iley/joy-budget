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

// Exact match only (not substring) — e.g. plain "쿠팡" must stay excluded
// without also catching an unrelated merchant whose name merely contains it.
const EXCLUDED_COUNTERPARTIES = ['쿠팡이츠', '쿠팡', '네이버페이']

export const STATEMENT_PLATFORMS: StatementPlatform[] = [
  {
    id: 'kb-bank',
    label: 'KB국민은행 거래내역서',
    requiresPassword: true,
    defaultCategoryId: 'etc_expense',
    parse: parseKbStatement,
    // per user: skip deposits entirely, and skip withdrawals to merchants
    // that are already captured via their own dedicated upload flow (영수증
    // 업로드 등), so keeping them here would double-count.
    shouldExclude: (row) => row.deposit > 0 || EXCLUDED_COUNTERPARTIES.includes(row.counterparty ?? ''),
  },
]
