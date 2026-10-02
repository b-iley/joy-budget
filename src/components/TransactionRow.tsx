import { useNavigate } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import type { Transaction } from '../types'
import { formatSigned } from '../utils/format'
import { CategoryIcon } from './CategoryIcon'

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const navigate = useNavigate()
  const { getCategory } = useCategories()
  const category = getCategory(transaction.categoryId)
  const subcategory = category.subcategories?.find((s) => s.id === transaction.subcategoryId)

  const primary = transaction.title || category.label
  const sublineParts = transaction.title
    ? [category.label, subcategory?.label, transaction.memo]
    : [subcategory?.label, transaction.memo]
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
