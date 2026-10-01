import type { TransactionType } from '../../types'

export interface ParsedMessage {
  merchant: string | null
  date: string | null // YYYY-MM-DD
  amount: number | null
  type: TransactionType
  title: string
}
