import { ChevronLeft, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CategoryIcon } from '../components/CategoryIcon'
import { useCategories } from '../context/CategoriesContext'
import { useMerchantRules } from '../context/MerchantRulesContext'
import { useTransactions } from '../context/TransactionsContext'
import type { TransactionType } from '../types'
import { todayISO } from '../utils/format'

export function TransactionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getById, addTransaction, updateTransaction, removeTransaction } = useTransactions()
  const { categoriesFor, getCategory } = useCategories()
  const { getSuggestion } = useMerchantRules()
  const editing = id ? getById(id) : undefined
  const isEdit = Boolean(id)
  const prefill =
    (location.state as {
      type?: TransactionType
      amount?: number
      date?: string
      title?: string
      memo?: string
      categoryId?: string
      subcategoryId?: string
    } | null) ?? {}

  const [type, setType] = useState<TransactionType>(editing?.type ?? prefill.type ?? 'expense')
  const [amountText, setAmountText] = useState(
    editing ? String(editing.amount) : prefill.amount ? String(prefill.amount) : ''
  )
  const [categoryId, setCategoryId] = useState(
    editing?.categoryId ?? prefill.categoryId ?? categoriesFor(prefill.type ?? 'expense')[0].id
  )
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(
    editing?.subcategoryId ?? prefill.subcategoryId
  )
  const [date, setDate] = useState(editing?.date ?? prefill.date ?? todayISO())
  const [title, setTitle] = useState(editing?.title ?? prefill.title ?? '')
  const [memo, setMemo] = useState(editing?.memo ?? prefill.memo ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // If the transaction being edited uses a category that's since been hidden,
  // keep showing it in the grid (already selected) instead of making the
  // current selection vanish from the list.
  const categories = useMemo(() => {
    const base = categoriesFor(type)
    if (editing && !base.some((c) => c.id === editing.categoryId)) {
      return [...base, getCategory(editing.categoryId)]
    }
    return base
  }, [type, categoriesFor, editing, getCategory])
  const selectedCategory = getCategory(categoryId)
  // Same idea as the category grid above: don't let the currently-selected
  // subcategory disappear from its chip row just because it's been hidden.
  const subcategoryOptions = useMemo(() => {
    const all = selectedCategory.subcategories ?? []
    const visible = all.filter((s) => !s.hidden)
    if (subcategoryId && !visible.some((s) => s.id === subcategoryId)) {
      const current = all.find((s) => s.id === subcategoryId)
      if (current) return [...visible, current]
    }
    return visible
  }, [selectedCategory, subcategoryId])
  const amount = Number(amountText.replace(/[^0-9]/g, ''))
  const canSave = amount > 0 && categoryId && date

  if (isEdit && !editing) {
    return (
      <div className="page">
        <header className="form-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="뒤로">
            <ChevronLeft size={22} />
          </button>
          <h1>내역을 찾을 수 없어요</h1>
        </header>
      </div>
    )
  }

  function handleTypeChange(next: TransactionType) {
    setType(next)
    setCategoryId(categoriesFor(next)[0].id)
    setSubcategoryId(undefined)
  }

  function handleCategoryChange(nextCategoryId: string) {
    if (nextCategoryId !== categoryId) setSubcategoryId(undefined)
    setCategoryId(nextCategoryId)
  }

  // Only for brand-new entries — editing an existing transaction shouldn't
  // have its already-settled category silently swapped out from under it.
  function handleTitleBlur() {
    if (isEdit) return
    const suggestion = getSuggestion(title, type)
    if (suggestion) {
      setCategoryId(suggestion.categoryId)
      setSubcategoryId(suggestion.subcategoryId)
    }
  }

  async function handleSave() {
    if (!canSave) return
    const input = { type, amount, categoryId, subcategoryId, date, title: title.trim(), memo: memo.trim() }
    if (id) await updateTransaction(id, input)
    else await addTransaction(input)
    navigate('/')
  }

  async function handleDelete() {
    if (!id) return
    await removeTransaction(id)
    navigate('/')
  }

  return (
    <div className="page">
      <header className="form-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1>{isEdit ? '내역 수정' : '내역 추가'}</h1>
        {isEdit && (
          <button
            type="button"
            className="icon-button danger"
            onClick={() => setConfirmingDelete(true)}
            aria-label="삭제"
          >
            <Trash size={19} />
          </button>
        )}
      </header>

      {confirmingDelete && (
        <div className="confirm-bar">
          <span>이 내역을 삭제할까요?</span>
          <div className="confirm-actions">
            <button type="button" onClick={() => setConfirmingDelete(false)}>
              취소
            </button>
            <button type="button" className="danger" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </div>
      )}

      <div className="type-toggle">
        <button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => handleTypeChange('expense')}>
          지출
        </button>
        <button type="button" className={type === 'income' ? 'active' : ''} onClick={() => handleTypeChange('income')}>
          수입
        </button>
      </div>

      <label className="field">
        <span className="field-label">금액</span>
        <div className="amount-input">
          <input
            inputMode="numeric"
            placeholder="0"
            value={amountText ? Number(amountText.replace(/[^0-9]/g, '')).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmountText(e.target.value)}
          />
          <span>원</span>
        </div>
      </label>

      <div className="field">
        <span className="field-label">카테고리</span>
        <div className="category-grid">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-chip${categoryId === c.id ? ' selected' : ''}`}
              style={categoryId === c.id ? { borderColor: c.color, background: `${c.color}18` } : undefined}
              onClick={() => handleCategoryChange(c.id)}
            >
              <span className="transaction-icon" style={{ background: `${c.color}22`, color: c.color }}>
                <CategoryIcon name={c.icon} size={18} />
              </span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {subcategoryOptions.length > 0 && (
        <div className="field">
          <span className="field-label">세부 구분 (선택)</span>
          <div className="subcategory-chips">
            {subcategoryOptions.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`subcategory-chip${subcategoryId === s.id ? ' selected' : ''}`}
                onClick={() => setSubcategoryId(subcategoryId === s.id ? undefined : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span className="field-label">날짜</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">내용 (선택)</span>
        <input
          type="text"
          placeholder="예: 휴지, 이마트, 스타벅스"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          maxLength={60}
        />
      </label>

      <label className="field">
        <span className="field-label">메모 (선택)</span>
        <input
          type="text"
          placeholder="메모를 입력하세요"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={60}
        />
      </label>

      <button type="button" className="save-button" disabled={!canSave} onClick={handleSave}>
        저장
      </button>
    </div>
  )
}
