import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense, lazy } from "react"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import LoadingSpinner from "./components/LoadingSpinner"

// Lazy load pages for better performance
const SignupPage = lazy(() => import("./pages/SignupPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const HomePage = lazy(() => import("./pages/HomePage"))
const ZoomIntegrationPage = lazy(() => import("./pages/ZoomIntegrationPage"))
const DashboardPage = lazy(() => import("./pages/DashboardPage"))
const CreateCallPage = lazy(() => import("./pages/CreateCallPage"))

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/zoom-integration"
            element={
              <ProtectedRoute>
                <ZoomIntegrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-call"
            element={
              <ProtectedRoute>
                <CreateCallPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App

