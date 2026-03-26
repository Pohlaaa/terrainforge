import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
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
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/materials" element={<MaterialLibrary />} />
                      <Route path="/manifest" element={<ManifestEngine />} />
                      <Route path="/work-orders" element={<WorkOrders />} />
                      <Route path="/price-research" element={<PriceResearch />} />
                      <Route path="/crew" element={<CrewManager />} />
                      <Route path="/equipment" element={<EquipmentManager />} />
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
