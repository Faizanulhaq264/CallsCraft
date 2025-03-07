import type { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary"
  fullWidth?: boolean
}

const Button = ({ children, variant = "primary", fullWidth = false, className = "", ...props }: ButtonProps) => {
  return (
    <button
      className={`
        btn 
        ${variant === "primary" ? "btn-primary" : "btn-secondary"}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button

