import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-base-600/50 text-ink-muted border-line',
  success: 'bg-signal-green/10 text-signal-green border-signal-green/30',
  warning: 'bg-signal-amber/10 text-signal-amber border-signal-amber/30',
  danger: 'bg-signal-red/10 text-signal-red border-signal-red/30',
  info: 'bg-signal-blue/10 text-signal-blue border-signal-blue/30',
}

export default function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]} ${className}`}>
      {children}
    </span>
  )
}
