import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Recommend from './pages/Recommend'
import Transactions from './pages/Transactions'
import Cards from './pages/Cards'
import Admin from './pages/Admin'
import Expenses from './pages/Expenses'
import MileValue from './pages/MileValue'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index               element={<Dashboard />}    />
            <Route path="recommend"    element={<Recommend />}    />
            <Route path="transactions" element={<Transactions />} />
            <Route path="cards"        element={<Cards />}        />
            <Route path="expenses"     element={<Expenses />}     />
            <Route path="calculator"   element={<MileValue />}    />
            <Route path="admin"        element={<Admin />}        />
          </Route>
        </Routes>
      </AppProvider>
    </AuthProvider>
  )
}
