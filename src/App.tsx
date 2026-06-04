import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Recommend from './pages/Recommend'
import Transactions from './pages/Transactions'
import Cards from './pages/Cards'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index        element={<Dashboard />}    />
        <Route path="recommend"    element={<Recommend />}    />
        <Route path="transactions" element={<Transactions />} />
        <Route path="cards"        element={<Cards />}        />
      </Route>
    </Routes>
  )
}
