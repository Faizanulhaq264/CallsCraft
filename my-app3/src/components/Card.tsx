import type React from "react"
import type { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`
        bg-card rounded-xl p-6 transition-all duration-300
        border border-gray-800 backdrop-blur-sm
        hover:shadow-lg hover:border-gray-700
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card

