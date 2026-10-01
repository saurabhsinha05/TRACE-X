import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_BACKEND_URL,
  checkBackendHealth,
  uploadEvidence,
  analyzeEvidence,
  getEvidence,
  queryEvidence,
  type EvidenceRecord,
  type QueryResponse,
} from '../lib/backendApi'
import { computeSHA256, extractClientMetadata, type ClientMetadata } from '../lib/clientMedia'

export type Mode = 'demo' | 'live'

interface CaseState {
  mode: Mode
  setMode: (m: Mode) => void

  backendUrl: string
  backendOnline: boolean | null // null = checking
  recheckBackend: () => void

  file: File | null
  fileUrl: string | null
  clientMetadata: ClientMetadata | null
  clientSha256: string | null
  hashing: boolean

  evidence: EvidenceRecord | null
  analyzing: boolean
  analysisProgress: { stage: string; percent: number } | null
  analysisError: string | null

  queryCount: number
  lastQuery: string | null
  lastQueryResult: QueryResponse | null
  querying: boolean
  queryError: string | null

  seekRequest: { time: number; id: number } | null // id makes repeated seeks to the same time re-fire

  loadFile: (file: File) => Promise<void>
  runAnalysis: () => Promise<void>
  runQuery: (query: string) => Promise<void>
  seekTo: (seconds: number) => void
  reset: () => void
}

const Ctx = createContext<CaseState | null>(null)

export function useCase() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCase must be used within CaseProvider')
  return ctx
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('demo')
  const [backendUrl] = useState(DEFAULT_BACKEND_URL)
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [clientMetadata, setClientMetadata] = useState<ClientMetadata | null>(null)
  const [clientSha256, setClientSha256] = useState<string | null>(null)
  const [hashing, setHashing] = useState(false)

  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<{ stage: string; percent: number } | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [queryCount, setQueryCount] = useState(0)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [lastQueryResult, setLastQueryResult] = useState<QueryResponse | null>(null)
  const [querying, setQuerying] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const [seekRequest, setSeekRequest] = useState<{ time: number; id: number } | null>(null)

  const recheckBackend = useCallback(() => {
    setBackendOnline(null)
    checkBackendHealth(backendUrl).then(setBackendOnline)
  }, [backendUrl])

  useEffect(() => {
    recheckBackend()
    const interval = setInterval(recheckBackend, 15000)
    return () => clearInterval(interval)
  }, [recheckBackend])

  const loadFile = useCallback(
    async (newFile: File) => {
      setFile(newFile)
      setFileUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(newFile)
      })
      setEvidence(null)
      setAnalysisError(null)
      setLastQueryResult(null)
      setQueryCount(0)
      setClientMetadata(null)
      setClientSha256(null)
      setHashing(true)
      setMode('live')

      // Hash and metadata are independent: a file the browser cannot decode
      // still has a valid, forensically meaningful SHA-256.
      const [metaResult, hashResult] = await Promise.allSettled([
        extractClientMetadata(newFile),
        computeSHA256(newFile),
      ])
      if (hashResult.status === 'fulfilled') setClientSha256(hashResult.value)
      if (metaResult.status === 'fulfilled') setClientMetadata(metaResult.value)
      else setAnalysisError(metaResult.reason instanceof Error ? metaResult.reason.message : 'Could not read file metadata.')
      setHashing(false)

      // Best-effort backend upload — does not block hash/metadata display above.
      try {
        const online = await checkBackendHealth(backendUrl)
        setBackendOnline(online)
        if (online) {
          const record = await uploadEvidence(backendUrl, newFile)
          setEvidence(record)
        }
      } catch (e) {
        setAnalysisError(e instanceof Error ? e.message : 'Backend upload failed.')
      }
    },
    [backendUrl],
  )

  const runAnalysis = useCallback(async () => {
    if (!evidence) {
      setAnalysisError('Upload evidence to a running backend before analyzing.')
      return
    }
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress({ stage: 'Starting analysis', percent: 0 })
    // Poll the backend for its real progress while the analysis request runs.
    const poll = setInterval(async () => {
      try {
        const snap = await getEvidence(backendUrl, evidence.evidence_id)
        if (snap.progress) setAnalysisProgress(snap.progress)
      } catch {
        /* the main request reports failures */
      }
    }, 600)
    try {
      const updated = await analyzeEvidence(backendUrl, evidence.evidence_id)
      setEvidence(updated)
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed.')
    } finally {
      clearInterval(poll)
      setAnalysisProgress(null)
      setAnalyzing(false)
    }
  }, [backendUrl, evidence])

  const runQuery = useCallback(
    async (query: string) => {
      if (!evidence || evidence.status !== 'READY') {
        setQueryError('Run analysis before querying this evidence.')
        return
      }
      setQuerying(true)
      setQueryError(null)
      try {
        const result = await queryEvidence(backendUrl, evidence.evidence_id, query)
        // Update query text and its result together so the UI never shows
        // one query's heading above another query's results.
        setLastQuery(query)
        setLastQueryResult(result)
        setQueryCount((n) => n + 1)
      } catch (e) {
        setQueryError(e instanceof Error ? e.message : 'Query failed.')
      } finally {
        setQuerying(false)
      }
    },
    [backendUrl, evidence],
  )

  const seekTo = useCallback((seconds: number) => setSeekRequest({ time: seconds, id: Date.now() + Math.random() }), [])

  const reset = useCallback(() => {
    setFile(null)
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setClientMetadata(null)
    setClientSha256(null)
    setEvidence(null)
    setAnalysisError(null)
    setLastQuery(null)
    setLastQueryResult(null)
    setQueryCount(0)
    setMode('demo')
  }, [])

  const value = useMemo<CaseState>(
    () => ({
      mode,
      setMode,
      backendUrl,
      backendOnline,
      recheckBackend,
      file,
      fileUrl,
      clientMetadata,
      clientSha256,
      hashing,
      evidence,
      analyzing,
      analysisProgress,
      analysisError,
      queryCount,
      lastQuery,
      lastQueryResult,
      querying,
      queryError,
      seekRequest,
      loadFile,
      runAnalysis,
      runQuery,
      seekTo,
      reset,
    }),
    [
      mode,
      backendUrl,
      backendOnline,
      recheckBackend,
      file,
      fileUrl,
      clientMetadata,
      clientSha256,
      hashing,
      evidence,
      analyzing,
      analysisProgress,
      analysisError,
      queryCount,
      lastQuery,
      lastQueryResult,
      querying,
      queryError,
      seekRequest,
      loadFile,
      runAnalysis,
      runQuery,
      seekTo,
      reset,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
