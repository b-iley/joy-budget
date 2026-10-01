import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMerchantRules } from '../context/MerchantRulesContext'
import { parseMessage } from '../utils/messageParsers/registry'

export function MessageAdd() {
  const navigate = useNavigate()
  const { getSuggestion } = useMerchantRules()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    setError(null)
  }

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed) return

    const parsed = parseMessage(trimmed)
    if (!parsed || parsed.amount == null) {
      setError('인식할 수 없는 문자 형식이에요. 아직 지원하지 않는 은행/카드일 수 있어요.')
      return
    }

    const suggestion = getSuggestion(parsed.title, parsed.type)
    navigate('/add', {
      state: {
        type: parsed.type,
        categoryId: suggestion?.categoryId ?? (parsed.type === 'income' ? 'etc_income' : 'etc_expense'),
        subcategoryId: suggestion?.subcategoryId,
        amount: parsed.amount,
        date: parsed.date ?? undefined,
        title: parsed.title,
      },
    })
  }

  return (
    <div className="page">
      <header className="form-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1>문자로 추가</h1>
      </header>

      <p className="section-hint">
        은행/카드사에서 온 결제·입출금 알림 문자를 그대로 복사해서 붙여넣으면 금액과 날짜를 자동으로 읽어와요.
      </p>

      <label className="field">
        <span className="field-label">문자 내용</span>
        <textarea
          className="message-textarea"
          placeholder="여기에 문자를 붙여넣으세요"
          value={text}
          onChange={handleTextChange}
        />
      </label>

      {error && <p className="receipt-error">{error}</p>}

      <button type="button" className="save-button" disabled={!text.trim()} onClick={handleSubmit}>
        분석해서 추가하기
      </button>
    </div>
  )
}
