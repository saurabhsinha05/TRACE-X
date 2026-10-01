import { FileVideo, Target, MessageSquareText, Sparkles } from 'lucide-react'
import { Card, SectionHeader, StatCard } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useCase } from '../context/CaseContext'
import { formatDuration } from '../lib/clientMedia'
import { Link } from 'react-router-dom'
import { overviewStats as demoStats } from '../data/mockData'

export default function Overview() {
  const { mode, setMode, file, evidence, lastQuery, lastQueryResult, queryCount } = useCase()

  if (mode === 'demo' || !file) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Investigation Overview"
          description="Demo mode — simulated case data for a quick walkthrough of the product."
          action={<Badge tone="warning">DEMO / SIMULATED</Badge>}
        />
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Evidence Sources" value={String(demoStats.evidenceSources)} />
          <StatCard label="Devices Analyzed" value={String(demoStats.devicesAnalyzed)} />
        </div>
        <Card className="text-center py-8">
          <Sparkles size={22} className="mx-auto text-ink-faint mb-3" />
          <p className="text-sm text-ink-muted mb-4">
            Upload a real CCTV video to switch to a live, evidence-backed investigation.
          </p>
          <Link to="/app/intake">
            <Button variant="primary">Start Live Investigation</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Investigation Overview"
        description="Live case state, built entirely from the evidence you uploaded and analyzed."
        action={
          <button onClick={() => setMode('demo')} className="text-xs text-ink-faint hover:text-ink underline">
            Switch to demo mode
          </button>
        }
      />

      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <FileVideo size={18} className="text-signal-cyan" />
            <div>
              <div className="mono text-sm text-signal-cyan">{evidence?.evidence_id ?? 'Awaiting backend'}</div>
              <div className="text-ink font-medium">{file.name}</div>
            </div>
          </div>
          <Badge tone={evidence?.status === 'READY' ? 'success' : evidence?.status === 'FAILED' ? 'danger' : 'info'}>
            {evidence?.status ?? 'CLIENT-ONLY'}
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Objects Detected"
          value={evidence ? String(evidence.objects_detected) : '—'}
          icon={<Target size={15} />}
          tone="cyan"
        />
        <StatCard
          label="Investigation Queries"
          value={String(queryCount)}
          icon={<MessageSquareText size={15} />}
        />
        <StatCard
          label="Last Query Matches"
          value={lastQueryResult ? String(lastQueryResult.match_count) : '—'}
        />
      </div>

      {evidence && (
        <Card>
          <SectionHeader title="Evidence Summary" />
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Row label="Duration" value={formatDuration(evidence.metadata.duration_seconds)} />
            <Row label="Resolution" value={`${evidence.metadata.width} × ${evidence.metadata.height}`} />
            <Row label="FPS" value={String(evidence.metadata.fps)} />
            <Row label="Analysis Sampling" value={`${evidence.sample_fps} FPS`} />
          </div>
        </Card>
      )}

      {lastQuery && lastQueryResult && (
        <Card>
          <SectionHeader title="Recent Findings" />
          <p className="text-sm text-ink-muted mb-2">
            "{lastQuery}" — {lastQueryResult.match_count} match{lastQueryResult.match_count === 1 ? '' : 'es'}
          </p>
          {lastQueryResult.matches.slice(0, 3).map((m) => (
            <div key={m.track_id} className="flex items-center justify-between text-sm border-t border-line-soft py-2">
              <span className="mono text-signal-cyan">{m.track_id}</span>
              <span className="text-ink-faint text-xs">
                {formatDuration(m.first_seen)} – {formatDuration(m.last_seen)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft pb-2">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  )
}
