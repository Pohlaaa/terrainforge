import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Projects from '@/pages/Projects'
import MaterialLibrary from '@/pages/MaterialLibrary'
import ManifestEngine from '@/pages/ManifestEngine'
import WorkOrders from '@/pages/WorkOrders'
import PriceResearch from '@/pages/PriceResearch'
import CrewManager from '@/pages/CrewManager'
import EquipmentManager from '@/pages/EquipmentManager'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - no sidebar */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes - with sidebar */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex h-screen bg-[var(--surface)]">
                  <Sidebar />
                  <main className="flex-1 overflow-auto p-6">
                    <Routes>
                      <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                      <Route path="/projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
                      <Route path="/materials" element={<ErrorBoundary><MaterialLibrary /></ErrorBoundary>} />
                      <Route path="/manifest" element={<ErrorBoundary><ManifestEngine /></ErrorBoundary>} />
                      <Route path="/work-orders" element={<ErrorBoundary><WorkOrders /></ErrorBoundary>} />
                      <Route path="/price-research" element={<ErrorBoundary><PriceResearch /></ErrorBoundary>} />
                      <Route path="/crew" element={<ErrorBoundary><CrewManager /></ErrorBoundary>} />
                      <Route path="/equipment" element={<ErrorBoundary><EquipmentManager /></ErrorBoundary>} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
