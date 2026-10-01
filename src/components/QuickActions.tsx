import { CalendarClock, ChartColumn, MessageSquareText, TrendingDown, TrendingUp, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TransactionType } from '../types'

export function QuickActions() {
  const navigate = useNavigate()

  function openAdd(type: TransactionType) {
    navigate('/add', { state: { type } })
  }

  return (
    <div className="quick-actions">
      <button type="button" className="quick-action" onClick={() => openAdd('expense')}>
        <span className="quick-action-icon">
          <TrendingDown size={22} />
        </span>
        <span>지출 추가</span>
      </button>

      <button type="button" className="quick-action" onClick={() => openAdd('income')}>
        <span className="quick-action-icon">
          <TrendingUp size={22} />
        </span>
        <span>수입 추가</span>
      </button>

      <button type="button" className="quick-action" onClick={() => navigate('/stats')}>
        <span className="quick-action-icon">
          <ChartColumn size={22} />
        </span>
        <span>통계</span>
      </button>

      <button type="button" className="quick-action" onClick={() => navigate('/message')}>
        <span className="quick-action-icon">
          <MessageSquareText size={22} />
        </span>
        <span>문자로 추가</span>
      </button>

      <button type="button" className="quick-action" onClick={() => navigate('/upload')}>
        <span className="quick-action-icon">
          <Upload size={22} />
        </span>
        <span>파일 업로드</span>
      </button>

      <button type="button" className="quick-action" onClick={() => navigate('/fixed-expenses')}>
        <span className="quick-action-icon">
          <CalendarClock size={22} />
        </span>
        <span>고정지출</span>
      </button>
    </div>
  )
}
