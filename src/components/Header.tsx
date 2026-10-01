import { Menu, Video } from 'lucide-react'
import { useCase } from '../context/CaseContext'
import Badge from './ui/Badge'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { mode, setMode, file } = useCase()

  return (
    <header className="h-16 shrink-0 border-b border-line bg-base-900/80 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6 sticky top-0 z-20">
      <button onClick={onMenuClick} className="md:hidden text-ink-muted">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        {mode === 'demo' ? <Badge tone="warning">DEMO / SIMULATED</Badge> : <Badge tone="success">LIVE ANALYSIS</Badge>}
        {file && <span className="text-xs text-ink-faint hidden sm:inline">{file.name}</span>}
      </div>

      <div className="flex-1" />

      {mode === 'live' && (
        <button
          onClick={() => setMode('demo')}
          className="inline-flex items-center gap-2 rounded-md border border-line bg-base-700/50 text-ink-muted px-3 py-2 text-sm hover:text-ink"
        >
          <Video size={14} />
          Switch to Demo
        </button>
      )}
    </header>
  )
}
