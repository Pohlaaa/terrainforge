import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'
import CrewLayout from '@/components/layout/CrewLayout'

const CrewDashboard = React.lazy(() => import('@/pages/crew/CrewDashboard'))
const CrewJobDetail = React.lazy(() => import('@/pages/crew/CrewJobDetail'))
import Dashboard from '@/pages/Dashboard'
import Projects from '@/pages/Projects'
const ProjectWizard = React.lazy(() => import('@/pages/ProjectWizard'))
import MaterialLibrary from '@/pages/MaterialLibrary'
import ManifestEngine from '@/pages/ManifestEngine'
import WorkOrders from '@/pages/WorkOrders'
import PriceResearch from '@/pages/PriceResearch'
import Schedule from '@/pages/Schedule'
import CrewManager from '@/pages/CrewManager'
import EquipmentManager from '@/pages/EquipmentManager'
import Billing from '@/pages/Billing'
import Settings from '@/pages/Settings'
const Debug = import.meta.env.DEV
  ? React.lazy(() => import('@/pages/Debug'))
  : () => null;
import Onboarding from '@/pages/Onboarding'
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

          {/* Onboarding — requires auth but no sidebar */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Crew app routes — separate layout, no sidebar */}
          <Route path="/crew/*" element={
            <ProtectedRoute>
              <CrewLayout>
                <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-2)' }}>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<CrewDashboard />} />
                    <Route path="/job/:entryId" element={<CrewJobDetail />} />
                  </Routes>
                </React.Suspense>
              </CrewLayout>
            </ProtectedRoute>
          } />

          {/* Protected routes — wrapped in AppLayout (sidebar + trial banner) */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="/projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
                    <Route path="/projects/wizard" element={
                      <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-2)' }}>Loading wizard...</div>}>
                          <ProjectWizard />
                        </React.Suspense>
                      </ErrorBoundary>
                    } />
                    <Route path="/materials" element={<ErrorBoundary><MaterialLibrary /></ErrorBoundary>} />
                    <Route path="/manifest" element={<ErrorBoundary><ManifestEngine /></ErrorBoundary>} />
                    <Route path="/work-orders" element={<ErrorBoundary><WorkOrders /></ErrorBoundary>} />
                    <Route path="/price-research" element={<ErrorBoundary><PriceResearch /></ErrorBoundary>} />
                    <Route path="/schedule" element={<ErrorBoundary><Schedule /></ErrorBoundary>} />
                    <Route path="/crew-manager" element={<ErrorBoundary><CrewManager /></ErrorBoundary>} />
                    <Route path="/equipment" element={<ErrorBoundary><EquipmentManager /></ErrorBoundary>} />
                    <Route path="/billing" element={<ErrorBoundary><Billing /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                    {import.meta.env.DEV && (
                      <Route path="/debug" element={
                        <React.Suspense fallback={<div>Loading...</div>}>
                          <Debug />
                        </React.Suspense>
                      } />
                    )}
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
