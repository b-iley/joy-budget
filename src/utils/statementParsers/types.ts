export interface ParsedStatementRow {
  date: string | null // YYYY-MM-DD
  counterparty: string | null // 보낸분/받는분
  withdrawal: number
  deposit: number
}
