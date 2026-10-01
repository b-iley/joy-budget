export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export function formatSigned(amount: number, type: 'income' | 'expense'): string {
  const sign = type === 'income' ? '+' : '-'
  return `${sign}${formatWon(amount)}`
}

export function todayISO(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7) // YYYY-MM
}

export function formatMonthTitle(monthISO: string): string {
  const [y, m] = monthISO.split('-').map(Number)
  return `${y}년 ${m}월`
}

export function formatDayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getDate()}일 (${days[d.getDay()]})`
}

export function shiftMonth(monthISO: string, delta: number): string {
  const [y, m] = monthISO.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonth(): string {
  return todayISO().slice(0, 7)
}
