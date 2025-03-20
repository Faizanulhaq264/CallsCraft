import type { InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = ({ label, error, className = "", ...props }: InputProps) => {
  return (
    <div className="form-group">
      {label && <label className="form-label text-gray-300">{label}</label>}
      <input
        className={`
          bg-muted border border-gray-800 rounded-md px-4 py-3
          text-white w-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
          hover:border-gray-700
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
}

export default Input

