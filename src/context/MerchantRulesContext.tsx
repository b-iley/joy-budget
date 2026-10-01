import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getAllMerchantRules, putMerchantRule } from '../db'
import type { MerchantRule, TransactionType } from '../types'

interface Suggestion {
  categoryId: string
  subcategoryId?: string
}

interface MerchantRulesContextValue {
  getSuggestion: (title: string, type: TransactionType) => Suggestion | null
  recordRule: (title: string, type: TransactionType, categoryId: string, subcategoryId?: string) => Promise<void>
}

const MerchantRulesContext = createContext<MerchantRulesContextValue | null>(null)

function ruleKey(title: string, type: TransactionType): string | null {
  const normalized = title.trim().toLowerCase()
  return normalized ? `${type}:${normalized}` : null
}

export function MerchantRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<Record<string, MerchantRule>>({})

  useEffect(() => {
    getAllMerchantRules().then((list) => {
      const map: Record<string, MerchantRule> = {}
      for (const rule of list) map[rule.key] = rule
      setRules(map)
    })
  }, [])

  const getSuggestion = useCallback(
    (title: string, type: TransactionType): Suggestion | null => {
      const key = ruleKey(title, type)
      if (!key) return null
      const rule = rules[key]
      return rule ? { categoryId: rule.categoryId, subcategoryId: rule.subcategoryId } : null
    },
    [rules]
  )

  const recordRule = useCallback(
    async (title: string, type: TransactionType, categoryId: string, subcategoryId?: string) => {
      const key = ruleKey(title, type)
      if (!key) return
      const rule: MerchantRule = { key, type, categoryId, subcategoryId }
      await putMerchantRule(rule)
      setRules((prev) => ({ ...prev, [key]: rule }))
    },
    []
  )

  const value = useMemo(() => ({ getSuggestion, recordRule }), [getSuggestion, recordRule])

  return <MerchantRulesContext.Provider value={value}>{children}</MerchantRulesContext.Provider>
}

export function useMerchantRules(): MerchantRulesContextValue {
  const ctx = useContext(MerchantRulesContext)
  if (!ctx) throw new Error('useMerchantRules must be used within MerchantRulesProvider')
  return ctx
}
