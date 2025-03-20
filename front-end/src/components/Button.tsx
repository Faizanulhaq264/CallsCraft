import type { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary"
  fullWidth?: boolean
}

const Button = ({ children, variant = "primary", fullWidth = false, className = "", ...props }: ButtonProps) => {
  return (
    <button
      className={`
        relative overflow-hidden group
        px-6 py-3 rounded-md font-medium
        transition-all duration-300 transform hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-opacity-50
        ${
          variant === "primary"
            ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 focus:ring-purple-500"
            : "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-700 hover:to-cyan-600 focus:ring-cyan-500"
        }
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left bg-gradient-to-r from-purple-700 to-purple-600 opacity-0 group-hover:opacity-100 duration-500"></span>
    </button>
  )
}

export default Button

