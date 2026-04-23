import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'
import CrewLayout from '@/components/layout/CrewLayout'

const CrewDashboard = React.lazy(() => import('@/pages/crew/CrewDashboard'))
const CrewJobDetail = React.lazy(() => import('@/pages/crew/CrewJobDetail'))
import Dashboard from '@/pages/Dashboard'
const ProjectWizard = React.lazy(() => import('@/pages/ProjectWizard'))
const ProjectDashboard = React.lazy(() => import('@/pages/ProjectDashboard'))
import MaterialLibrary from '@/pages/MaterialLibrary'
import WorkOrders from '@/pages/WorkOrders'
import PriceResearch from '@/pages/PriceResearch'
import Billing from '@/pages/Billing'
import Settings from '@/pages/Settings'
const Debug = import.meta.env.DEV
  ? React.lazy(() => import('@/pages/Debug'))
  : () => null;
const DesignSandbox = import.meta.env.DEV
  ? React.lazy(() => import('@/pages/DesignSandbox'))
  : () => null;
import Onboarding from '@/pages/Onboarding'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import AuthCallback from '@/pages/AuthCallback'
import ResetPassword from '@/pages/ResetPassword'
const Landing = React.lazy(() => import('@/pages/Landing'))
const SharedProjectView = React.lazy(() => import('@/pages/SharedProjectView'))

// Lazy-load new hub pages
const BudgetHub = React.lazy(() => import('@/pages/BudgetHub'))
const CrewEquipmentHub = React.lazy(() => import('@/pages/CrewEquipmentHub'))

/** Show landing page for visitors, redirect authenticated users to /dashboard */
function HomeRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#0A0A0A' }}>
        <div className="inline-block animate-spin">⌛</div>
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <React.Suspense fallback={<div style={{ background: '#0A0A0A', minHeight: '100vh' }} />}>
      <Landing />
    </React.Suspense>
  )
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Page not found</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '10px 20px',
          background: 'var(--brand-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/" element={<HomeRoute />} />
          <Route path="/landing" element={
            <React.Suspense fallback={<div style={{ background: '#0A0A0A', minHeight: '100vh' }} />}>
              <Landing />
            </React.Suspense>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public client-facing share link (migration 028) — no auth, no layout */}
          <Route path="/share/:token" element={
            <React.Suspense fallback={<div style={{ background: '#0A0A0A', minHeight: '100vh' }} />}>
              <SharedProjectView />
            </React.Suspense>
          } />

          {/* DEV-only 3D sandbox (Sprint 3b) — r3f/drei proof-of-life.
              import.meta.env.DEV gate means this route just 404s in prod. */}
          {import.meta.env.DEV && (
            <Route path="/design/sandbox" element={
              <React.Suspense fallback={<div style={{ background: '#0A0A0A', minHeight: '100vh' }} />}>
                <DesignSandbox />
              </React.Suspense>
            } />
          )}

          {/* Onboarding — requires auth but no layout */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Crew app routes — separate layout */}
          <Route path="/crew/*" element={
            <ProtectedRoute>
              <CrewLayout>
                <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<CrewDashboard />} />
                    <Route path="/job/:entryId" element={<CrewJobDetail />} />
                  </Routes>
                </React.Suspense>
              </CrewLayout>
            </ProtectedRoute>
          } />

          {/* Protected routes — wrapped in AppLayout (TopNav + content) */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    {/* Hub tabs */}
                    <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="/budget" element={
                      <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading...</div>}>
                          <BudgetHub />
                        </React.Suspense>
                      </ErrorBoundary>
                    } />
                    <Route path="/materials" element={<ErrorBoundary><MaterialLibrary /></ErrorBoundary>} />
                    <Route path="/crew-hub" element={
                      <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading...</div>}>
                          <CrewEquipmentHub />
                        </React.Suspense>
                      </ErrorBoundary>
                    } />

                    {/* Project detail routes */}
                    <Route path="/projects/wizard" element={
                      <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading wizard...</div>}>
                          <ProjectWizard />
                        </React.Suspense>
                      </ErrorBoundary>
                    } />
                    <Route path="/projects/:id" element={
                      <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading project...</div>}>
                          <ProjectDashboard />
                        </React.Suspense>
                      </ErrorBoundary>
                    } />

                    {/* Secondary pages (More dropdown) */}
                    {/* Redirect old manifest URL to projects */}
                    <Route path="/manifest" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/work-orders" element={<ErrorBoundary><WorkOrders /></ErrorBoundary>} />
                    <Route path="/price-research" element={<ErrorBoundary><PriceResearch /></ErrorBoundary>} />
                    <Route path="/billing" element={<ErrorBoundary><Billing /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />

                    {import.meta.env.DEV && (
                      <Route path="/debug" element={
                        <React.Suspense fallback={<div>Loading...</div>}>
                          <Debug />
                        </React.Suspense>
                      } />
                    )}

                    {/* 404 catch-all */}
                    <Route path="*" element={<NotFound />} />
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
