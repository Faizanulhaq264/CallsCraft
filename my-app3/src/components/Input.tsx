import type { InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = ({ label, error, className = "", ...props }: InputProps) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input className={`input ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`} {...props} />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default Input

