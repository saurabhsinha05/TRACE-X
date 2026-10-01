import { useMemo, useState } from 'react'
import { Card, SectionHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useCase } from '../context/CaseContext'
import { formatDuration } from '../lib/clientMedia'
import { timelineEvents as demoEvents } from '../data/mockData'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'

const CLASS_COLORS: Record<string, string> = {
  person: 'bg-signal-blue',
  car: 'bg-signal-cyan',
  truck: 'bg-signal-amber',
  bus: 'bg-signal-green',
  motorcycle: 'bg-signal-red',
  bicycle: 'bg-ink-faint',
}

export default function TimelineAnalysis() {
  const { mode, evidence, seekTo } = useCase()
  const navigate = useNavigate()
  const [classFilter, setClassFilter] = useState<string>('All')

  const isLive = mode === 'live' && evidence && evidence.status === 'READY'
  const duration = evidence?.metadata.duration_seconds ?? 0

  const classes = useMemo(() => {
    if (!isLive) return []
    return Array.from(new Set(evidence!.tracks.map((t) => t.class)))
  }, [isLive, evidence])

  const visibleTracks = useMemo(() => {
    if (!isLive) return []
    return classFilter === 'All' ? evidence!.tracks : evidence!.tracks.filter((t) => t.class === classFilter)
  }, [isLive, evidence, classFilter])

  if (mode === 'demo') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Timeline Analysis"
          description="Demo timeline (simulated data). Upload real evidence and run analysis to see a live timeline."
          action={<Badge tone="warning">DEMO / SIMULATED</Badge>}
        />
        <Card>
          <div className="mb-2 text-sm text-ink-muted mono">23 September 2026 — simulated case data</div>
          <div className="space-y-3">
            {demoEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-ink-faint mono text-xs">{e.camera}</span>
                <div className="flex-1 h-2 rounded-full bg-base-700 relative overflow-hidden">
                  <div
                    className={`absolute h-full rounded-full ${e.suspicious ? 'bg-signal-red' : 'bg-signal-cyan'}`}
                    style={{ left: `${((e.hour - 18) / 7) * 100}%`, width: `${Math.max((e.durationHrs / 7) * 100, 1.5)}%` }}
                  />
                </div>
                <span className="text-ink-faint text-xs w-28">{e.type}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (!isLive) {
    return (
      <div className="space-y-6 max-w-2xl">
        <SectionHeader title="Timeline Analysis" description="Populated from real analysis results once evidence has been analyzed." />
        <Card className="text-center py-12">
          <p className="text-sm text-ink-muted mb-4">
            {evidence ? 'Run analysis on this evidence to build a real timeline.' : 'No evidence analyzed yet.'}
          </p>
          <Link to="/app/investigate">
            <Button variant="primary">Go to AI Video Investigation</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Timeline Analysis"
        description={`Real tracked objects across ${formatDuration(duration)} of analyzed footage.`}
        action={<Badge tone="success">LIVE ANALYSIS</Badge>}
      />

      <Card>
        <div className="flex flex-wrap gap-2 mb-5">
          {['All', ...classes].map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`px-3 py-1.5 rounded-md text-xs border capitalize ${
                classFilter === c ? 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan' : 'border-line text-ink-muted hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visibleTracks.map((t) => (
            <button
              key={t.track_id}
              onClick={() => {
                seekTo(t.first_seen)
                navigate('/app/investigate')
              }}
              className="w-full flex items-center gap-3 text-sm hover:bg-base-700/30 rounded-md p-1.5 -m-1.5"
            >
              <span className="w-24 text-left mono text-xs text-ink-muted shrink-0">{t.track_id}</span>
              <div className="flex-1 h-3 rounded-full bg-base-700 relative overflow-hidden">
                <div
                  className={`absolute h-full rounded-full ${CLASS_COLORS[t.class] ?? 'bg-signal-cyan'}`}
                  style={{
                    left: duration ? `${(t.first_seen / duration) * 100}%` : 0,
                    width: duration ? `${Math.max((t.duration / duration) * 100, 1)}%` : '2%',
                  }}
                />
              </div>
              <span className="w-32 text-right text-xs text-ink-faint shrink-0">
                {formatDuration(t.first_seen)} – {formatDuration(t.last_seen)}
              </span>
            </button>
          ))}
          {visibleTracks.length === 0 && <div className="text-center py-6 text-sm text-ink-faint">No tracks in this class.</div>}
        </div>

        <p className="text-[11px] text-ink-faint mt-5 pt-4 border-t border-line-soft">
          Click a track to open the player at its first appearance.
        </p>
      </Card>
    </div>
  )
}
