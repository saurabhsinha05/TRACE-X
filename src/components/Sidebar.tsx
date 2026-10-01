import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  HardDriveDownload,
  Sparkles,
  GanttChartSquare,
  FileText,
  ShieldCheck,
  Workflow,
  X,
} from 'lucide-react'
import { useCase } from '../context/CaseContext'

const nav = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/intake', label: 'Evidence Intake', icon: HardDriveDownload },
  { to: '/app/investigate', label: 'AI Video Investigation', icon: Sparkles },
  { to: '/app/timeline', label: 'Timeline Analysis', icon: GanttChartSquare },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/architecture', label: 'How It Works', icon: Workflow },
]

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { backendOnline } = useCase()

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-base-950/70 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 shrink-0 bg-base-900 border-r border-line flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-signal-cyan/10 border border-signal-cyan/30 flex items-center justify-center">
              <ShieldCheck size={17} className="text-signal-cyan" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-ink leading-none">TRACE-X</div>
              <div className="text-[10px] text-ink-faint mt-0.5 mono">FORENSIC PLATFORM</div>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-ink-faint">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm mb-0.5 transition-colors ${
                  isActive ? 'bg-signal-cyan/10 text-signal-cyan border border-signal-cyan/20' : 'text-ink-muted hover:text-ink hover:bg-base-700/60 border border-transparent'
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3.5 border-t border-line space-y-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${backendOnline ? 'bg-signal-green animate-pulseSoft opacity-75' : 'bg-signal-red'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${backendOnline ? 'bg-signal-green' : 'bg-signal-red'}`} />
            </span>
            {backendOnline === null ? 'Checking analysis backend…' : backendOnline ? 'Analysis Backend Online' : 'Analysis Backend Offline'}
          </div>
          <div className="rounded-md bg-base-700/60 border border-line px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-ink-faint">Prototype Mode</div>
            <div className="text-xs text-ink-muted mt-0.5">PS #150</div>
          </div>
        </div>
      </aside>
    </>
  )
}
