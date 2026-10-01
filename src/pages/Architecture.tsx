import { ArrowDown } from 'lucide-react'
import { Card, SectionHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const implemented = [
  ['Video file (mp4 / avi / mov / mkv)', 'Exported from any DVR/NVR in a standard format'],
  ['Metadata + SHA-256', 'OpenCV / Web Crypto'],
  ['Frame sampling', '3 frames per second'],
  ['Object detection', 'YOLOv8n — person, bicycle, car, motorcycle, bus, truck'],
  ['Simple tracking', 'IoU matching → first seen / last seen / duration'],
  ['Colour estimate', 'HSV analysis of the object crop (prototype)'],
  ['Query → timestamps', 'Rule-based keyword parser, no LLM'],
]


export default function Architecture() {
  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="How TRACE-X Works" description="The pipeline that runs today, and the multi-vendor layer that is planned." />

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint">Analysis pipeline</div>
          <Badge tone="success">IMPLEMENTED</Badge>
        </div>
        <div className="space-y-1.5">
          {implemented.map(([title, detail], i) => (
            <div key={title}>
              <div className="panel px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm text-ink">{title}</span>
                <span className="text-xs text-ink-faint">{detail}</span>
              </div>
              {i < implemented.length - 1 && <ArrowDown size={14} className="mx-auto my-0.5 text-ink-faint" />}
            </div>
          ))}
        </div>
      </Card>

    </div>
  )
}
