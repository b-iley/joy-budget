import type { Category, CustomSubcategory, FixedExpense, MerchantRule, Transaction } from './types'

const DB_NAME = 'joy-family-db'
// Bumped 5->6 as a forced-repair migration: a dev-reload race may have let
// the db register as "already at version 5" without the fixedExpenses store
// actually being created, and IndexedDB never re-runs onupgradeneeded for a
// version it already recorded — only a further bump forces it to retry, and
// the idempotent contains()-checks above safely fill in whatever's missing.
const DB_VERSION = 6
const TRANSACTIONS_STORE = 'transactions'
const CATEGORIES_STORE = 'categories'
const SUBCATEGORIES_STORE = 'subcategories'
const MERCHANT_RULES_STORE = 'merchantRules'
const FIXED_EXPENSES_STORE = 'fixedExpenses'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        const store = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' })
        store.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
        db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SUBCATEGORIES_STORE)) {
        db.createObjectStore(SUBCATEGORIES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(MERCHANT_RULES_STORE)) {
        db.createObjectStore(MERCHANT_RULES_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(FIXED_EXPENSES_STORE)) {
        db.createObjectStore(FIXED_EXPENSES_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      // If another tab/reload requests a higher DB version, this connection
      // must close itself — otherwise that upgrade blocks forever and every
      // db call in both tabs silently hangs (this bit us once already).
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const request = handler(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const all = await withStore<Transaction[]>(TRANSACTIONS_STORE, 'readonly', (store) => store.getAll())
  return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
}

export async function putTransaction(transaction: Transaction): Promise<void> {
  await withStore<IDBValidKey>(TRANSACTIONS_STORE, 'readwrite', (store) => store.put(transaction))
}

export async function deleteTransaction(id: string): Promise<void> {
  await withStore<undefined>(TRANSACTIONS_STORE, 'readwrite', (store) => store.delete(id))
}

export async function getAllCategories(): Promise<Category[]> {
  return withStore<Category[]>(CATEGORIES_STORE, 'readonly', (store) => store.getAll())
}

export async function putCategory(category: Category): Promise<void> {
  await withStore<IDBValidKey>(CATEGORIES_STORE, 'readwrite', (store) => store.put(category))
}

export async function deleteCategory(id: string): Promise<void> {
  await withStore<undefined>(CATEGORIES_STORE, 'readwrite', (store) => store.delete(id))
}

export async function getAllSubcategories(): Promise<CustomSubcategory[]> {
  return withStore<CustomSubcategory[]>(SUBCATEGORIES_STORE, 'readonly', (store) => store.getAll())
}

export async function putSubcategory(subcategory: CustomSubcategory): Promise<void> {
  await withStore<IDBValidKey>(SUBCATEGORIES_STORE, 'readwrite', (store) => store.put(subcategory))
}

export async function deleteSubcategory(id: string): Promise<void> {
  await withStore<undefined>(SUBCATEGORIES_STORE, 'readwrite', (store) => store.delete(id))
}

export async function getAllMerchantRules(): Promise<MerchantRule[]> {
  return withStore<MerchantRule[]>(MERCHANT_RULES_STORE, 'readonly', (store) => store.getAll())
}

export async function putMerchantRule(rule: MerchantRule): Promise<void> {
  await withStore<IDBValidKey>(MERCHANT_RULES_STORE, 'readwrite', (store) => store.put(rule))
}

export async function getAllFixedExpenses(): Promise<FixedExpense[]> {
  return withStore<FixedExpense[]>(FIXED_EXPENSES_STORE, 'readonly', (store) => store.getAll())
}

export async function putFixedExpense(fixedExpense: FixedExpense): Promise<void> {
  await withStore<IDBValidKey>(FIXED_EXPENSES_STORE, 'readwrite', (store) => store.put(fixedExpense))
}

export async function deleteFixedExpense(id: string): Promise<void> {
  await withStore<undefined>(FIXED_EXPENSES_STORE, 'readwrite', (store) => store.delete(id))
}
