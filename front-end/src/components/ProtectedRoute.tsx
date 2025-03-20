import type React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import LoadingSpinner from "./LoadingSpinner"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth()  // Changed from isAuthenticated to currentUser

  if (loading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {  // Changed from isAuthenticated to currentUser
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

