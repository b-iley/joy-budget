export type TransactionType = 'income' | 'expense'

export interface Subcategory {
  id: string
  label: string
  hidden?: boolean // custom subcategory with existing transactions — kept for history, no longer pickable for new ones
}

// A user-added subcategory attached to any category (built-in or custom).
// Stored separately from Category so built-in categories never need a DB
// record of their own just to carry an extra subcategory.
export interface CustomSubcategory extends Subcategory {
  categoryId: string
}

// Learned "this merchant/counterparty always gets this category" mapping —
// recorded automatically every time a transaction is saved with a non-empty
// title, then used to suggest a category for future transactions with the
// same title instead of falling back to a generic default.
export interface MerchantRule {
  key: string // `${type}:${normalized title}` — keyed by type too so e.g. an
  // expense "쿠팡" rule and a same-named income rule never overwrite each other
  type: TransactionType
  categoryId: string
  subcategoryId?: string
}

export interface Category {
  id: string
  label: string
  icon: string
  color: string
  type?: TransactionType // set only on user-created custom categories; built-ins are already split by list
  hidden?: boolean // custom category with existing transactions — kept for history, no longer selectable for new ones
  subcategories?: Subcategory[]
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  subcategoryId?: string
  date: string // YYYY-MM-DD
  title: string // what it was for, e.g. "휴지", "이마트" — shown as the row's headline
  memo: string // free-form notes, separate from title
  createdAt: number
  updatedAt: number
  fixedExpenseId?: string // set when this transaction was auto-generated from a FixedExpense template
}

// A recurring expense template (rent, subscriptions, etc.) — the app has no
// background job, so a month's transaction is actually created the next time
// the app is opened on or after that month, not on a schedule. Every
// transaction a template generates always uses the 'fixed_expense' category —
// there's no per-template category choice, since a manually-entered
// transaction categorized as 고정지출 and a template-generated one are meant
// to be the exact same category, just created differently (one-off vs
// auto-recurring).
export interface FixedExpense {
  id: string
  title: string
  amount: number
  day: number // 1–31, billing day of month; clamped to the month's last day if shorter
  startMonth: string // YYYY-MM — first month this applies from
  endMonth?: string // YYYY-MM, inclusive — last month this applies to; undefined means no end
  memo: string
  // Months (YYYY-MM) already turned into a real transaction. This — not
  // whether that transaction still exists — is what guards against
  // regenerating it, so deleting a generated transaction deletes it for good
  // instead of it reappearing the next time the app happens to be opened.
  generatedMonths: string[]
}

export const EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'food',
    label: '식비',
    icon: 'UtensilsCrossed',
    color: '#FF8A65',
    subcategories: [
      { id: 'delivery', label: '배달음식' },
      { id: 'homemade', label: '집밥' },
      { id: 'dining-out', label: '외식' },
      { id: 'convenience-store', label: '편의점' },
      { id: 'mart', label: '마트' },
      { id: 'etc', label: '기타' },
    ],
  },
  { id: 'cafe', label: '카페/간식', icon: 'Coffee', color: '#C68958' },
  { id: 'transport', label: '교통', icon: 'Bus', color: '#4FC3F7' },
  { id: 'shopping', label: '쇼핑', icon: 'ShoppingBag', color: '#BA68C8' },
  { id: 'daily', label: '생필품', icon: 'ShoppingBasket', color: '#26C6DA' },
  { id: 'living', label: '생활', icon: 'Home', color: '#66BB6A' },
  { id: 'medical', label: '의료/건강', icon: 'HeartPulse', color: '#EF5350' },
  { id: 'education', label: '교육', icon: 'BookOpen', color: '#5C9CE6' },
  { id: 'culture', label: '문화/여가', icon: 'Film', color: '#9575CD' },
  { id: 'kids', label: '육아', icon: 'Baby', color: '#EC6FA3' },
  { id: 'allowance', label: '용돈', icon: 'HandCoins', color: '#F9A825' },
  { id: 'event', label: '이벤트', icon: 'PartyPopper', color: '#D81B60' },
  { id: 'utilities', label: '공과금', icon: 'Zap', color: '#00897B' },
  { id: 'fixed_expense', label: '고정지출', icon: 'CalendarClock', color: '#3949AB' },
  { id: 'etc_expense', label: '기타', icon: 'MoreHorizontal', color: '#90A4AE' },
]

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: '급여', icon: 'Wallet', color: '#26A69A' },
  { id: 'sidejob', label: '부수입', icon: 'PiggyBank', color: '#7986CB' },
  { id: 'gift', label: '용돈/선물', icon: 'Gift', color: '#EC6FA3' },
  { id: 'etc_income', label: '기타', icon: 'MoreHorizontal', color: '#90A4AE' },
]

export const ALL_CATEGORIES: Category[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function getCategory(id: string, custom: Category[] = []): Category {
  return (
    ALL_CATEGORIES.find((c) => c.id === id) ??
    custom.find((c) => c.id === id) ??
    ALL_CATEGORIES[ALL_CATEGORIES.length - 1]
  )
}

export function categoriesFor(type: TransactionType, custom: Category[] = []): Category[] {
  const defaults = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  return [...defaults, ...custom.filter((c) => c.type === type)]
}
