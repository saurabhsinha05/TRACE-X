import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: ReactNode
}

const variants: Record<string, string> = {
  primary: 'bg-signal-cyan text-base-950 hover:bg-signal-cyan/90 font-semibold',
  secondary: 'bg-base-600/60 text-ink border border-line hover:bg-base-500/60',
  ghost: 'text-ink-muted hover:text-ink hover:bg-base-700/60',
  danger: 'bg-signal-red/15 text-signal-red border border-signal-red/30 hover:bg-signal-red/25',
}

export default function Button({ children, variant = 'secondary', icon, className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
