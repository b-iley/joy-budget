import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { QuickActions } from '../components/QuickActions'
import { SummaryCard } from '../components/SummaryCard'
import { TransactionRow } from '../components/TransactionRow'
import { useTransactions } from '../context/TransactionsContext'
import { currentMonth, formatDayLabel, formatWon, monthKey } from '../utils/format'

export function Home() {
  const { transactions, loading } = useTransactions()
  const [month, setMonth] = useState(currentMonth())

  const monthTransactions = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  )

  const { income, expense } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of monthTransactions) {
      if (t.type === 'income') income += t.amount
      else expense += t.amount
    }
    return { income, expense }
  }, [monthTransactions])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof monthTransactions>()
    for (const t of monthTransactions) {
      const list = groups.get(t.date) ?? []
      list.push(t)
      groups.set(t.date, list)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthTransactions])

  return (
    <div className="page">
      <header className="greeting-header">
        <div>
          <p className="greeting-hello">안녕하세요,</p>
          <p className="greeting-name">Joy Family</p>
        </div>
        <span className="avatar-circle">
          <Users size={22} />
        </span>
      </header>

      <MonthSwitcher month={month} onChange={setMonth} />
      <SummaryCard income={income} expense={expense} />
      <QuickActions />

      <h2 className="section-title">최근 내역</h2>

      <div className="transaction-list">
        {loading && <p className="empty-state">불러오는 중...</p>}

        {!loading && groupedByDate.length === 0 && (
          <p className="empty-state">이 달의 가계부 내역이 없어요.{'\n'}위 버튼으로 추가해보세요.</p>
        )}

        {groupedByDate.map(([date, items]) => {
          const dayTotal = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
          return (
            <section key={date} className="day-group">
              <div className="day-group-header">
                <span>{formatDayLabel(date)}</span>
                <span className={dayTotal >= 0 ? 'income' : 'expense'}>{formatWon(dayTotal)}</span>
              </div>
              {items.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </section>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
