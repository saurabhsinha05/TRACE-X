import { useRef, useState } from 'react'
import { UploadCloud, Loader2, AlertTriangle, FileVideo, WifiOff } from 'lucide-react'
import { Card, SectionHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useCase } from '../context/CaseContext'
import { ALLOWED_VIDEO_EXTENSIONS, formatDuration, isSupportedVideoFile } from '../lib/clientMedia'
import { Link } from 'react-router-dom'

export default function EvidenceIntake() {
  const {
    file,
    clientMetadata,
    clientSha256,
    hashing,
    evidence,
    backendOnline,
    analysisError,
    loadFile,
  } = useCase()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [formatError, setFormatError] = useState<string | null>(null)

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    if (!isSupportedVideoFile(f)) {
      setFormatError(`Unsupported file type. Supported formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`)
      return
    }
    setFormatError(null)
    loadFile(f)
  }

  const status = evidence?.status ?? (file ? (hashing ? 'HASHING' : analysisError ? 'REJECTED' : 'UPLOADED') : null)

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader
        title="Evidence Intake"
        description="Upload a real CCTV/DVR/NVR video export. Metadata and the SHA-256 hash are computed from the actual file — nothing here is simulated."
      />

      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-signal-cyan/50 bg-signal-cyan/5' : 'border-line hover:border-line'
          }`}
        >
          <UploadCloud size={28} className="mx-auto text-ink-faint mb-3" />
          <p className="text-sm text-ink">Drop a video file here, or click to browse</p>
          <p className="text-xs text-ink-faint mt-1">Supported: {ALLOWED_VIDEO_EXTENSIONS.join(', ')}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_VIDEO_EXTENSIONS.join(',')}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {formatError && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-signal-red/10 border border-signal-red/20 p-3 text-xs text-signal-red">
            <AlertTriangle size={14} className="shrink-0" />
            {formatError}
          </div>
        )}

        {backendOnline === false && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-signal-amber/10 border border-signal-amber/20 p-3 text-xs text-signal-amber">
            <WifiOff size={14} className="shrink-0" />
            Analysis backend not reachable at localhost:8000. Hashing and metadata below still work fully
            client-side — start the backend (see README) to enable AI Video Investigation.
          </div>
        )}
      </Card>

      {file && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <FileVideo size={16} className="text-signal-cyan" />
              <span className="text-sm text-ink">{file.name}</span>
            </div>
            {status && (
              <Badge tone={status === 'READY' ? 'success' : status === 'FAILED' || status === 'REJECTED' ? 'danger' : 'info'}>
                {hashing ? 'HASHING' : status}
              </Badge>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Row label="Evidence ID" value={evidence?.evidence_id ?? 'Pending backend connection'} mono />
            <Row label="File size" value={`${(file.size / (1024 * 1024)).toFixed(2)} MB`} />
            <Row
              label="Duration"
              value={clientMetadata ? formatDuration(clientMetadata.durationSeconds) : hashing ? '…' : '—'}
            />
            <Row
              label="Resolution"
              value={clientMetadata ? `${clientMetadata.width} × ${clientMetadata.height}` : hashing ? '…' : '—'}
            />
            <Row label="FPS (server)" value={evidence ? String(evidence.metadata.fps) : 'Requires backend'} />
            <Row label="Codec (server)" value={evidence ? evidence.metadata.codec_fourcc : 'Requires backend'} />
          </div>

          <div className="pt-3 border-t border-line-soft">
            <div className="text-xs text-ink-faint mb-1.5">SHA-256 (computed client-side via Web Crypto)</div>
            <div className="mono text-xs text-signal-cyan break-all">
              {hashing ? 'Computing hash…' : clientSha256 ?? '—'}
            </div>
          </div>

          {analysisError && (
            <div className="flex items-center gap-2 rounded-md bg-signal-red/10 border border-signal-red/20 p-3 text-xs text-signal-red">
              <AlertTriangle size={14} className="shrink-0" />
              {analysisError}
            </div>
          )}

          {evidence && (
            <div className="pt-3 border-t border-line-soft flex justify-end">
              <Link to="/app/investigate">
                <Button variant="primary">Go to AI Video Investigation</Button>
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft pb-2">
      <span className="text-ink-faint">{label}</span>
      <span className={`text-ink text-right ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}
