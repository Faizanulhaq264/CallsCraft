"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiService } from "../services/api";

interface User {
  id: string
  email: string
  name?: string
  zoomIntegrated?: boolean
}

interface AuthContextType {
  currentUser: any | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isZoomIntegrated: boolean;
  setZoomIntegrated: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start with loading true
  
  // Check if the user has integrated with Zoom
  const isZoomIntegrated = currentUser?.zoomIntegrated || false;
  
  // Method to update Zoom integration status
  const setZoomIntegrated = (status: boolean) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, zoomIntegrated: status };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // console.log("Updated Zoom integration status:", status);
      // console.log("Updated user in localStorage:", updatedUser);
    } else {
      console.warn("Cannot update Zoom status: No current user");
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    console.log("AuthProvider mounted, checking localStorage");
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // console.log("Found user in localStorage:", parsedUser);
        setCurrentUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Check for Zoom integration parameters on page load
  useEffect(() => {
    // console.log("Checking URL for Zoom integration parameters");
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    
    if (connected === 'true' && currentUser) {
      // console.log("Zoom connected parameter detected, updating user");
      setZoomIntegrated(true);
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser]); // Run when currentUser changes

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await apiService.login(email, password);
      // console.log("Login successful:", userData);
      setCurrentUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userData = await apiService.signup(email, password, name);
      // console.log("Signup successful:", userData);
      setCurrentUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // console.log("Logging out");
    setCurrentUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      login, 
      signup, 
      logout, 
      loading, 
      isZoomIntegrated, 
      setZoomIntegrated 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

