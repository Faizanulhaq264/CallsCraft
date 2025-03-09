import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ZoomProtectedRouteProps {
  children: React.ReactNode;
}

const ZoomProtectedRoute = ({ children }: ZoomProtectedRouteProps) => {
  const { currentUser, isZoomIntegrated } = useAuth();

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // If logged in but Zoom not integrated, redirect to Zoom integration page
  if (!isZoomIntegrated) {
    return <Navigate to="/zoom-integration" replace />;
  }

  // If logged in and Zoom integrated, render the children
  return <>{children}</>;
};

export default ZoomProtectedRoute; 