import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { deleteFixedExpense, getAllFixedExpenses, putFixedExpense } from '../db'
import type { FixedExpense, Transaction } from '../types'
import { currentMonth, shiftMonth } from '../utils/format'
import { newId } from '../utils/id'
import { useTransactions } from './TransactionsContext'

type FixedExpenseInput = Omit<FixedExpense, 'id' | 'generatedMonths'>

interface FixedExpensesContextValue {
  fixedExpenses: FixedExpense[]
  loading: boolean
  addFixedExpense: (input: FixedExpenseInput) => Promise<void>
  updateFixedExpense: (id: string, input: FixedExpenseInput) => Promise<void>
  removeFixedExpense: (id: string) => Promise<void>
}

const FixedExpensesContext = createContext<FixedExpensesContextValue | null>(null)

function monthsFrom(start: string, end: string): string[] {
  const months: string[] = []
  let cursor = start
  while (cursor <= end) {
    months.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }
  return months
}

function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function FixedExpensesProvider({ children }: { children: ReactNode }) {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const { loading: transactionsLoading, importTransactions } = useTransactions()

  useEffect(() => {
    getAllFixedExpenses()
      .then(setFixedExpenses)
      .finally(() => setLoading(false))
  }, [])

  // The app has no background job — a fixed expense's transaction for a given
  // month is only ever created the next time the app happens to be opened on
  // or after that month, which also backfills any months missed in between.
  // Which months are "done" lives on the template (generatedMonths), not on
  // whether a matching transaction currently exists — otherwise deleting a
  // generated transaction would just make it reappear on the next app open.
  useEffect(() => {
    if (loading || transactionsLoading) return

    const now = Date.now()
    const thisMonth = currentMonth()
    const toCreate: Transaction[] = []
    const updatedTemplates: FixedExpense[] = []

    for (const fe of fixedExpenses) {
      const done = new Set(fe.generatedMonths)
      const cap = fe.endMonth && fe.endMonth < thisMonth ? fe.endMonth : thisMonth
      const pending = monthsFrom(fe.startMonth, cap).filter((m) => !done.has(m))
      if (pending.length === 0) continue

      for (const month of pending) {
        const day = Math.min(fe.day, lastDayOfMonth(month))
        toCreate.push({
          id: newId(),
          type: 'expense',
          amount: fe.amount,
          categoryId: 'fixed_expense',
          date: `${month}-${String(day).padStart(2, '0')}`,
          title: fe.title,
          memo: fe.memo,
          fixedExpenseId: fe.id,
          createdAt: now,
          updatedAt: now,
        })
      }
      updatedTemplates.push({ ...fe, generatedMonths: [...fe.generatedMonths, ...pending] })
    }

    if (toCreate.length === 0) return

    void (async () => {
      await importTransactions(toCreate)
      for (const fe of updatedTemplates) {
        await putFixedExpense(fe)
      }
      setFixedExpenses((prev) => prev.map((f) => updatedTemplates.find((u) => u.id === f.id) ?? f))
    })()
  }, [loading, transactionsLoading, fixedExpenses, importTransactions])

  const addFixedExpense = useCallback(async (input: FixedExpenseInput) => {
    const fe: FixedExpense = { ...input, id: newId(), generatedMonths: [] }
    await putFixedExpense(fe)
    setFixedExpenses((prev) => [...prev, fe])
  }, [])

  // Editing the template only changes which future, not-yet-generated months
  // use the new values — transactions already created from it are independent
  // rows the user can edit individually, and generatedMonths is preserved so
  // already-handled months are never regenerated.
  const updateFixedExpense = useCallback(
    async (id: string, input: FixedExpenseInput) => {
      const existing = fixedExpenses.find((f) => f.id === id)
      const updated: FixedExpense = { ...input, id, generatedMonths: existing?.generatedMonths ?? [] }
      await putFixedExpense(updated)
      setFixedExpenses((prev) => prev.map((f) => (f.id === id ? updated : f)))
    },
    [fixedExpenses]
  )

  const removeFixedExpense = useCallback(async (id: string) => {
    await deleteFixedExpense(id)
    setFixedExpenses((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const value = useMemo(
    () => ({ fixedExpenses, loading, addFixedExpense, updateFixedExpense, removeFixedExpense }),
    [fixedExpenses, loading, addFixedExpense, updateFixedExpense, removeFixedExpense]
  )

  return <FixedExpensesContext.Provider value={value}>{children}</FixedExpensesContext.Provider>
}

export function useFixedExpenses(): FixedExpensesContextValue {
  const ctx = useContext(FixedExpensesContext)
  if (!ctx) throw new Error('useFixedExpenses must be used within FixedExpensesProvider')
  return ctx
}
