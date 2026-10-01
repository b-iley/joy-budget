import { Check, ChevronLeft, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CategoryIcon } from '../components/CategoryIcon'
import { TransactionRow } from '../components/TransactionRow'
import { useCategories } from '../context/CategoriesContext'
import { useTransactions } from '../context/TransactionsContext'
import type { TransactionType } from '../types'
import { FIXED_EXPENSE_DISPLAY_CATEGORY } from '../types'
import { currentMonth, formatDayLabel, formatMonthTitle, formatWon, monthKey } from '../utils/format'

export function CategoryDetail() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { transactions } = useTransactions()
  const { getCategory } = useCategories()

  const state = (location.state as { month?: string; type?: TransactionType } | null) ?? {}
  const month = state.month ?? currentMonth()
  const type = state.type ?? 'expense'
  const isFixedExpenseView = categoryId === FIXED_EXPENSE_DISPLAY_CATEGORY.id
  const category = isFixedExpenseView ? FIXED_EXPENSE_DISPLAY_CATEGORY : getCategory(categoryId ?? '')
  const [subcategoryFilter, setSubcategoryFilter] = useState<string | null>(null)
  const [subcategorySelectMode, setSubcategorySelectMode] = useState(false)
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())

  const items = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.type === type &&
          monthKey(t.date) === month &&
          (isFixedExpenseView ? Boolean(t.fixedExpenseId) : t.categoryId === categoryId)
      ),
    [transactions, categoryId, type, month, isFixedExpenseView]
  )

  const total = items.reduce((sum, t) => sum + t.amount, 0)

  const subcategoryBreakdown = useMemo(() => {
    if (!category.subcategories) return []
    const totals = new Map<string, number>()
    let unclassified = 0
    for (const t of items) {
      if (t.subcategoryId) totals.set(t.subcategoryId, (totals.get(t.subcategoryId) ?? 0) + t.amount)
      else unclassified += t.amount
    }
    const rows = category.subcategories.map((s) => ({ id: s.id, label: s.label, amount: totals.get(s.id) ?? 0 }))
    if (unclassified > 0) rows.push({ id: '__unclassified', label: '미분류', amount: unclassified })
    const filtered = rows.filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount)
    const max = filtered[0]?.amount ?? 1
    return filtered.map((r) => ({ ...r, pct: total === 0 ? 0 : Math.round((r.amount / total) * 100), max }))
  }, [items, category, total])

  const selectedSubcategoryTotal = useMemo(
    () => subcategoryBreakdown.filter((r) => selectedSubcategoryIds.has(r.id)).reduce((sum, r) => sum + r.amount, 0),
    [subcategoryBreakdown, selectedSubcategoryIds]
  )

  const filteredItems = useMemo(() => {
    if (subcategorySelectMode) {
      if (selectedSubcategoryIds.size === 0) return items
      return items.filter((t) => selectedSubcategoryIds.has(t.subcategoryId ?? '__unclassified'))
    }
    if (!subcategoryFilter) return items
    if (subcategoryFilter === '__unclassified') return items.filter((t) => !t.subcategoryId)
    return items.filter((t) => t.subcategoryId === subcategoryFilter)
  }, [items, subcategoryFilter, subcategorySelectMode, selectedSubcategoryIds])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof filteredItems>()
    for (const t of filteredItems) {
      const list = groups.get(t.date) ?? []
      list.push(t)
      groups.set(t.date, list)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredItems])

  function toggleFilter(id: string) {
    setSubcategoryFilter((prev) => (prev === id ? null : id))
  }

  function toggleSubcategorySelectMode() {
    setSubcategorySelectMode((v) => !v)
    setSelectedSubcategoryIds(new Set())
  }

  function toggleSubcategorySelected(id: string) {
    setSelectedSubcategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubcategoryRowClick(id: string) {
    if (subcategorySelectMode) toggleSubcategorySelected(id)
    else toggleFilter(id)
  }

  return (
    <div className="page">
      <header className="form-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <span className="transaction-icon" style={{ background: `${category.color}22`, color: category.color }}>
          <CategoryIcon name={category.icon} size={18} />
        </span>
        <h1>{category.label}</h1>
      </header>

      <div className="stat-total">
        <span className="summary-label">
          {formatMonthTitle(month)} · {category.label} {type === 'expense' ? '지출' : '수입'} {items.length}건
        </span>
        <span className={`stat-total-value ${type}`}>{formatWon(total)}</span>
      </div>

      {subcategoryBreakdown.length > 0 && (
        <>
          <div className="stat-list-header">
            <span className="field-label">세부 구분별</span>
            <button type="button" className="stat-select-toggle" onClick={toggleSubcategorySelectMode}>
              {subcategorySelectMode ? '선택 완료' : '여러 개 합산'}
            </button>
          </div>

          {subcategorySelectMode && (
            <div className="stat-total selected-total">
              <span className="summary-label">선택한 {selectedSubcategoryIds.size}개 세부 구분 합계</span>
              <span className={`stat-total-value ${type}`}>{formatWon(selectedSubcategoryTotal)}</span>
            </div>
          )}

          <div className="stat-list subcategory-breakdown">
            {subcategoryBreakdown.map((r) => {
              const checked = selectedSubcategoryIds.has(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`stat-row subcategory-row${!subcategorySelectMode && subcategoryFilter === r.id ? ' active' : ''}${checked ? ' selected' : ''}`}
                  onClick={() => handleSubcategoryRowClick(r.id)}
                >
                  {subcategorySelectMode && (
                    <span className={`stat-row-check${checked ? ' checked' : ''}`}>
                      {checked && <Check size={14} />}
                    </span>
                  )}
                  <div className="stat-row-main">
                    <div className="stat-row-top">
                      <span className="stat-row-label">{r.label}</span>
                      <span className="stat-row-amount">{formatWon(r.amount)}</span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{ width: `${(r.amount / r.max) * 100}%`, background: category.color }}
                      />
                    </div>
                  </div>
                  <span className="stat-row-pct">{r.pct}%</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {!subcategorySelectMode && subcategoryFilter && (
        <button type="button" className="filter-clear" onClick={() => setSubcategoryFilter(null)}>
          <span>
            {subcategoryFilter === '__unclassified'
              ? '미분류'
              : category.subcategories?.find((s) => s.id === subcategoryFilter)?.label}
            만 보는 중
          </span>
          <X size={14} />
        </button>
      )}

      <div className="transaction-list">
        {groupedByDate.length === 0 && <p className="empty-state">해당하는 내역이 없어요.</p>}

        {groupedByDate.map(([date, dayItems]) => {
          const dayTotal = dayItems.reduce((sum, t) => sum + t.amount, 0)
          return (
            <section key={date} className="day-group">
              <div className="day-group-header">
                <span>{formatDayLabel(date)}</span>
                <span className={type}>{formatWon(dayTotal)}</span>
              </div>
              {dayItems.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
