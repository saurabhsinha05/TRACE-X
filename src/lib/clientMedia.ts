// Real, in-browser evidence processing. These functions do not simulate
// anything: the hash is computed by the Web Crypto API over the actual
// file bytes, and the metadata is read from the browser's own video
// decoder. Both work with zero backend dependency.

export interface ClientMetadata {
  filename: string
  fileSizeBytes: number
  durationSeconds: number
  width: number
  height: number
}

export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function extractClientMetadata(file: File): Promise<ClientMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => {
      resolve({
        filename: file.name,
        fileSizeBytes: file.size,
        durationSeconds: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video metadata — the file may be corrupted or in an unsupported format.'))
    }
  })
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(2).padStart(5, '0')
  return `${String(mins).padStart(2, '0')}:${secs}`
}

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.mkv']

export function isSupportedVideoFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return ALLOWED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))
}
