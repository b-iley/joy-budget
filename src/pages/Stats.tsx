import { Check, Download, Plus, Table2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { CategoryIcon } from '../components/CategoryIcon'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useCategories } from '../context/CategoriesContext'
import { useTransactions } from '../context/TransactionsContext'
import type { TransactionType } from '../types'
import { exportMonthAsJson, readBackupFile } from '../utils/backup'
import { currentMonth, formatMonthTitle, formatWon, monthKey } from '../utils/format'
import { sendMonthToGoogleSheets } from '../utils/googleSheets'
import { getSheetsWebhookUrl } from '../utils/settings'

export function Stats() {
  const navigate = useNavigate()
  const { transactions, importTransactions } = useTransactions()
  const { categoriesFor, getCategory, customCategories, importCategories } = useCategories()
  const [month, setMonth] = useState(currentMonth())
  const [type, setType] = useState<TransactionType>('expense')
  const [importMessage, setImportMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sheetsSending, setSheetsSending] = useState(false)
  const [sheetsMessage, setSheetsMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

  const rows = useMemo(() => {
    const categories = categoriesFor(type)
    const totals = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== type || monthKey(t.date) !== month) continue
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount)
    }
    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0)
    return categories
      .map((c) => ({ category: c, amount: totals.get(c.id) ?? 0 }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((r) => ({ ...r, pct: total === 0 ? 0 : Math.round((r.amount / total) * 100) }))
      .map((r, _, arr) => ({ ...r, max: arr[0]?.amount ?? 1 }))
  }, [transactions, month, type, categoriesFor])

  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  const selectedTotal = useMemo(
    () => rows.filter((r) => selectedCategoryIds.has(r.category.id)).reduce((sum, r) => sum + r.amount, 0),
    [rows, selectedCategoryIds]
  )

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedCategoryIds(new Set())
  }

  function toggleCategorySelected(categoryId: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function handleRowClick(categoryId: string) {
    if (selectMode) toggleCategorySelected(categoryId)
    else navigate(`/category/${categoryId}`, { state: { month, type } })
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const { transactions: incoming, categories: incomingCategories } = await readBackupFile(file)
      await importTransactions(incoming)
      if (incomingCategories.length > 0) await importCategories(incomingCategories)
      setImportMessage({ text: `${incoming.length}건 복원했어요.`, ok: true })
    } catch {
      setImportMessage({ text: '백업 파일을 읽지 못했어요. 이 앱에서 내보낸 JSON 파일인지 확인해주세요.', ok: false })
    }
  }

  async function handleSendToSheets() {
    const sheetsUrl = getSheetsWebhookUrl()
    if (!sheetsUrl) {
      setSheetsMessage({ text: '설정 메뉴에서 구글 시트 연동 URL을 먼저 등록해주세요.', ok: false })
      return
    }
    setSheetsSending(true)
    setSheetsMessage(null)
    try {
      const result = await sendMonthToGoogleSheets(monthTransactions, month, sheetsUrl, getCategory)
      setSheetsMessage({ text: `구글 시트에 반영했어요 (신규 ${result.added}건, 갱신 ${result.updated}건).`, ok: true })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setSheetsMessage({ text: `구글 시트로 보내지 못했어요: ${detail}`, ok: false })
    } finally {
      setSheetsSending(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="app-title">통계</h1>
        <button type="button" className="header-action" onClick={() => navigate('/add')} aria-label="내역 추가">
          <Plus size={20} />
        </button>
      </header>

      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="type-toggle">
        <button
          type="button"
          className={type === 'expense' ? 'active' : ''}
          onClick={() => {
            setType('expense')
            setSelectedCategoryIds(new Set())
          }}
        >
          지출
        </button>
        <button
          type="button"
          className={type === 'income' ? 'active' : ''}
          onClick={() => {
            setType('income')
            setSelectedCategoryIds(new Set())
          }}
        >
          수입
        </button>
      </div>

      <div className="stat-total">
        <span className="summary-label">
          {formatMonthTitle(month)} 총 {type === 'expense' ? '지출' : '수입'}
        </span>
        <span className={`stat-total-value ${type}`}>{formatWon(total)}</span>
      </div>

      <div className="backup-actions">
        <button
          type="button"
          className="backup-action"
          disabled={monthTransactions.length === 0}
          onClick={() => exportMonthAsJson(monthTransactions, month, customCategories)}
        >
          <Download size={16} />
          <span>JSON 백업</span>
        </button>
        <button type="button" className="backup-action" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
          <span>가져오기</span>
        </button>
        <button
          type="button"
          className="backup-action"
          disabled={sheetsSending || monthTransactions.length === 0}
          onClick={handleSendToSheets}
        >
          <Table2 size={16} />
          <span>{sheetsSending ? '보내는 중...' : '구글 시트로'}</span>
        </button>
      </div>

      {importMessage && (
        <p className={importMessage.ok ? 'backup-message' : 'receipt-error'}>{importMessage.text}</p>
      )}
      {sheetsMessage && (
        <p className={sheetsMessage.ok ? 'backup-message' : 'receipt-error'}>{sheetsMessage.text}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="visually-hidden"
        onChange={handleImportFile}
      />

      <div className="stat-list-header">
        <span className="field-label">카테고리별 {type === 'expense' ? '지출' : '수입'}</span>
        <button type="button" className="stat-select-toggle" onClick={toggleSelectMode}>
          {selectMode ? '선택 완료' : '여러 개 합산'}
        </button>
      </div>

      {selectMode && (
        <div className="stat-total selected-total">
          <span className="summary-label">선택한 {selectedCategoryIds.size}개 카테고리 합계</span>
          <span className={`stat-total-value ${type}`}>{formatWon(selectedTotal)}</span>
        </div>
      )}

      <div className="stat-list">
        {rows.length === 0 && <p className="empty-state">표시할 내역이 없어요.</p>}

        {rows.map((r) => {
          const checked = selectedCategoryIds.has(r.category.id)
          return (
            <button
              key={r.category.id}
              type="button"
              className={`stat-row${checked ? ' selected' : ''}`}
              onClick={() => handleRowClick(r.category.id)}
            >
              {selectMode && (
                <span className={`stat-row-check${checked ? ' checked' : ''}`}>
                  {checked && <Check size={14} />}
                </span>
              )}
              <span
                className="transaction-icon"
                style={{ background: `${r.category.color}22`, color: r.category.color }}
              >
                <CategoryIcon name={r.category.icon} size={18} />
              </span>
              <div className="stat-row-main">
                <div className="stat-row-top">
                  <span className="stat-row-label">{r.category.label}</span>
                  <span className="stat-row-amount">{formatWon(r.amount)}</span>
                </div>
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${(r.amount / r.max) * 100}%`, background: r.category.color }}
                  />
                </div>
              </div>
              <span className="stat-row-pct">{r.pct}%</span>
            </button>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
