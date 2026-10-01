import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight, Upload, Fingerprint, ScanSearch, Route, Palette, MessageSquareText } from 'lucide-react'

const steps = [
  { icon: Upload, title: 'Upload CCTV video', desc: 'MP4, AVI, MOV or MKV. Metadata is read from the actual file.' },
  { icon: Fingerprint, title: 'Generate SHA-256', desc: 'A real cryptographic hash is computed from the file bytes.' },
  { icon: ScanSearch, title: 'Detect objects', desc: 'YOLOv8 finds people, cars, trucks, buses, motorcycles and bicycles.' },
  { icon: Route, title: 'Track them', desc: 'Simple frame-to-frame matching gives each object a first-seen and last-seen time.' },
  { icon: Palette, title: 'Estimate colour', desc: 'Dominant colour of the object (or a person\'s upper body), from the pixels.' },
  { icon: MessageSquareText, title: 'Ask a question', desc: '"When was a red car visible?" returns timestamps — click one to jump the video there.' },
]


export default function Landing() {
  return (
    <div className="min-h-screen bg-base-950 text-ink">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-signal-cyan/10 border border-signal-cyan/30 flex items-center justify-center">
              <ShieldCheck size={17} className="text-signal-cyan" />
            </div>
            <span className="font-semibold tracking-tight">TRACE-X</span>
          </div>
          <Link to="/app/intake" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
            Start investigation <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-scan opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-24 relative">
          <div className="mono text-xs text-signal-cyan tracking-wide mb-4">PROBLEM STATEMENT #150 · PROTOTYPE</div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl leading-[1.05]">
            Ask your CCTV footage a question.
          </h1>
          <p className="text-ink-muted text-lg mt-5 max-w-xl">
            Give TRACE-X a surveillance video, ask what you are looking for, and it finds the matching object and tells
            you when it appeared.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/app/intake" className="inline-flex items-center gap-2 rounded-md bg-signal-cyan text-base-950 font-semibold px-4 py-2.5 text-sm hover:bg-signal-cyan/90">
              Start Investigation <ArrowRight size={15} />
            </Link>
            <Link to="/app/architecture" className="inline-flex items-center gap-2 rounded-md border border-line bg-base-700/50 px-4 py-2.5 text-sm hover:bg-base-700">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 border-b border-line">
        <div className="mono text-xs text-ink-faint mb-6">HOW IT WORKS — ALL OF THIS RUNS FOR REAL</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((c, i) => (
            <div key={c.title} className="panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <c.icon size={18} className="text-signal-cyan" />
                <span className="mono text-xs text-ink-faint">STEP {i + 1}</span>
              </div>
              <h3 className="font-medium text-ink mb-1.5">{c.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
