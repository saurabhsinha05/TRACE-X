import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

interface ToastMsg {
  id: number
  message: string
  kind: 'success' | 'warning' | 'info'
}

interface ToastCtx {
  push: (message: string, kind?: ToastMsg['kind']) => void
}

const Ctx = createContext<ToastCtx>({ push: () => {} })

export const useToast = () => useContext(Ctx)

const icons = {
  success: <CheckCircle2 size={16} className="text-signal-green" />,
  warning: <AlertTriangle size={16} className="text-signal-amber" />,
  info: <Info size={16} className="text-signal-blue" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const push = useCallback((message: string, kind: ToastMsg['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div key={t.id} className="panel-glass px-3.5 py-3 flex items-start gap-2.5 shadow-panel animate-[fadeIn_.15s_ease]">
            {icons[t.kind]}
            <p className="text-sm text-ink flex-1">{t.message}</p>
            <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} className="text-ink-faint hover:text-ink">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
