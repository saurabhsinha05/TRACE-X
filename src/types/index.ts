export type TimelineEventType = 'Motion' | 'Recording Start' | 'Recording Stop' | 'Tampering' | 'Missing Segment' | 'Recovered Segment'

export interface TimelineEvent {
  id: string
  camera: string
  hour: number
  durationHrs: number
  type: TimelineEventType
  suspicious: boolean
  evidenceId?: string
  confidence?: number
}
