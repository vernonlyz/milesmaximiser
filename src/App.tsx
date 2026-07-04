import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'

// Route pages are code-split so the initial bundle stays small (faster first load).
const Onboarding   = lazy(() => import('./pages/Onboarding'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Recommend    = lazy(() => import('./pages/Recommend'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Cards        = lazy(() => import('./pages/Cards'))
const Admin        = lazy(() => import('./pages/Admin'))
const Expenses     = lazy(() => import('./pages/Expenses'))
const MileValue    = lazy(() => import('./pages/MileValue'))
const Miles        = lazy(() => import('./pages/Miles'))
const Earnings     = lazy(() => import('./pages/Earnings'))
const Points       = lazy(() => import('./pages/Points'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-500">
      <Loader2 size={24} className="animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Onboarding />
                </Suspense>
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
            <Route path="points"       element={<Points />}       />
            <Route path="admin"        element={<Admin />}        />
          </Route>
        </Routes>
        </ErrorBoundary>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  )
}
