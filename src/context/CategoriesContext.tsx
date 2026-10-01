import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  deleteCategory as dbDeleteCategory,
  deleteSubcategory as dbDeleteSubcategory,
  getAllCategories,
  getAllSubcategories,
  putCategory,
  putSubcategory,
} from '../db'
import { categoriesFor as categoriesForBase, getCategory as getCategoryBase } from '../types'
import type { Category, CustomSubcategory, TransactionType } from '../types'
import { newId } from '../utils/id'

interface CategoriesContextValue {
  expenseCategories: Category[]
  incomeCategories: Category[]
  customCategories: Category[]
  customSubcategories: CustomSubcategory[]
  categoriesFor: (type: TransactionType) => Category[]
  getCategory: (id: string) => Category
  addCategory: (input: { type: TransactionType; label: string; icon: string; color: string }) => Promise<Category>
  importCategories: (incoming: Category[]) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  hideCategory: (id: string) => Promise<void>
  unhideCategory: (id: string) => Promise<void>
  addSubcategory: (categoryId: string, label: string) => Promise<CustomSubcategory>
  deleteSubcategory: (id: string) => Promise<void>
  hideSubcategory: (id: string) => Promise<void>
  unhideSubcategory: (id: string) => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

function withExtraSubcategories(category: Category, customSubcategories: CustomSubcategory[]): Category {
  const extra = customSubcategories
    .filter((s) => s.categoryId === category.id)
    .map((s) => ({ id: s.id, label: s.label, hidden: s.hidden }))
  if (extra.length === 0) return category
  return { ...category, subcategories: [...(category.subcategories ?? []), ...extra] }
}

// Used only for the "pick a subcategory" lists (new/edit transaction, bulk
// review) — getCategory() below deliberately skips this so a transaction
// that already used a since-hidden subcategory still displays it correctly.
function withVisibleSubcategoriesOnly(category: Category): Category {
  if (!category.subcategories) return category
  return { ...category, subcategories: category.subcategories.filter((s) => !s.hidden) }
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [customSubcategories, setCustomSubcategories] = useState<CustomSubcategory[]>([])

  useEffect(() => {
    getAllCategories().then(setCustomCategories)
    getAllSubcategories().then(setCustomSubcategories)
  }, [])

  // New-transaction pickers should never offer a hidden category; getCategory
  // (below) still searches the unfiltered list so old transactions render fine.
  const expenseCategories = useMemo(
    () =>
      categoriesForBase('expense', customCategories)
        .filter((c) => !c.hidden)
        .map((c) => withExtraSubcategories(c, customSubcategories))
        .map(withVisibleSubcategoriesOnly),
    [customCategories, customSubcategories]
  )
  const incomeCategories = useMemo(
    () =>
      categoriesForBase('income', customCategories)
        .filter((c) => !c.hidden)
        .map((c) => withExtraSubcategories(c, customSubcategories))
        .map(withVisibleSubcategoriesOnly),
    [customCategories, customSubcategories]
  )

  const categoriesFor = useCallback(
    (type: TransactionType) => (type === 'expense' ? expenseCategories : incomeCategories),
    [expenseCategories, incomeCategories]
  )

  const getCategory = useCallback(
    (id: string) => withExtraSubcategories(getCategoryBase(id, customCategories), customSubcategories),
    [customCategories, customSubcategories]
  )

  const addCategory = useCallback(
    async (input: { type: TransactionType; label: string; icon: string; color: string }) => {
      const category: Category = { id: newId(), ...input }
      await putCategory(category)
      setCustomCategories((prev) => [...prev, category])
      return category
    },
    []
  )

  const importCategories = useCallback(async (incoming: Category[]) => {
    for (const c of incoming) await putCategory(c)
    setCustomCategories((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]))
      for (const c of incoming) byId.set(c.id, c)
      return Array.from(byId.values())
    })
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await dbDeleteCategory(id)
    setCustomCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const setHidden = useCallback(async (id: string, hidden: boolean) => {
    setCustomCategories((prev) => {
      const target = prev.find((c) => c.id === id)
      if (!target) return prev
      const updated = { ...target, hidden }
      void putCategory(updated)
      return prev.map((c) => (c.id === id ? updated : c))
    })
  }, [])

  const hideCategory = useCallback((id: string) => setHidden(id, true), [setHidden])
  const unhideCategory = useCallback((id: string) => setHidden(id, false), [setHidden])

  const addSubcategory = useCallback(async (categoryId: string, label: string) => {
    const subcategory: CustomSubcategory = { id: newId(), categoryId, label }
    await putSubcategory(subcategory)
    setCustomSubcategories((prev) => [...prev, subcategory])
    return subcategory
  }, [])

  const deleteSubcategory = useCallback(async (id: string) => {
    await dbDeleteSubcategory(id)
    setCustomSubcategories((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const setSubcategoryHidden = useCallback(async (id: string, hidden: boolean) => {
    setCustomSubcategories((prev) => {
      const target = prev.find((s) => s.id === id)
      if (!target) return prev
      const updated = { ...target, hidden }
      void putSubcategory(updated)
      return prev.map((s) => (s.id === id ? updated : s))
    })
  }, [])

  const hideSubcategory = useCallback((id: string) => setSubcategoryHidden(id, true), [setSubcategoryHidden])
  const unhideSubcategory = useCallback((id: string) => setSubcategoryHidden(id, false), [setSubcategoryHidden])

  const value = useMemo(
    () => ({
      expenseCategories,
      incomeCategories,
      customCategories,
      customSubcategories,
      categoriesFor,
      getCategory,
      addCategory,
      importCategories,
      deleteCategory,
      hideCategory,
      unhideCategory,
      addSubcategory,
      deleteSubcategory,
      hideSubcategory,
      unhideSubcategory,
    }),
    [
      expenseCategories,
      incomeCategories,
      customCategories,
      customSubcategories,
      categoriesFor,
      getCategory,
      addCategory,
      importCategories,
      deleteCategory,
      hideCategory,
      unhideCategory,
      addSubcategory,
      deleteSubcategory,
      hideSubcategory,
      unhideSubcategory,
    ]
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
  return ctx
}
