import { ChevronLeft, Pencil, Trash } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryIcon } from '../components/CategoryIcon'
import { useCategories } from '../context/CategoriesContext'
import { useFixedExpenses } from '../context/FixedExpensesContext'
import type { FixedExpense } from '../types'
import { currentMonth, formatMonthTitle, formatWon } from '../utils/format'

// A hung IndexedDB connection (e.g. a stale tab/old PWA instance holding the
// db open elsewhere) blocks forever with no error — turn that into a message
// the user can act on instead of a save button stuck silently disabled.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export function FixedExpenses() {
  const navigate = useNavigate()
  const { categoriesFor, getCategory } = useCategories()
  const { fixedExpenses, addFixedExpense, updateFixedExpense, removeFixedExpense } = useFixedExpenses()
  const expenseCategories = categoriesFor('expense')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? '')
  const [day, setDay] = useState('1')
  const [startMonth, setStartMonth] = useState(currentMonth())
  const [endMonth, setEndMonth] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = Number(amountText.replace(/[^0-9]/g, ''))
  const dayNum = Number(day)
  const canSave =
    Boolean(title.trim()) &&
    amount > 0 &&
    categoryId &&
    dayNum >= 1 &&
    dayNum <= 31 &&
    Boolean(startMonth) &&
    (!endMonth || endMonth >= startMonth)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setAmountText('')
    setCategoryId(expenseCategories[0]?.id ?? '')
    setDay('1')
    setStartMonth(currentMonth())
    setEndMonth('')
    setMemo('')
  }

  function startEdit(fe: FixedExpense) {
    setEditingId(fe.id)
    setTitle(fe.title)
    setAmountText(String(fe.amount))
    setCategoryId(fe.categoryId)
    setDay(String(fe.day))
    setStartMonth(fe.startMonth)
    setEndMonth(fe.endMonth ?? '')
    setMemo(fe.memo)
  }

  async function handleSave() {
    if (!canSave) return
    const input = {
      title: title.trim(),
      amount,
      categoryId,
      day: dayNum,
      startMonth,
      endMonth: endMonth || undefined,
      memo: memo.trim(),
    }
    setSaving(true)
    setError(null)
    try {
      if (editingId) await withTimeout(updateFixedExpense(editingId, input), 5000)
      else await withTimeout(addFixedExpense(input), 5000)
      resetForm()
    } catch (err) {
      console.error('고정지출 저장 실패:', err)
      if (err instanceof Error && err.message === 'timeout') {
        setError('저장이 너무 오래 걸려요. 이 앱을 열어둔 다른 탭이나 창이 있다면 전부 닫고 새로고침해서 다시 시도해주세요.')
      } else {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
        setError(`저장하지 못했어요 (${detail}). 이 메시지를 알려주세요.`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    if (editingId === id) resetForm()
    await removeFixedExpense(id)
  }

  return (
    <div className="page">
      <header className="form-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1>고정지출 관리</h1>
      </header>

      <p className="section-hint">
        월세, 구독료처럼 매달 반복되는 지출을 한 번 등록해두면 따로 입력하지 않아도 자동으로 기록돼요. 생성된
        내역은 홈 화면과 통계에서 카테고리 대신 "고정지출"로 따로 표시돼요. 다만 앱에 별도 서버가 없어서, 그 달이
        된 뒤 앱을 한 번은 열어야 그 달치가 채워져요.
      </p>

      <div className="settings-section">
        <span className="field-label">{editingId ? '고정지출 수정' : '고정지출 추가'}</span>

        <input
          type="text"
          placeholder="이름 (예: 월세, 넷플릭스)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="amount-input">
          <input
            inputMode="numeric"
            placeholder="0"
            value={amountText ? Number(amountText.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmountText(e.target.value)}
          />
          <span>원</span>
        </div>

        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="fixed-expense-fields-row">
          <label className="fixed-expense-field">
            <span className="field-label">매달</span>
            <div className="fixed-expense-day-input">
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <span>일</span>
            </div>
          </label>
          <label className="fixed-expense-field">
            <span className="field-label">시작월</span>
            <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
          </label>
        </div>

        <label className="fixed-expense-field">
          <span className="field-label">종료월 (선택, 비워두면 계속 반복돼요)</span>
          <div className="inline-field-row">
            <input type="month" value={endMonth} min={startMonth} onChange={(e) => setEndMonth(e.target.value)} />
            {endMonth && (
              <button type="button" className="inline-field-save" onClick={() => setEndMonth('')}>
                지우기
              </button>
            )}
          </div>
        </label>
        {endMonth && endMonth < startMonth && (
          <p className="receipt-error">종료월은 시작월보다 빠를 수 없어요.</p>
        )}

        <input type="text" placeholder="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} />

        <div className="form-actions">
          <button type="button" className="save-button" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? '저장 중...' : editingId ? '수정 저장' : '고정지출 추가'}
          </button>
          {editingId && (
            <button type="button" className="cancel-button" onClick={resetForm}>
              취소
            </button>
          )}
        </div>

        {error && <p className="receipt-error">{error}</p>}
      </div>

      <div className="settings-section">
        <span className="field-label">등록된 고정지출</span>

        {fixedExpenses.length === 0 ? (
          <p className="section-hint">아직 등록된 고정지출이 없어요.</p>
        ) : (
          <div className="draft-list">
            {fixedExpenses.map((fe) => {
              const category = getCategory(fe.categoryId)
              return (
                <div key={fe.id} className="draft-row">
                  <span
                    className="transaction-icon"
                    style={{ background: `${category.color}22`, color: category.color }}
                  >
                    <CategoryIcon name={category.icon} size={18} />
                  </span>
                  <div className="draft-main">
                    <div className="draft-top">
                      <span className="draft-merchant">{fe.title}</span>
                      <span className="draft-date">매달 {fe.day}일</span>
                    </div>
                    <span className="fixed-expense-meta">
                      {category.label} · {formatWon(fe.amount)}
                      {fe.endMonth ? ` · ${formatMonthTitle(fe.endMonth)}까지` : ''}
                    </span>
                  </div>
                  <div className="draft-amount">
                    <button
                      type="button"
                      className="category-pill-action"
                      onClick={() => startEdit(fe)}
                      aria-label={`${fe.title} 수정`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="category-pill-action"
                      onClick={() => handleRemove(fe.id)}
                      aria-label={`${fe.title} 삭제`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
