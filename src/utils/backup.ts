import type { Category, Transaction } from '../types'

interface BackupPayload {
  app: 'joy-family'
  exportedAt: string
  month: string
  transactions: Transaction[]
  categories: Category[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportMonthAsJson(transactions: Transaction[], month: string, customCategories: Category[]) {
  const payload: BackupPayload = {
    app: 'joy-family',
    exportedAt: new Date().toISOString(),
    month,
    transactions,
    categories: customCategories,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `joy-family-${month}.json`)
}

export async function readBackupFile(file: File): Promise<{ transactions: Transaction[]; categories: Category[] }> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Partial<BackupPayload> | Transaction[]
  const transactions = Array.isArray(parsed) ? parsed : parsed.transactions
  const categories = Array.isArray(parsed) ? [] : (parsed.categories ?? [])

  if (!Array.isArray(transactions) || transactions.some((t) => !t || typeof t.id !== 'string')) {
    throw new Error('올바른 백업 파일이 아니에요.')
  }

  return { transactions, categories }
}
