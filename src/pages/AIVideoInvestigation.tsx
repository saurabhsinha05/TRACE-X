import { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Sparkles,
  Loader2,
  AlertTriangle,
  Search,
  Target,
} from 'lucide-react'
import { Card, SectionHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useCase } from '../context/CaseContext'
import { formatDuration } from '../lib/clientMedia'
import type { Track } from '../lib/backendApi'
import { Link } from 'react-router-dom'

const EXAMPLE_QUERIES = [
  'Show all people',
  'Show all cars',
  'When was a car visible?',
  'When was a red car visible?',
  'Find a person wearing a blue shirt',
]

// Maps a source-pixel bounding box onto the rectangle the <video> actually
// occupies (object-fit: contain letterboxes non-16:9 footage).
function overlayStyle(
  bbox: [number, number, number, number],
  srcW: number,
  srcH: number,
  container: HTMLElement | null,
) {
  if (!container || !srcW || !srcH) return null
  const cw = container.clientWidth
  const ch = container.clientHeight
  const scale = Math.min(cw / srcW, ch / srcH)
  const dispW = srcW * scale
  const dispH = srcH * scale
  const offX = (cw - dispW) / 2
  const offY = (ch - dispH) / 2
  return {
    left: offX + bbox[0] * scale,
    top: offY + bbox[1] * scale,
    width: (bbox[2] - bbox[0]) * scale,
    height: (bbox[3] - bbox[1]) * scale,
  }
}

