import { NavLink } from 'react-router-dom'

// Tab bar shared by the two Miles views (Balance / Earned), so they read as one section.
export default function MilesTabs() {
  const cls = (isActive: boolean) =>
    `px-1 pb-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
      isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`
  return (
    <div className="flex gap-5 border-b border-gray-200">
      <NavLink to="/miles" end className={({ isActive }) => cls(isActive)}>Balance</NavLink>
      <NavLink to="/earnings" className={({ isActive }) => cls(isActive)}>Earned</NavLink>
    </div>
  )
}
