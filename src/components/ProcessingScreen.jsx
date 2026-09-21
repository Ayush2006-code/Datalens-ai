import { Check, Loader2, Sparkles } from 'lucide-react'

export default function ProcessingScreen({ label, steps }) {
  return (
    <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-sm dl-enter">
        <div className="flex items-center gap-2 font-display font-semibold text-lg mb-8 justify-center">
          <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          DataLens AI
        </div>
        <p className="text-center text-sm text-ink-muted mb-6">{label || 'Analyzing your workbook...'}</p>
        <div className="space-y-2.5">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-accent text-white' : 'border border-border'
                }`}
              >
                {step.done ? <Check size={12} /> : <Loader2 size={11} className="animate-spin text-ink-faint" />}
              </div>
              <span className={`text-sm ${step.done ? 'text-ink' : 'text-ink-faint'}`}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
