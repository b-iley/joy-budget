import { useNavigate } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import type { Transaction } from '../types'
import { FIXED_EXPENSE_DISPLAY_CATEGORY } from '../types'
import { formatSigned } from '../utils/format'
import { CategoryIcon } from './CategoryIcon'

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const navigate = useNavigate()
  const { getCategory } = useCategories()
  const realCategory = getCategory(transaction.categoryId)
  const isFixedExpense = Boolean(transaction.fixedExpenseId)
  // Generated from a FixedExpense template — show as "고정지출" regardless of
  // its real category, which is still used for stats/grouping under the hood.
  const category = isFixedExpense ? FIXED_EXPENSE_DISPLAY_CATEGORY : realCategory
  const subcategory = realCategory.subcategories?.find((s) => s.id === transaction.subcategoryId)
  // The real category still shows in the subline so it's not hidden entirely
  // behind the "고정지출" label — just not used for the icon/primary label.
  const realCategoryLabel = isFixedExpense ? realCategory.label : undefined

  const primary = transaction.title || category.label
  const sublineParts = transaction.title
    ? [category.label, realCategoryLabel, subcategory?.label, transaction.memo]
    : [realCategoryLabel, subcategory?.label, transaction.memo]
  const subline = sublineParts.filter(Boolean).join(' · ')

  return (
    <button type="button" className="transaction-row" onClick={() => navigate(`/edit/${transaction.id}`)}>
      <span className="transaction-icon" style={{ background: `${category.color}22`, color: category.color }}>
        <CategoryIcon name={category.icon} size={18} />
      </span>
      <span className="transaction-info">
        <span className="transaction-title">{primary}</span>
        {subline && <span className="transaction-memo">{subline}</span>}
      </span>
      <span className={`transaction-amount ${transaction.type}`}>
        {formatSigned(transaction.amount, transaction.type)}
      </span>
    </button>
  )
}
