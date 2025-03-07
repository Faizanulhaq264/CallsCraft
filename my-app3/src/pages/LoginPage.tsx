"use client"

import type React from "react"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Button from "../components/Button"
import Input from "../components/Input"
import Card from "../components/Card"
import PageTransition from "../components/PageTransition"

const LoginPage = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!email) newErrors.email = "Email is required"
    if (!password) newErrors.password = "Password is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      await login(email, password)
      navigate("/zoom-integration")
    } catch (error) {
      console.error("Login error:", error)
      setErrors({ form: "Invalid email or password" })
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Log in to your account</p>
          </div>

          {errors.form && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">{errors.form}</div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            <div className="flex justify-end mb-6">
              <Link to="#" className="text-sm text-purple-500 hover:text-purple-400">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Logging In..." : "Log In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-purple-500 hover:text-purple-400">
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}

export default LoginPage

