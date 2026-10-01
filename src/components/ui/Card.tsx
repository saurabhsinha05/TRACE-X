import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel p-5 ${className}`}>{children}</div>
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  icon?: ReactNode
  tone?: 'default' | 'cyan' | 'green' | 'amber'
}) {
  const toneColor = {
    default: 'text-ink',
    cyan: 'text-signal-cyan',
    green: 'text-signal-green',
    amber: 'text-signal-amber',
  }[tone]

  return (
    <div className="panel p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <div className={`text-2xl font-semibold mono ${toneColor}`}>{value}</div>
      {sub && <span className="text-xs text-ink-muted">{sub}</span>}
    </div>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-ink-muted mt-0.5 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  )
}
