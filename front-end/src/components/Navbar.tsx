"use client"

import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "./Button"

const Navbar = () => {
  const { currentUser, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-gray-800 shadow-lg navbar-glass">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">CallsCraft</span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300
              ${
                isActive("/")
                  ? "bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/50"
              }`}
          >
            Homepage
          </Link>

          {currentUser && (
            <>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300
                  ${
                    isActive("/dashboard")
                      ? "bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
              >
                Dashboard
              </Link>

              <Link
                to="/clients"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300
                  ${
                    isActive("/clients")
                      ? "bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
              >
                Clients
              </Link>

              <Link
                to="/create-call"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300
                  ${
                    isActive("/create-call")
                      ? "bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
              >
                Call
              </Link>

              <Button variant="secondary" onClick={logout} className="ml-2 py-2 px-4 text-sm">
                Logout
              </Button>
            </>
          )}

          {!currentUser && (
            <Link to="/login">
              <Button variant="primary" className="py-2 px-4 text-sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

