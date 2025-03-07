import type React from "react"
import type { HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card