export default function AIVideoInvestigation() {
  const {
    file,
    fileUrl,
    evidence,
    analyzing,
    analysisProgress,
    analysisError,
    runAnalysis,
    lastQuery,
    lastQueryResult,
    querying,
    queryError,
    runQuery,
    seekRequest,
    seekTo,
    backendOnline,
  } = useCase()

  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [queryText, setQueryText] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [, setResizeTick] = useState(0)

  // Re-render when the player is resized so the overlay stays aligned.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setResizeTick((n) => n + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [fileUrl])

  useEffect(() => {
    const v = videoRef.current
    if (seekRequest && v && v.readyState >= 1) {
      v.currentTime = seekRequest.time
      v.play().catch(() => {})
    }
  }, [seekRequest])


  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  function step(frames: number) {
    const v = videoRef.current
    if (!v) return
    const fps = evidence?.metadata.fps || 25
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + frames / fps))
  }

  function submitQuery(q: string) {
    if (!q.trim()) return
    setQueryText(q)
    runQuery(q)
  }

  const resultsToShow: Track[] = lastQueryResult ? lastQueryResult.matches : evidence?.tracks ?? []

  const showOverlay =
    selectedTrack &&
    selectedTrack.sample_bbox &&
    evidence &&
    currentTime >= selectedTrack.first_seen - 0.5 &&
    currentTime <= selectedTrack.last_seen + 0.5

  if (!file || !fileUrl) {
    return (
      <div className="space-y-6 max-w-3xl">
        <SectionHeader title="AI Video Investigation" description="Upload evidence first to start a live investigation." />
        <Card className="text-center py-12">
          <Sparkles size={24} className="mx-auto text-ink-faint mb-3" />
          <p className="text-sm text-ink-muted mb-4">No evidence loaded yet.</p>
          <Link to="/app/intake">
            <Button variant="primary">Go to Evidence Intake</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Video Investigation"
        description="Ask a natural-language question about this footage. Results are real, timestamped detections — click one to jump the player there."
        action={
          !evidence ? (
            <Badge tone="warning">Backend unavailable — analysis disabled</Badge>
          ) : evidence.status !== 'READY' ? (
            <Button variant="primary" onClick={runAnalysis} disabled={analyzing}>
              {analyzing && <Loader2 size={14} className="animate-spin" />}
              Run Forensic Analysis
            </Button>
          ) : (
            <Badge tone="success">Analysis complete — {evidence.objects_detected} objects tracked</Badge>
          )
        }
      />

      {analyzing && (
        <Card>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-ink-muted">{analysisProgress?.stage ?? 'Starting analysis'}</span>
            <span className="mono text-signal-cyan">{Math.round(analysisProgress?.percent ?? 0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-base-700 overflow-hidden">
            <div
              className="h-full bg-signal-cyan transition-all duration-300"
              style={{ width: `${analysisProgress?.percent ?? 0}%` }}
            />
          </div>
          <p className="text-[11px] text-ink-faint mt-3">
            Live progress reported by the backend (frames processed by YOLOv8 at {evidence?.sample_fps ?? 3} FPS sampling).
          </p>
        </Card>
      )}

      {analysisError && (
        <div className="flex items-center gap-2 rounded-md bg-signal-red/10 border border-signal-red/20 p-3 text-xs text-signal-red">
          <AlertTriangle size={14} className="shrink-0" />
          {analysisError}
          {backendOnline === false && ' (Backend not reachable at localhost:8000 — see README to start it.)'}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        {/* Video player */}
        <Card className="p-0 overflow-hidden">
          <div ref={wrapperRef} className="relative bg-black">
            <video
              ref={videoRef}
              src={fileUrl}
              className="w-full aspect-video bg-black"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration)
                // A seek requested from another page (e.g. Timeline) is applied once the video is ready.
                if (seekRequest) {
                  e.currentTarget.currentTime = seekRequest.time
                  e.currentTarget.play().catch(() => {})
                }
              }}
            />
            {showOverlay && evidence && selectedTrack?.sample_bbox && (() => {
              const box = overlayStyle(
                selectedTrack.sample_bbox,
                evidence.metadata.width,
                evidence.metadata.height,
                videoRef.current,
              )
              if (!box) return null
              return (
                <div className="absolute border-2 border-signal-cyan pointer-events-none" style={box}>
                  <span className="absolute -top-6 left-0 bg-signal-cyan text-base-950 text-[11px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap">
                    {selectedTrack.track_id}
                    {selectedTrack.dominant_color ? ` · ${selectedTrack.dominant_color}` : ''}
                  </span>
                </div>
              )
            })()}
            <div className="absolute top-3 left-3 mono text-[11px] text-white/90 bg-black/40 px-2 py-1 rounded">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-line">
            <IconBtn icon={SkipBack} label="Frame back" onClick={() => step(-1)} />
            <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-signal-cyan text-base-950 flex items-center justify-center hover:bg-signal-cyan/90">
              {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>
            <IconBtn icon={SkipForward} label="Frame forward" onClick={() => step(1)} />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={(e) => {
                const t = parseFloat(e.target.value)
                if (videoRef.current) videoRef.current.currentTime = t
              }}
              className="flex-1 accent-signal-cyan"
            />
            <IconBtn icon={Maximize} label="Fullscreen" onClick={() => wrapperRef.current?.requestFullscreen()} />
          </div>
        </Card>

        {/* Query panel */}
        <Card className="flex flex-col">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-3">Investigation Query</div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitQuery(queryText)
            }}
            className="flex gap-2 mb-3"
          >
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. When was a red car visible?"
              className="flex-1 bg-base-700/60 border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-faint/60 outline-none focus:border-signal-cyan/40"
            />
            <Button variant="primary" icon={querying ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}>
              Ask
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => submitQuery(q)}
                className="text-[11px] px-2 py-1 rounded-full border border-line text-ink-muted hover:text-signal-cyan hover:border-signal-cyan/40"
              >
                {q}
              </button>
            ))}
          </div>

          {queryError && (
            <div className="flex items-center gap-2 rounded-md bg-signal-red/10 border border-signal-red/20 p-2.5 text-xs text-signal-red mb-3">
              <AlertTriangle size={13} className="shrink-0" />
              {queryError}
            </div>
          )}

          {lastQuery && lastQueryResult?.parsed_query.understood && (
            <div className="text-xs text-ink-faint mb-2">
              Understood as: {lastQueryResult.parsed_query.object_classes.join(' / ')}
              {lastQueryResult.parsed_query.color ? `, colour ${lastQueryResult.parsed_query.color}` : ''}
            </div>
          )}

          <p className="text-[11px] text-ink-faint mt-auto pt-3 border-t border-line-soft">
            AI-assisted analysis. Analyst verification required. Color/attribute estimation is a prototype and can be
            affected by lighting, shadows and compression.
          </p>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <SectionHeader
          title={lastQuery ? `Results for "${lastQuery}"` : 'Detected Objects'}
          description={
            lastQueryResult
              ? `${lastQueryResult.match_count} match${lastQueryResult.match_count === 1 ? '' : 'es'}`
              : evidence?.status === 'READY'
                ? 'Ask a question above, or browse everything detected in this footage.'
                : 'Run analysis to detect objects in this footage.'
          }
        />

        {lastQueryResult && lastQueryResult.match_count === 0 && (
          <div className="text-center py-8 text-sm text-ink-faint">{lastQueryResult.message}</div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resultsToShow.map((t) => (
            <div key={t.track_id} className="panel p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="mono text-sm text-signal-cyan">{t.track_id}</span>
                <Badge tone="info">{t.class}</Badge>
              </div>
              {t.dominant_color && (
                <div className="text-xs text-ink-muted capitalize">
                  {t.dominant_color} · attribute confidence {Math.round((t.attribute_confidence ?? 0) * 100)}%
                </div>
              )}
              <div className="text-xs text-ink-faint space-y-0.5">
                <div>First seen: <span className="text-ink mono">{formatDuration(t.first_seen)}</span></div>
                <div>Last seen: <span className="text-ink mono">{formatDuration(t.last_seen)}</span></div>
                <div>Duration: <span className="text-ink mono">{t.duration.toFixed(2)}s</span></div>
                <div>Detection confidence: <span className="text-ink">{Math.round(t.detection_confidence * 100)}%</span></div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs"
                  icon={<Target size={12} />}
                  onClick={() => setSelectedTrack(t)}
                >
                  Show box
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setSelectedTrack(t)
                    seekTo(t.first_seen)
                  }}
                >
                  Jump to Evidence
                </Button>
              </div>
            </div>
          ))}
        </div>

        {!evidence && (
          <div className="text-center py-8 text-sm text-ink-faint">
            Connect a backend and analyze this evidence to see detected objects here.
          </div>
        )}
      </Card>
    </div>
  )
}

function IconBtn({ icon: Icon, label, onClick }: { icon: typeof Play; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={label} className="w-8 h-8 rounded-md border border-line text-ink-muted hover:text-ink hover:bg-base-700/60 flex items-center justify-center">
      <Icon size={14} />
    </button>
  )
}
