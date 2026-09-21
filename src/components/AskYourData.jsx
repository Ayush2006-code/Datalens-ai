import { useState } from 'react'
import { Send, MessageCircleQuestion, Loader2 } from 'lucide-react'
import { analyzeDataQuestion, isRemoteAIConfigured } from '../services/ai.js'
import ChartCard from './ChartCard.jsx'

const EXAMPLES = [
  'What were my total sales?',
  'Which region generated the most revenue?',
  'Show monthly revenue',
  'Top 5 products by revenue',
]

export default function AskYourData({ sheet, columnProfiles }) {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  async function ask(q) {
    const text = (q ?? question).trim()
    if (!text || loading) return
    setLoading(true)
    setQuestion('')
    const result = await analyzeDataQuestion(text, sheet, columnProfiles)
    setHistory((h) => [...h, { question: text, ...result }])
    setLoading(false)
  }

  return (
    <div className="rounded-xl2 border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-ink flex items-center gap-2">
          <MessageCircleQuestion size={15} className="text-accent" /> Ask your data
        </h3>
        {!isRemoteAIConfigured() && <span className="text-[11px] text-ink-faint">Local calculation engine</span>}
      </div>
      <p className="text-xs text-ink-muted mb-4">Ask a question about this sheet in plain English.</p>

      {history.length === 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => ask(ex)}
              className="text-xs rounded-full border border-border px-3 py-1.5 text-ink-muted hover:text-ink hover:border-accent/40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 mb-4 max-h-[420px] overflow-y-auto pr-1">
          {history.map((item, i) => (
            <div key={i} className="dl-enter">
              <p className="text-sm font-medium text-ink mb-1.5">{item.question}</p>
              <p className="text-sm text-ink-muted leading-relaxed">{item.answer}</p>
              {item.chart && (
                <div className="mt-3">
                  <ChartCard chart={{ id: `ask-${i}`, ...item.chart }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask()
        }}
        className="flex items-center gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your data anything..."
          className="flex-1 text-sm rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="h-10 w-10 shrink-0 rounded-lg bg-accent hover:bg-accent-strong disabled:opacity-50 text-white flex items-center justify-center transition-colors"
          aria-label="Ask"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}
