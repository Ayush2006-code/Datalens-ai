import { Link } from 'react-router-dom'
import { Sparkles, SlidersHorizontal, MessageCircleQuestion, UploadCloud, ScanSearch, LayoutDashboard } from 'lucide-react'

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Auto-generated dashboards',
    body: 'DataLens reads every column, figures out what it means, and lays out KPIs and charts on its own — no chart-picking required.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Live filters, everywhere',
    body: 'Slice by date, region, or category and watch every KPI, chart, and table row update together, instantly.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Ask your data questions',
    body: 'Type a question in plain English — "which region sold the most?" — and get a calculated answer, not a guess.',
  },
]

const STEPS = [
  { icon: UploadCloud, title: 'Upload a workbook', body: 'Drop in an Excel, CSV, or ODS file, or start from a sample sales dataset.' },
  { icon: ScanSearch, title: 'DataLens profiles it', body: 'Every column is typed, measured, and checked for gaps or duplicates in seconds.' },
  { icon: Sparkles, title: 'Your dashboard is ready', body: 'KPIs, charts, insights, and filters appear automatically, built from what your data actually contains.' },
]

function DashboardPreview() {
  const bars = [38, 62, 45, 80, 54, 70, 90, 58]
  return (
    <div className="relative rounded-xl2 border border-border bg-surface-raised shadow-panel p-5 w-full max-w-[480px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-ink-faint font-mono">Sales workbook</p>
          <p className="text-sm text-ink font-medium">Q3 performance</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-accent" />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Revenue', value: '₹12.4L', trend: '+18%' },
          { label: 'Orders', value: '1,284', trend: '+6%' },
          { label: 'Customers', value: '412', trend: '+11%' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-surface-sunken border border-border p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">{k.label}</p>
            <p className="text-sm font-mono text-ink mt-1">{k.value}</p>
            <p className="text-[11px] text-accent mt-0.5">{k.trend}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-surface-sunken border border-border p-3 h-32 flex items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-accent/90 to-accent/40" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
        <MessageCircleQuestion size={14} className="text-accent shrink-0" />
        <p className="text-xs text-ink-muted truncate">"Which region generated the most revenue?"</p>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-semibold text-lg">
            <div className="h-7 w-7 rounded-md bg-accent/15 text-accent flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            DataLens AI
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-ink-muted">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-ink-muted hover:text-ink transition-colors">Sign in</Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-accent text-white rounded-lg px-4 py-2 hover:bg-accent-strong transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="dl-enter">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent-soft rounded-full px-3 py-1 mb-5">
              <Sparkles size={12} /> Spreadsheet intelligence
            </p>
            <h1 className="font-display text-4xl md:text-[2.75rem] leading-[1.1] font-semibold tracking-tight text-ink">
              Turn any spreadsheet into a dashboard, instantly.
            </h1>
            <p className="mt-5 text-ink-muted text-base leading-relaxed max-w-md">
              Upload a workbook. DataLens profiles every column and builds the KPIs, charts, insights, and filters for you — no
              setup required.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="bg-accent hover:bg-accent-strong transition-colors text-white font-medium rounded-lg px-5 py-3 text-sm"
              >
                Upload your workbook
              </Link>
              <Link
                to="/signup?demo=1"
                className="border border-border hover:border-accent/50 transition-colors text-ink font-medium rounded-lg px-5 py-3 text-sm"
              >
                Try demo data
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end dl-enter">
            <DashboardPreview />
          </div>
        </section>

        <section id="features" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-2xl font-semibold mb-10 max-w-md">Everything the dashboard needs, none of the setup.</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl2 border border-border bg-surface-raised p-6">
                  <div className="h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center mb-4">
                    <f.icon size={18} />
                  </div>
                  <h3 className="font-medium text-ink mb-2">{f.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-2xl font-semibold mb-10 max-w-md">From spreadsheet to dashboard in three steps.</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((s, i) => (
                <div key={s.title} className="relative pl-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-ink-muted">
                      <s.icon size={16} />
                    </div>
                    <span className="text-xs font-mono text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-medium text-ink mb-1.5">{s.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold mb-3">Free while in preview</h2>
            <p className="text-ink-muted max-w-md mx-auto mb-8">
              Create an account, upload a workbook, and start exploring your dashboard in under a minute.
            </p>
            <Link
              to="/signup"
              className="inline-block bg-accent hover:bg-accent-strong transition-colors text-white font-medium rounded-lg px-6 py-3 text-sm"
            >
              Create your workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
          <span>© {new Date().getFullYear()} DataLens AI</span>
          <span>Built with React, Vite, and Recharts</span>
        </div>
      </footer>
    </div>
  )
}
