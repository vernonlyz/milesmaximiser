import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// The experimental Reward points view is gated to the admin account until it's
// ready to expose. Drop this check to make the Points tab public.
const ADMIN_EMAIL = 'vernonlyz@gmail.com'

// Tab bar shared by the Miles views (Balance / Earned / Points), so they read as one section.
export default function MilesTabs() {
  const { user } = useAuth()
  const showPoints = user?.email === ADMIN_EMAIL

  const cls = (isActive: boolean) =>
    `px-1 pb-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
      isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`
  return (
    <div className="flex gap-5 border-b border-gray-200">
      <NavLink to="/miles" end className={({ isActive }) => cls(isActive)}>Balance</NavLink>
      <NavLink to="/earnings" className={({ isActive }) => cls(isActive)}>Earned</NavLink>
      {showPoints && <NavLink to="/points" className={({ isActive }) => cls(isActive)}>Points</NavLink>}
    </div>
  )
}
