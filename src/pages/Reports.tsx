import { useState } from 'react'
import { FileText, AlertCircle, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Card, SectionHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useCase } from '../context/CaseContext'
import { formatDuration } from '../lib/clientMedia'
import { Link } from 'react-router-dom'

const DISCLAIMER =
  'AI-assisted analysis. Analyst verification required. This report does not constitute legal certification ' +
  'or guaranteed evidentiary admissibility.'

export default function Reports() {
  const { file, evidence, lastQuery, lastQueryResult } = useCase()
  const [generated, setGenerated] = useState(false)

  if (!file) {
    return (
      <div className="space-y-6 max-w-2xl">
        <SectionHeader title="Forensic Reports" description="Generate a report from real uploaded evidence and analysis results." />
        <Card className="text-center py-12">
          <p className="text-sm text-ink-muted mb-4">No evidence uploaded yet.</p>
          <Link to="/app/intake">
            <Button variant="primary">Go to Evidence Intake</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Evidence ID', value: evidence?.evidence_id ?? '—' },
    { label: 'Filename', value: file.name },
    {
      label: 'Video Metadata',
      value: evidence
        ? `${evidence.metadata.width}×${evidence.metadata.height}, ${evidence.metadata.fps} fps, ${formatDuration(evidence.metadata.duration_seconds)}`
        : 'Backend not connected — metadata unavailable',
    },
    {
      label: 'Objects Detected',
      value: evidence ? `${evidence.objects_detected} tracked objects (sampled at ${evidence.sample_fps} FPS)` : 'Not analyzed',
    },
  ]
  if (lastQuery && lastQueryResult) {
    rows.push({ label: 'Investigation Query', value: `"${lastQuery}"` })
    rows.push({
      label: 'Finding',
      value:
        lastQueryResult.match_count > 0
          ? lastQueryResult.matches
              .map((m) => `${m.track_id} (${formatDuration(m.first_seen)}–${formatDuration(m.last_seen)})`)
              .join(', ')
          : lastQueryResult.message ?? 'No matches',
    })
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginX = 48
    let y = 56

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('TRACE-X — Investigation Report', marginX, y)
    y += 20
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y)
    doc.setTextColor(0)
    y += 24
    doc.setDrawColor(210)
    doc.line(marginX, y, 547, y)
    y += 24

    const pageBottom = 780
    for (const row of rows) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(90)
      doc.text(row.label.toUpperCase(), marginX, y)
      y += 14

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(20)
      const lines = doc.splitTextToSize(row.value, 499)
      for (const line of lines) {
        if (y > pageBottom) {
          doc.addPage()
          y = 56
        }
        doc.text(line, marginX, y)
        y += 15
      }
      y += 12
    }

    y += 8
    if (y > pageBottom - 40) {
      doc.addPage()
      y = 56
    }
    doc.setFillColor(255, 247, 230)
    doc.setDrawColor(232, 169, 76)
    const noteLines = doc.splitTextToSize(DISCLAIMER, 483)
    const noteHeight = noteLines.length * 12 + 16
    doc.roundedRect(marginX, y, 499, noteHeight, 3, 3, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(150, 100, 20)
    doc.text(noteLines, marginX + 10, y + 16)
    doc.setTextColor(0)

    const safeName = (evidence?.evidence_id ?? 'trace-x-report').replace(/[^a-zA-Z0-9_-]/g, '')
    doc.save(`${safeName}-report.pdf`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeader title="Forensic Reports" description="Compiled from the real evidence record for this session — no placeholder values." />

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="mono text-sm text-signal-cyan">{evidence?.evidence_id ?? 'Not yet analyzed'}</div>
            <div className="text-ink font-medium">{file.name}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" icon={<FileText size={14} />} onClick={() => setGenerated(true)}>
              Generate Report
            </Button>
            {generated && (
              <Button variant="secondary" icon={<Download size={14} />} onClick={downloadPdf}>
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </Card>

      {generated && (
        <Card className="space-y-5">
          <div className="border-b border-line pb-4">
            <h3 className="text-lg font-semibold text-ink">Investigation Report</h3>
            <p className="text-xs text-ink-faint mt-1">Generated {new Date().toLocaleString()}</p>
          </div>

          {rows.map((r) => (
            <ReportRow key={r.label} label={r.label} value={r.value} />
          ))}

          <div className="flex items-start gap-2 rounded-md bg-signal-amber/10 border border-signal-amber/20 p-3 text-xs text-signal-amber mt-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {DISCLAIMER}
          </div>
        </Card>
      )}
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-faint mb-1">{label}</div>
      <div className="text-sm text-ink break-all">{value}</div>
    </div>
  )
}
