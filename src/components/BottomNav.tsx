import { ChartColumn, Settings2, WalletCards } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <WalletCards size={22} strokeWidth={2.2} />
        <span>홈</span>
      </NavLink>

      <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <ChartColumn size={22} strokeWidth={2.2} />
        <span>통계</span>
      </NavLink>

      <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <Settings2 size={22} strokeWidth={2.2} />
        <span>설정</span>
      </NavLink>
    </nav>
  )
}
