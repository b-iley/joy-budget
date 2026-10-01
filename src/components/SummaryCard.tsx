import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatWon } from '../utils/format'

export function SummaryCard({ income, expense }: { income: number; expense: number }) {
  const navigate = useNavigate()
  const balance = income - expense

  return (
    <div className="hero-card">
      <div className="hero-head">
        <div>
          <span className="hero-head-label">이번 달 합계</span>
          <span className="hero-balance">{formatWon(balance)}</span>
        </div>
        <button type="button" onClick={() => navigate('/stats')} aria-label="통계 보기">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="hero-divider" />

      <div className="hero-footer">
        <div className="hero-footer-item">
          <TrendingUp size={18} />
          <span>수입 {formatWon(income)}</span>
        </div>
        <div className="hero-footer-item">
          <TrendingDown size={18} />
          <span>지출 {formatWon(expense)}</span>
        </div>
      </div>
    </div>
  )
}
