// Thin client for the real FastAPI backend (backend/main.py). Every call
// here hits an actual HTTP endpoint -- there is no mock branch in this
// file. If the backend is unreachable, callers get a rejected promise and
// are responsible for showing an honest "backend unavailable" state.

export const DEFAULT_BACKEND_URL = 'http://localhost:8000'

export interface Track {
  track_id: string
  class: string
  first_seen: number
  last_seen: number
  duration: number
  detection_confidence: number
  dominant_color: string | null
  attribute_confidence: number | null
  detection_count: number
  sample_bbox: [number, number, number, number] | null
  sample_frame: number | null
}

export interface EvidenceRecord {
  evidence_id: string
  video_url: string
  status: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED'
  metadata: {
    filename: string
    file_size_bytes: number
    duration_seconds: number
    duration_formatted: string
    width: number
    height: number
    fps: number
    frame_count: number
    codec_fourcc: string
  }
  hashes: { sha256: string; sha1: string; md5: string }
  tracks: Track[]
  objects_detected: number
  sample_fps: number
  progress?: { stage: string; percent: number }
}

export interface QueryResponse {
  parsed_query: {
    raw_query: string
    object_classes: string[]
    color: string | null
    attribute_type: string | null
    understood: boolean
  }
  match_count: number
  matches: Track[]
  message: string | null
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* ignore parse failure, use default message */
    }
    throw new Error(detail)
  }
  return res.json()
}

export async function checkBackendHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

export async function uploadEvidence(baseUrl: string, file: File): Promise<EvidenceRecord> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${baseUrl}/api/evidence/upload`, { method: 'POST', body: form })
  return handle<EvidenceRecord>(res)
}

export async function getEvidence(baseUrl: string, evidenceId: string): Promise<EvidenceRecord> {
  const res = await fetch(`${baseUrl}/api/evidence/${evidenceId}`)
  return handle<EvidenceRecord>(res)
}

export async function analyzeEvidence(baseUrl: string, evidenceId: string): Promise<EvidenceRecord> {
  const res = await fetch(`${baseUrl}/api/evidence/${evidenceId}/analyze`, { method: 'POST' })
  return handle<EvidenceRecord>(res)
}

export async function queryEvidence(baseUrl: string, evidenceId: string, query: string): Promise<QueryResponse> {
  const res = await fetch(`${baseUrl}/api/evidence/${evidenceId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return handle<QueryResponse>(res)
}
