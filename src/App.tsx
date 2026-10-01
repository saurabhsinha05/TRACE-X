import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/ui/Toast'
import { CaseProvider } from './context/CaseContext'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import EvidenceIntake from './pages/EvidenceIntake'
import AIVideoInvestigation from './pages/AIVideoInvestigation'
import TimelineAnalysis from './pages/TimelineAnalysis'
import Architecture from './pages/Architecture'
import Reports from './pages/Reports'

export default function App() {
  return (
    <CaseProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Layout />}>
            <Route path="overview" element={<Overview />} />
            <Route path="intake" element={<EvidenceIntake />} />
            <Route path="investigate" element={<AIVideoInvestigation />} />
            <Route path="timeline" element={<TimelineAnalysis />} />
            <Route path="reports" element={<Reports />} />
            <Route path="architecture" element={<Architecture />} />
          </Route>
        </Routes>
      </ToastProvider>
    </CaseProvider>
  )
}
