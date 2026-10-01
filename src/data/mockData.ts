// DEMO MODE ONLY. Everything in this file is simulated and is shown in the UI
// under a "DEMO / SIMULATED" label. Live mode never reads from here.
import type { TimelineEvent } from '../types'

export const overviewStats = {
  evidenceSources: 24,
  devicesAnalyzed: 18,
}

export const timelineEvents: TimelineEvent[] = [
  { id: 'T-1', camera: 'CAM-01', hour: 18.2, durationHrs: 1.4, type: 'Recording Start', suspicious: false },
  { id: 'T-2', camera: 'CAM-01', hour: 20.5, durationHrs: 0.6, type: 'Motion', suspicious: false, evidenceId: 'EV-00140', confidence: 82 },
  { id: 'T-3', camera: 'CAM-02', hour: 18.0, durationHrs: 2.6, type: 'Recording Start', suspicious: false },
  { id: 'T-4', camera: 'CAM-02', hour: 21.4, durationHrs: 0.3, type: 'Tampering', suspicious: true, evidenceId: 'EV-00149', confidence: 74 },
  { id: 'T-5', camera: 'CAM-03', hour: 19.1, durationHrs: 0.8, type: 'Motion', suspicious: false, evidenceId: 'EV-00141', confidence: 90 },
  { id: 'T-6', camera: 'CAM-03', hour: 22.0, durationHrs: 1.0, type: 'Missing Segment', suspicious: true },
  { id: 'T-7', camera: 'CAM-04', hour: 22.24, durationHrs: 0.4, type: 'Recovered Segment', suspicious: true, evidenceId: 'EV-00147', confidence: 96 },
  { id: 'T-8', camera: 'CAM-09', hour: 22.5, durationHrs: 0.9, type: 'Motion', suspicious: true, evidenceId: 'EV-00148', confidence: 91 },
  { id: 'T-9', camera: 'CAM-11', hour: 23.2, durationHrs: 0.5, type: 'Recording Stop', suspicious: false },
]
