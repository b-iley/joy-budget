import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthTitle, shiftMonth } from '../utils/format'

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <div className="month-switcher">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="이전 달">
        <ChevronLeft size={20} />
      </button>
      <span className="month-title">{formatMonthTitle(month)}</span>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="다음 달">
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
