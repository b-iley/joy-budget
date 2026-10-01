import {
  Baby,
  BookOpen,
  Bus,
  CalendarClock,
  Coffee,
  Film,
  Gift,
  HandCoins,
  HeartPulse,
  Home,
  MoreHorizontal,
  PartyPopper,
  PiggyBank,
  ShoppingBag,
  ShoppingBasket,
  UtensilsCrossed,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { DynamicIcon, iconNames } from 'lucide-react/dynamic'
import type { IconName } from 'lucide-react/dynamic'

const ICONS: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Coffee,
  Bus,
  ShoppingBag,
  ShoppingBasket,
  Home,
  HeartPulse,
  BookOpen,
  Film,
  Baby,
  MoreHorizontal,
  Wallet,
  PiggyBank,
  Gift,
  HandCoins,
  PartyPopper,
  CalendarClock,
  Zap,
}

const iconNameSet = new Set<string>(iconNames)

// lucide.dev shows names like "PartyPopper"; the dynamic-import map keys them
// as kebab-case ("party-popper"), so any user-typed name is normalized to that.
export function toKebabCase(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function isValidIconName(name: string): boolean {
  return iconNameSet.has(toKebabCase(name))
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const StaticIcon = ICONS[name]
  if (StaticIcon) return <StaticIcon {...props} />

  const kebabName = toKebabCase(name) as IconName
  return <DynamicIcon name={kebabName} fallback={() => <MoreHorizontal {...props} />} {...props} />
}
