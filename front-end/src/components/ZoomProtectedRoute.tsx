import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ZoomProtectedRouteProps {
  children: React.ReactNode;
}

const ZoomProtectedRoute = ({ children }: ZoomProtectedRouteProps) => {
  const { currentUser, isZoomIntegrated, loading } = useAuth();

  // If still loading auth state, show nothing or a loading spinner
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>;
  }

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