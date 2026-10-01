import type { Category, Transaction } from '../types'

interface SheetsResult {
  ok: boolean
  added?: number
  updated?: number
  error?: string
}

export async function sendMonthToGoogleSheets(
  transactions: Transaction[],
  month: string,
  webhookUrl: string,
  getCategory: (id: string) => Category
): Promise<{ added: number; updated: number }> {
  const rows = transactions.map((t) => {
    const category = getCategory(t.categoryId)
    const subcategory = category.subcategories?.find((s) => s.id === t.subcategoryId)
    return {
      id: t.id,
      date: t.date,
      type: t.type === 'income' ? '수입' : '지출',
      category: category.label,
      subcategory: subcategory?.label ?? '',
      title: t.title,
      memo: t.memo,
      amount: t.type === 'income' ? t.amount : -t.amount,
    }
  })

  // text/plain avoids a CORS preflight (OPTIONS) request, which Apps Script
  // web apps don't handle — the doPost side still parses the body as JSON.
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ month, rows }),
  })

  if (!response.ok) throw new Error(`요청 실패 (HTTP ${response.status})`)

  const text = await response.text()
  let data: SheetsResult
  try {
    data = JSON.parse(text)
  } catch {
    // Apps Script returned non-JSON (usually an HTML login page) — almost
    // always means the deployment's access isn't set to "Anyone".
    throw new Error('응답이 예상과 달라요 (배포 시 액세스 권한이 "모든 사용자"인지 확인해주세요)')
  }

  if (!data.ok) throw new Error(data.error ?? '알 수 없는 오류')

  return { added: data.added ?? 0, updated: data.updated ?? 0 }
}
