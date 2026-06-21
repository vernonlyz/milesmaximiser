import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
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
import Miles from './pages/Miles'
import Earnings from './pages/Earnings'

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
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
            <Route path="miles"        element={<Miles />}        />
            <Route path="earnings"     element={<Earnings />}     />
            <Route path="admin"        element={<Admin />}        />
          </Route>
        </Routes>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  )
}
