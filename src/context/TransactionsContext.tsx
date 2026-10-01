import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { deleteTransaction, getAllTransactions, putTransaction } from '../db'
import type { Transaction } from '../types'
import { newId } from '../utils/id'
import { useMerchantRules } from './MerchantRulesContext'

interface TransactionsContextValue {
  transactions: Transaction[]
  loading: boolean
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTransaction: (id: string, input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  importTransactions: (incoming: Transaction[]) => Promise<void>
  getById: (id: string) => Transaction | undefined
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { recordRule } = useMerchantRules()

  useEffect(() => {
    getAllTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [])

  const addTransaction = useCallback(
    async (input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const transaction: Transaction = { ...input, id: newId(), createdAt: now, updatedAt: now }
      await putTransaction(transaction)
      setTransactions((prev) => [transaction, ...prev])
      void recordRule(transaction.title, transaction.type, transaction.categoryId, transaction.subcategoryId)
    },
    [recordRule]
  )

  const updateTransaction = useCallback(
    async (id: string, input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      setTransactions((prev) => {
        const existing = prev.find((t) => t.id === id)
        // Merge onto the existing record (not a full replace) so fields the
        // edit form doesn't know about — like fixedExpenseId — survive a save
        // instead of silently disappearing.
        const updated: Transaction = {
          ...existing,
          ...input,
          id,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        }
        void putTransaction(updated)
        void recordRule(updated.title, updated.type, updated.categoryId, updated.subcategoryId)
        return prev.map((t) => (t.id === id ? updated : t))
      })
    },
    [recordRule]
  )

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const importTransactions = useCallback(async (incoming: Transaction[]) => {
    for (const t of incoming) {
      await putTransaction(t)
    }
    setTransactions((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]))
      for (const t of incoming) byId.set(t.id, t)
      return Array.from(byId.values()).sort((a, b) =>
        a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)
      )
    })
  }, [])

  const getById = useCallback((id: string) => transactions.find((t) => t.id === id), [transactions])

  const value = useMemo(
    () => ({ transactions, loading, addTransaction, updateTransaction, removeTransaction, importTransactions, getById }),
    [transactions, loading, addTransaction, updateTransaction, removeTransaction, importTransactions, getById]
  )

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider')
  return ctx
}
