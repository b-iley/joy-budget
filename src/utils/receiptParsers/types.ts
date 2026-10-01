export interface ParsedReceipt {
  merchant: string | null
  date: string | null // YYYY-MM-DD
  amount: number | null
  title: string
}
