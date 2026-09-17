import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Upload, Database, Truck, Shield, Zap, FileText,
  ChevronRight, ChevronDown, TrendingDown, AlertTriangle, CheckCircle,
  Clock, RefreshCw, Eye, Check, X, Filter, Search, Download,
  Plus, BarChart3, Leaf, Building2, ArrowRight, Lock,
  File, Info, Star, FileSpreadsheet, CheckSquare
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  getCarbonSummary, getCarbonActivities, uploadCarbonCSV,
  getSuppliers,
  getVerificationEntries, validateVerification, getVerificationSummary,
  tamperVerificationEntry, resetVerificationLedger,
  runOptimization, getAIExplanation,
  getBRSRReport, signReport, getReportSigning, downloadReportPDF,
  type CarbonSummary, type CarbonActivity, type CarbonCSVUploadResponse,
  type SupplierRecord,
  type VerificationEntry, type VerificationResult, type VerificationSummary,
  type OptimizationResponse,
  type AIExplanationResponse,
  type BRSRReportResponse,
  type ReportSignResponse,
} from './api'

// ─── Constants ────────────────────────────────────────────────────────────────
const COMPANY_ID = 1

type Screen = 'dashboard' | 'upload' | 'carbon' | 'suppliers' | 'verification' | 'optimizer' | 'report' | 'signing'

// ─── Shared primitives ────────────────────────────────────────────────────────

function PrimaryBadge() {
  return <span className="badge-primary">PRIMARY</span>
}
function EstimatedBadge() {
  return <span className="badge-estimated">ESTIMATED</span>
}
function FlaggedBadge() {
  return <span className="badge-flagged">FLAGGED</span>
}

function KpiCard({ label, value, unit, sub, color = 'emerald', icon }: {
  label: string; value: string; unit?: string; sub?: string; color?: string; icon?: React.ReactNode
}) {
  const borderColors: Record<string, string> = {
    emerald: 'border-l-emerald-600',
    amber: 'border-l-amber-500',
    blue: 'border-l-blue-500',
    violet: 'border-l-violet-500',
    rose: 'border-l-rose-500',
  }
  return (
    <div className={`ct-card p-5 border-l-4 ${borderColors[color] || 'border-l-emerald-600'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-900">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {icon && <div className="text-slate-300 mt-0.5">{icon}</div>}
      </div>
    </div>
  )
}

function ConfidenceBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? '#059669' : pct >= 65 ? '#d97706' : '#dc2626'
  return (
    <div className="flex items-center gap-2">
      <div className="progress-bar w-16">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-slate-600">{pct}%</span>
    </div>
  )
}

// ─── Loading / Error / Empty helpers ─────────────────────────────────────────

function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', flexDirection: 'column', gap: 12 }}>
      <RefreshCw size={22} color="#059669" className="animate-spin" />
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <AlertTriangle size={16} color="#dc2626" />
      <span style={{ fontSize: 13, color: '#991b1b' }}>{message}</span>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>{label}</div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload & Ingest', icon: Upload },
  { id: 'carbon', label: 'Carbon Data', icon: Database },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'verification', label: 'Verification', icon: Shield },
  { id: 'optimizer', label: 'Optimizer', icon: Zap },
  { id: 'report', label: 'BRSR Report', icon: FileText },
  { id: 'signing', label: 'Sign & Approve', icon: Lock },
]

function Sidebar({ active, onNav }: { active: Screen; onNav: (s: Screen) => void }) {
  return (
    <aside style={{ width: 240, minWidth: 240, background: '#0f172a', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={16} color="white" />
          </div>
          <span className="font-display text-white font-semibold text-lg" style={{ letterSpacing: '-0.01em' }}>CarbonTrace</span>
        </div>
        <p style={{ fontSize: 10, color: '#64748b', marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>Carbon Intelligence</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id as Screen)}
              className={`sidebar-item ${isActive ? 'sidebar-active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, width: '100%', textAlign: 'left',
                color: isActive ? '#34d399' : '#94a3b8', fontWeight: isActive ? 500 : 400,
                fontSize: 13.5, cursor: 'pointer', background: 'none', border: 'none',
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 30, height: 30, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={14} color="#64748b" />
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>Demo Industries India</p>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>FY 2024–25 · Prototype</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ title, sub, onNav }: { title: string; sub?: string; onNav?: () => void }) {
  return (
    <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="flex items-center gap-2">
        {onNav && <button onClick={onNav} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /></button>}
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{title}</h1>
          {sub && <p style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 500, color: '#334155' }}>Demo Industries India Pvt. Ltd.</span>
          <span style={{ color: '#cbd5e1' }}>·</span>
          <span>FY 2024–25</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1: Dashboard — connected to real backend data
// ─────────────────────────────────────────────────────────────────────────────

function Dashboard({ onNav }: { onNav: (s: Screen) => void }) {
  const [summary, setSummary] = useState<CarbonSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCarbonSummary(COMPANY_ID)
      .then(setSummary)
      .catch(e => setError(e.message ?? 'Failed to load carbon summary'))
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    { label: 'Upload Data', icon: Upload, screen: 'upload' as Screen, color: '#059669' },
    { label: 'Review Carbon Data', icon: Database, screen: 'carbon' as Screen, color: '#3b82f6' },
    { label: 'View Suppliers', icon: Truck, screen: 'suppliers' as Screen, color: '#8b5cf6' },
    { label: 'Verify Ledger', icon: Shield, screen: 'verification' as Screen, color: '#f59e0b' },
    { label: 'Optimizer', icon: Zap, screen: 'optimizer' as Screen, color: '#ef4444' },
    { label: 'BRSR Report', icon: FileText, screen: 'report' as Screen, color: '#0ea5e9' },
  ]

  const fmt = (n: number) => (n / 1000).toFixed(1)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440 }}>
      {/* Hero strip */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
          Carbon Intelligence Dashboard
        </h2>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          GHG Protocol-aligned prototype · Company ID {COMPANY_ID}
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading carbon summary…" />}
      {error && !loading && <ErrorBanner message={error} />}

      {!loading && summary && (
        <>
          {/* Primary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="ct-card p-5" style={{ borderLeft: '4px solid #0f172a', gridColumn: '1' }}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Emissions</p>
              <div className="flex items-baseline gap-1.5">
                <span style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
                  {fmt(summary.total_emissions_kgco2e)}
                </span>
                <span style={{ fontSize: 13, color: '#64748b' }}>tCO₂e</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <TrendingDown size={12} color="#059669" />
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>GHG Protocol-aligned</span>
              </div>
            </div>
            <KpiCard
              label="Primary Emissions"
              value={fmt(summary.primary_emissions_kgco2e)}
              unit="tCO₂e"
              sub="Direct measurement data"
              color="emerald"
              icon={<BarChart3 size={20} />}
            />
            <KpiCard
              label="Estimated Emissions"
              value={fmt(summary.estimated_emissions_kgco2e)}
              unit="tCO₂e"
              sub="Modelled / factor-based"
              color="blue"
              icon={<BarChart3 size={20} />}
            />
            <KpiCard
              label="Primary Data %"
              value={`${summary.primary_data_percentage.toFixed(1)}`}
              unit="%"
              sub="Of total emission sources"
              color="violet"
              icon={<BarChart3 size={20} />}
            />
          </div>

          {/* Secondary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <KpiCard label="Data Quality Score" value={`${summary.primary_data_percentage.toFixed(0)}`} unit="%" sub="Primary data coverage" color="emerald" />
            <KpiCard label="Flagged Records" value={`${summary.flagged_entries_count}`} sub="Needs review" color="rose" />
            <KpiCard label="Company ID" value={`${summary.company_id}`} sub="Demo dataset" color="amber" />
            <KpiCard label="Reporting Period" value="FY 2024–25" sub="Current year" color="blue" />
          </div>
        </>
      )}

      {/* Chart + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        <div className="ct-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Emissions Breakdown</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Primary vs Estimated — tCO₂e</p>
            </div>
          </div>
          {summary ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'Primary', value: summary.primary_emissions_kgco2e / 1000 },
                  { name: 'Estimated', value: summary.estimated_emissions_kgco2e / 1000 },
                ]}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v) => [`${String(v)} tCO₂e`, 'Emissions']} />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
              <span style={{ fontSize: 13 }}>No data</span>
            </div>
          )}
        </div>

        <div className="ct-card p-5">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Quick Actions</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Jump to a key module</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {quickActions.map(a => {
              const Icon = a.icon
              return (
                <button key={a.label} className="quick-action" onClick={() => onNav(a.screen)}>
                  <div style={{ width: 32, height: 32, background: `${a.color}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color={a.color} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: '#334155' }}>{a.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Upload & Ingest (Structured CSV Flow)
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CSV = `activity_type,activity_quantity,activity_unit,is_primary,emission_factor
grid_electricity,45000,kWh,true,0.716
diesel_fleet,1200,litres,true,2.68
natural_gas,3500,m3,true,1.90
freight_transport,8500,tkm,false,0.115
raw_materials_steel,25,tonnes,true,1820.0
packaging_corrugated,3000,kg,false,0.94`

function UploadAnalyze({ onNav }: { onNav: (s: Screen) => void }) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [parsedPreview, setParsedPreview] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<CarbonCSVUploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfNotice, setPdfNotice] = useState(false)

  const handleFileSelect = (file: File) => {
    setError(null)
    setUploadResult(null)
    setPdfNotice(false)

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setPdfNotice(true)
      setFileName(file.name)
      setFileContent('')
      setParsedPreview([])
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv structured data file.')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      setFileContent(text)
      parsePreview(text)
    }
    reader.readAsText(file)
  }

  const parsePreview = (text: string) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1, 6).map(line => {
      const cols = line.split(',').map(c => c.trim())
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = cols[i] || '' })
      return obj
    })
    setParsedPreview(rows)
  }

  const handleLoadSample = () => {
    setFileName('sample_activity_batch.csv')
    setFileContent(SAMPLE_CSV)
    setPdfNotice(false)
    setError(null)
    setUploadResult(null)
    parsePreview(SAMPLE_CSV)
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'carbontrace_sample_activity_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExecuteUpload = () => {
    if (!fileContent.trim()) {
      setError('No CSV content to upload.')
      return
    }
    setUploading(true)
    setError(null)
    uploadCarbonCSV({
      company_id: COMPANY_ID,
      filename: fileName || 'uploaded_activity_batch.csv',
      content: fileContent,
    })
      .then((res) => {
        setUploadResult(res)
      })
      .catch((e) => {
        setError(e.message ?? 'CSV ingestion failed')
      })
      .finally(() => setUploading(false))
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', marginBottom: 8, lineHeight: 1.25 }}>
          Structured Data Ingestion &amp; Calculation
        </h2>
        <p style={{ fontSize: 14.5, color: '#475569', maxWidth: 680, lineHeight: 1.65 }}>
          Upload verified corporate activity logs (CSV). CarbonTrace deterministically calculates emissions
          via published GHG factors (activity_quantity × emission_factor) and cryptographically registers each entry in the SHA-256 hash-chain ledger.
        </p>
      </div>

      {pdfNotice && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Info size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
              Prototype Scope Notice: PDF Ingestion is Out of Scope
            </p>
            <p style={{ fontSize: 12.5, color: '#b45309', lineHeight: 1.6 }}>
              CarbonTrace relies on deterministic, verifiable calculation from structured data. PDF parsing and LLM document extraction are intentionally out of scope to avoid hallucinated factors. Please upload a structured CSV file or use the sample template below.
            </p>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {/* Upload zone */}
      <div
        className="drop-zone"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0])
          }
        }}
        style={{
          border: dragging ? '2px dashed #059669' : '2px dashed #cbd5e1',
          background: dragging ? '#f0fdf4' : '#fafafa',
          borderRadius: 16, padding: '40px 32px', textAlign: 'center', marginBottom: 24
        }}
      >
        <div style={{ width: 52, height: 52, background: '#f1f5f9', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <FileSpreadsheet size={24} color="#059669" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
          {fileName ? `Selected: ${fileName}` : 'Drop structured CSV file here'}
        </h3>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18 }}>
          Required columns: activity_type, activity_quantity, activity_unit, is_primary, emission_factor
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Upload size={14} /> Browse CSV File
            <input
              type="file"
              accept=".csv,.pdf"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0])
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleLoadSample}
            style={{ background: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Star size={14} color="#059669" /> Load Sample Activity Batch
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={13} /> Download Template
          </button>
        </div>
      </div>

      {/* Preview table if file is loaded */}
      {parsedPreview.length > 0 && !uploadResult && (
        <div className="ct-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Preview Data Rows ({fileName})</h3>
              <p style={{ fontSize: 12, color: '#64748b' }}>Ready for deterministic emissions calculation and SHA-256 ledger registration</p>
            </div>
            <button
              onClick={handleExecuteUpload}
              disabled={uploading}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {uploading ? <><RefreshCw size={13} className="animate-spin" /> Ingesting &amp; Calculating…</> : <><Zap size={13} /> Ingest &amp; Calculate Emissions</>}
            </button>
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Activity Type', 'Quantity', 'Unit', 'Primary Data', 'Emission Factor'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedPreview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>{row.activity_type || row.activity}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{row.activity_quantity || row.quantity}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.activity_unit || row.unit}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {String(row.is_primary).toLowerCase() === 'true' ? <PrimaryBadge /> : <EstimatedBadge />}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{row.emission_factor || 'Default standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success banner and newly imported records */}
      {uploadResult && (
        <div className="ct-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', border: '1px solid #86efac' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 36, height: 36, background: '#dcfce7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#065f46' }}>Ingestion &amp; Calculation Complete!</h3>
              <p style={{ fontSize: 12.5, color: '#047857' }}>{uploadResult.message}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="bg-white p-3 rounded-lg border border-emerald-100">
              <p style={{ fontSize: 11, color: '#64748b' }}>Activities Ingested</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{uploadResult.activities_imported}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-100">
              <p style={{ fontSize: 11, color: '#64748b' }}>Calculated Total</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{(uploadResult.total_emissions_kgco2e / 1000).toFixed(2)} tCO₂e</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-100">
              <p style={{ fontSize: 11, color: '#64748b' }}>Primary vs Estimated</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{uploadResult.primary_activities_count} Primary / {uploadResult.estimated_activities_count} Est.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-100">
              <p style={{ fontSize: 11, color: '#64748b' }}>Ledger Blocks Registered</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{uploadResult.ledger_entries_registered} Blocks</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onNav('carbon')}
              style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Database size={13} /> View in Carbon Data
            </button>
            <button
              onClick={() => onNav('verification')}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Shield size={13} /> Verify in Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Carbon Data — connected to real backend
// ─────────────────────────────────────────────────────────────────────────────

function CarbonData() {
  const [activities, setActivities] = useState<CarbonActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    getCarbonActivities(COMPANY_ID)
      .then(setActivities)
      .catch(e => setError(e.message ?? 'Failed to load carbon activities'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Carbon Activity Records</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {loading ? 'Loading…' : error ? 'Error loading data' : `${activities.length} activity records in database`}
          </p>
        </div>
        <button
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Info size={14} color="#059669" />
        <span style={{ fontSize: 13, color: '#065f46' }}>
          <strong>{activities.length} carbon activities</strong> stored in PostgreSQL. Emissions calculated deterministically (quantity × factor) and anchored with SHA-256 hashes.
        </span>
      </div>

      {loading && <LoadingSpinner label="Loading carbon activities…" />}
      {error && !loading && <ErrorBanner message={error} />}
      {!loading && !error && activities.length === 0 && <EmptyState label="No carbon activities found. Use Upload & Ingest or Seed to add data." />}

      {!loading && !error && activities.length > 0 && (
        <div className="ct-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['ID', 'Activity Type', 'Quantity', 'Unit', 'Emissions (kgCO₂e)', 'Emissions (tCO₂e)', 'Data Quality', 'Flagged'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activities.map((r, i) => (
                <tr key={r.entry_id} className="ct-row" style={{ borderBottom: i < activities.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#94a3b8' }}>#{r.entry_id}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 500, color: '#1e293b' }}>{r.activity_type}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>{r.activity_quantity.toLocaleString()}</td>
                  <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{r.activity_unit}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                    {r.emissions_kgco2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', color: '#059669', fontSize: 12 }}>
                    {(r.emissions_kgco2e / 1000).toFixed(3)} t
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {r.is_primary ? <PrimaryBadge /> : <EstimatedBadge />}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    {r.is_flagged
                      ? <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={12} /> Flagged</span>
                      : <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} /> OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4: Suppliers — connected to real backend
// ─────────────────────────────────────────────────────────────────────────────

function Suppliers() {
  const [supplierList, setSupplierList] = useState<SupplierRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<SupplierRecord | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSuppliers(COMPANY_ID)
      .then(setSupplierList)
      .catch(e => setError(e.message ?? 'Failed to load suppliers'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = supplierList.filter(s =>
    s.supplier_name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' ||
      (filter === 'verified' && s.is_verified) ||
      (filter === 'unverified' && !s.is_verified))
  )

  return (
    <div style={{ padding: '28px 32px', display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Suppliers" value={`${supplierList.length}`} sub="In database" color="blue" />
          <KpiCard label="Verified" value={`${supplierList.filter(s => s.is_verified).length}`} sub="Confirmed" color="emerald" />
          <KpiCard label="Unverified" value={`${supplierList.filter(s => !s.is_verified).length}`} sub="Need attention" color="rose" />
          <KpiCard label="Company ID" value={`${COMPANY_ID}`} sub="Demo dataset" color="amber" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2" style={{ flex: 1, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
            <Search size={14} color="#94a3b8" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1e293b', background: 'transparent', width: '100%', fontFamily: 'inherit' }}
            />
          </div>
          {['all', 'verified', 'unverified'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: filter === f ? '#059669' : '#e2e8f0', background: filter === f ? '#059669' : 'white', color: filter === f ? 'white' : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading && <LoadingSpinner label="Loading suppliers…" />}
        {error && !loading && <ErrorBanner message={error} />}
        {!loading && !error && filtered.length === 0 && <EmptyState label="No suppliers found." />}

        {!loading && !error && filtered.length > 0 && (
          <div className="ct-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Supplier', 'Industry', 'Location', 'Verified', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.supplier_id} className="ct-row" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }} onClick={() => setSelected(s)}>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 28, height: 28, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                          {s.supplier_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{s.supplier_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.industry ?? '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.location ?? '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.is_verified
                        ? <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} /> Verified</span>
                        : <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> Pending</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}><ChevronRight size={14} color="#94a3b8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="ct-card" style={{ width: 320, flexShrink: 0, padding: 24, height: 'fit-content', position: 'sticky', top: 80 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Supplier Detail</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
          </div>
          <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
            {selected.supplier_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{selected.supplier_name}</h4>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{selected.industry ?? 'Unknown industry'}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Supplier ID', value: `#${selected.supplier_id}` },
              { label: 'Industry', value: selected.industry ?? '—' },
              { label: 'Location', value: selected.location ?? '—' },
              { label: 'Verified', value: selected.is_verified ? 'Yes' : 'No' },
            ].map(row => (
              <div key={row.label} className="flex justify-between" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5: Verification — Interactive SHA-256 Hash-Chain & Tamper Demo
// ─────────────────────────────────────────────────────────────────────────────

function Verification() {
  const [entries, setEntries] = useState<VerificationEntry[]>([])
  const [chainResult, setChainResult] = useState<VerificationResult | null>(null)
  const [summary, setSummary] = useState<VerificationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [tampering, setTampering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getVerificationEntries(),
      validateVerification(),
      getVerificationSummary(COMPANY_ID),
    ])
      .then(([e, r, s]) => {
        setEntries(e)
        setChainResult(r)
        setSummary(s)
        if (e.length > 0) setExpanded(e[0].entry_id)
      })
      .catch(e => setError(e.message ?? 'Failed to load verification data'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleValidate = () => {
    setValidating(true)
    validateVerification()
      .then(r => {
        setChainResult(r)
        getVerificationEntries().then(setEntries)
        getVerificationSummary(COMPANY_ID).then(setSummary)
      })
      .catch(e => setError(e.message))
      .finally(() => setValidating(false))
  }

  const handleTamper = (entryId = 2) => {
    setTampering(true)
    tamperVerificationEntry(entryId)
      .then(res => {
        setDemoNotice(`Tampered block #${entryId}: data_hash was modified without recalculating downstream blocks.`)
        // Immediate re-validation to demonstrate chain failure
        return validateVerification()
      })
      .then(r => {
        setChainResult(r)
        return Promise.all([getVerificationEntries(), getVerificationSummary(COMPANY_ID)])
      })
      .then(([e, s]) => {
        setEntries(e)
        setSummary(s)
        setExpanded(entryId)
      })
      .catch(e => setError(e.message))
      .finally(() => setTampering(false))
  }

  const handleReset = () => {
    setLoading(true)
    setDemoNotice('Ledger reset back to clean, cryptographically verified seed state.')
    resetVerificationLedger()
      .then(() => loadData())
      .catch(e => { setError(e.message); setLoading(false) })
  }

  const truncateHash = (h: string) => h && h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : (h || '—')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* Chain status banner */}
      <div style={{
        background: chainResult?.is_verified
          ? 'linear-gradient(135deg, #022c22, #064e3b)'
          : 'linear-gradient(135deg, #450a0a, #7f1d1d)',
        borderRadius: 14, padding: '22px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: chainResult?.is_verified ? '0 4px 14px rgba(5,150,105,0.2)' : '0 4px 14px rgba(220,38,38,0.25)'
      }}>
        <div className="flex items-center gap-4">
          <div style={{ width: 46, height: 46, background: 'rgba(255,255,255,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color={chainResult?.is_verified ? '#34d399' : '#f87171'} />
          </div>
          <div>
            {loading
              ? <span style={{ fontSize: 13, color: '#94a3b8' }}>Validating cryptographic ledger…</span>
              : chainResult
                ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 13, fontWeight: 700, color: chainResult.is_verified ? '#34d399' : '#fca5a5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {chainResult.is_verified ? '✓ CHAIN INTACT' : '✗ CHAIN COMPROMISED (TAMPER DETECTED)'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: chainResult.is_verified ? '#6ee7b7' : '#fecaca', lineHeight: 1.4 }}>
                      {chainResult.message}
                    </p>
                  </>
                )
                : <span style={{ fontSize: 13, color: '#f87171' }}>Verification unavailable</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={validating}
            style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={12} className={validating ? 'animate-spin' : ''} /> {validating ? 'Validating…' : 'Validate Chain'}
          </button>
        </div>
      </div>

      {/* Interactive Tamper & Reset Demo Bar */}
      <div className="ct-card p-4 mb-5" style={{ background: '#fafafa', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>Interactive Pitch Demo: Tamper Evidence</p>
          <p style={{ fontSize: 11.5, color: '#64748b' }}>Simulate unauthorized modification of historical records to prove cryptographic detection.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleTamper(2)}
            disabled={tampering}
            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <AlertTriangle size={12} /> Tamper with Block #2
          </button>
          <button
            onClick={handleReset}
            style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={12} /> Reset Demo Ledger
          </button>
        </div>
      </div>

      {demoNotice && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#334155' }}>
          <strong>Notice:</strong> {demoNotice}
        </div>
      )}

      {/* Chain stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {summary ? (
          <>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{summary.total_entries}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Total Blocks</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-display)' }}>{summary.verified_entries}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Verified Valid</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: chainResult?.is_verified ? '#059669' : '#dc2626', fontFamily: 'var(--font-display)' }}>
                {summary.verification_percentage.toFixed(0)}%
              </p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Verification Score</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#6366f1', fontFamily: 'var(--font-display)' }}>
                {summary.primary_entries} / {summary.total_entries}
              </p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Primary Data Count</p>
            </div>
          </>
        ) : null}
      </div>

      {loading && <LoadingSpinner label="Loading ledger entries…" />}
      {error && !loading && <ErrorBanner message={error} />}

      {/* Block explorer */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((b) => {
            const isInvalid = chainResult?.invalid_entries.includes(b.entry_id)
            return (
              <div
                key={b.entry_id}
                className="block-card"
                style={{
                  border: isInvalid ? '1.5px solid #ef4444' : undefined,
                  background: isInvalid ? '#fff5f5' : 'white',
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ padding: '13px 18px', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === b.entry_id ? null : b.entry_id)}
                >
                  <div className="flex items-center gap-4">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lock size={12} color={isInvalid ? '#dc2626' : '#059669'} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: isInvalid ? '#dc2626' : '#059669', fontFamily: 'var(--font-mono)' }}>
                        Block #{b.entry_id}
                      </span>
                    </div>
                    <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                    <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{b.entry_type}</span>
                    <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                    {b.is_primary ? <PrimaryBadge /> : <EstimatedBadge />}
                  </div>
                  <div className="flex items-center gap-3">
                    {isInvalid ? (
                      <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={13} /> TAMPERED
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={13} /> VALID
                      </span>
                    )}
                    {expanded === b.entry_id ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                  </div>
                </div>

                {expanded === b.entry_id && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 18px', background: isInvalid ? '#fef2f2' : '#fafafa', borderRadius: '0 0 10px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Previous Block Hash</p>
                        <p className="hash-text">{b.previous_hash || '(GENESIS)'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Current Block Hash (SHA-256)</p>
                        <p className="hash-text" style={{ color: isInvalid ? '#dc2626' : '#059669' }}>{b.block_hash}</p>
                      </div>
                    </div>
                    <div style={{ background: isInvalid ? '#fee2e2' : '#f1f5f9', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Block Data Hash</p>
                      <p className="hash-text" style={{ color: '#334155' }}>{b.data_hash}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 6: Optimizer — connected to real PuLP/CBC backend
// ─────────────────────────────────────────────────────────────────────────────

function Optimizer() {
  const [targetPct, setTargetPct] = useState('10')
  const [budgetInr, setBudgetInr] = useState('500000')
  const [result, setResult] = useState<OptimizationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOptimize = () => {
    const target = parseFloat(targetPct)
    const budget = parseFloat(budgetInr.replace(/,/g, ''))
    if (isNaN(target) || target <= 0 || target > 100) {
      setError('Target reduction must be between 0.01% and 100%')
      return
    }
    setLoading(true)
    setError(null)
    runOptimization({
      company_id: COMPANY_ID,
      target_reduction_percentage: target,
      budget_inr: isNaN(budget) ? undefined : budget,
    })
      .then(setResult)
      .catch(e => setError(e.message ?? 'Optimization failed'))
      .finally(() => setLoading(false))
  }

  const chartData = result?.recommendations.map(r => ({
    name: r.action.length > 22 ? r.action.slice(0, 22) + '…' : r.action,
    abatement: parseFloat((r.estimated_reduction_kgco2e / 1000).toFixed(2)),
  })) ?? []

  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Decarbonization Optimizer</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Deterministic mixed-integer linear programming (MILP) using PuLP/CBC solver</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div>
          <div className="ct-card p-5 mb-5">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Target Reduction (%)
                </label>
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.1}
                  value={targetPct}
                  onChange={e => setTargetPct(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', width: '100%', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Budget (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={budgetInr}
                  onChange={e => setBudgetInr(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', width: '100%', outline: 'none' }}
                />
              </div>
            </div>
            <button
              onClick={handleOptimize}
              disabled={loading}
              style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <><RefreshCw size={13} className="animate-spin" /> Solving MILP…</> : <><Zap size={13} /> Run Optimizer</>}
            </button>
          </div>

          {error && <ErrorBanner message={error} />}

          {result && result.recommendations.length > 0 && (
            <div className="ct-card">
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Recommended Decarbonization Interventions</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{result.recommendations.length} selected by solver</span>
              </div>
              {result.recommendations.map((item, i) => (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < result.recommendations.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 24, height: 24, background: '#f0fdf4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>{item.priority}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{item.action}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                        −{(item.estimated_reduction_kgco2e / 1000).toFixed(2)} tCO₂e
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>₹{item.estimated_cost_inr.toLocaleString()} capex</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Priority: {item.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result && (
            <div className="ct-card p-5">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Optimization Summary</h3>
              {[
                { label: 'Current Emissions', value: `${(result.current_emissions_kgco2e / 1000).toFixed(2)} tCO₂e` },
                { label: 'Target Reduction', value: `${result.target_reduction_percentage}%` },
                { label: 'Optimized Reduction', value: `${(result.optimized_reduction_kgco2e / 1000).toFixed(2)} tCO₂e`, highlight: true },
                { label: 'Residual Emissions', value: `${(result.residual_emissions_kgco2e / 1000).toFixed(2)} tCO₂e` },
                { label: 'Budget Used', value: result.budget_used_inr ? `₹${result.budget_used_inr.toLocaleString()}` : '—' },
                { label: 'Target Achieved', value: result.target_achieved ? '✓ Yes' : '✗ No' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 12.5, color: '#64748b' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: (row as any).highlight ? '#059669' : '#1e293b', fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '8px 12px', background: result.target_achieved ? '#f0fdf4' : '#fef2f2', borderRadius: 6, border: `1px solid ${result.target_achieved ? '#bbf7d0' : '#fecaca'}` }}>
                <p style={{ fontSize: 12, color: result.target_achieved ? '#065f46' : '#991b1b', fontWeight: 500 }}>
                  {result.status}
                </p>
              </div>
            </div>
          )}

          {result && chartData.length > 0 && (
            <div className="ct-card p-5">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Abatement by Action (tCO₂e)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v) => [`${String(v)} tCO₂e`, "Abatement"]} />
                  <Bar dataKey="abatement" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7: BRSR Full Compliance Report
// ─────────────────────────────────────────────────────────────────────────────

function ReportView({ onNav }: { onNav: (s: Screen) => void }) {
  const [report, setReport] = useState<BRSRReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [regeneratingAI, setRegeneratingAI] = useState(false)

  const loadReport = useCallback(() => {
    setLoading(true)
    setError(null)
    getBRSRReport(COMPANY_ID)
      .then(setReport)
      .catch(e => setError(e.message ?? 'Failed to load BRSR report'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadReport() }, [loadReport])

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await downloadReportPDF(COMPANY_ID, `CarbonTrace_BRSR_Report_FY2024-25.pdf`)
    } catch (e: any) {
      setError(e.message ?? 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleRegenerateAI = () => {
    setRegeneratingAI(true)
    getAIExplanation({
      context_type: 'report',
      context_id: COMPANY_ID,
      question: 'Generate an executive corporate sustainability summary for the BRSR report based on current emissions and ledger verification.',
    })
      .then(res => {
        if (report) {
          setReport({
            ...report,
            executive_summary: res.explanation,
            is_ai_generated: !res.is_fallback,
            is_fallback_ai: res.is_fallback,
          })
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setRegeneratingAI(false))
  }

  const fmt = (n: number) => (n / 1000).toFixed(2)

  const pieData = report ? [
    { name: 'Scope 1 (Direct)', value: parseFloat((report.scope_1_emissions_kgco2e / 1000).toFixed(2)), color: '#0f172a' },
    { name: 'Scope 2 (Electricity)', value: parseFloat((report.scope_2_emissions_kgco2e / 1000).toFixed(2)), color: '#059669' },
    { name: 'Scope 3 (Supply Chain)', value: parseFloat((report.scope_3_emissions_kgco2e / 1000).toFixed(2)), color: '#3b82f6' },
  ].filter(p => p.value > 0) : []

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {loading && <LoadingSpinner label="Generating BRSR Compliance Report from database…" />}
      {error && !loading && <ErrorBanner message={error} />}

      {!loading && report && (
        <>
          {/* Report Header Banner */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: '36px 44px', marginBottom: 28, color: 'white' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Leaf size={16} color="#34d399" />
                  <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    CarbonTrace · {report.header.standard}
                  </span>
                </div>
                <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 8, lineHeight: 1.2 }}>
                  BRSR Core Greenhouse Gas Disclosure
                </h1>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>
                  {report.header.company_name} · Reporting Period: {report.header.reporting_period}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Report ID: <span style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{report.header.report_id}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} className={exporting ? 'animate-bounce' : ''} /> {exporting ? 'Generating PDF…' : 'Export PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: AI Executive Summary */}
          <div className="ct-card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star size={16} color="#059669" />
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>1. AI-Generated Executive Summary</h3>
                <span style={{ fontSize: 11, background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                  {report.is_ai_generated ? 'AI Narrative' : 'Deterministic Summary'}
                </span>
              </div>
              <button
                onClick={handleRegenerateAI}
                disabled={regeneratingAI}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={11} className={regeneratingAI ? 'animate-spin' : ''} /> Regenerate
              </button>
            </div>
            <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.7, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #f1f5f9' }}>
              {report.executive_summary}
            </p>
          </div>

          {/* Section 2: Emissions Inventory Table */}
          <div className="ct-card p-6 mb-6">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>2. Greenhouse Gas Inventory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'center' }}>
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Emission Scope', 'Emissions (tCO₂e)', 'Quality', '% of Total'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>Scope 1 (Direct)</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(report.scope_1_emissions_kgco2e)}</td>
                      <td style={{ padding: '10px 12px' }}><PrimaryBadge /></td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {((report.scope_1_emissions_kgco2e / (report.total_emissions_kgco2e || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>Scope 2 (Electricity)</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(report.scope_2_emissions_kgco2e)}</td>
                      <td style={{ padding: '10px 12px' }}><PrimaryBadge /></td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {((report.scope_2_emissions_kgco2e / (report.total_emissions_kgco2e || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>Scope 3 (Supply Chain)</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(report.scope_3_emissions_kgco2e)}</td>
                      <td style={{ padding: '10px 12px' }}><EstimatedBadge /></td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {((report.scope_3_emissions_kgco2e / (report.total_emissions_kgco2e || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                      <td style={{ padding: '10px 12px', color: '#065f46' }}>Total Gross Emissions</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: '#065f46' }}>{fmt(report.total_emissions_kgco2e)}</td>
                      <td style={{ padding: '10px 12px', color: '#065f46' }}>{report.primary_data_percentage.toFixed(1)}% Primary</td>
                      <td style={{ padding: '10px 12px', color: '#065f46' }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {pieData.length > 0 && (
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${String(v)} tCO₂e`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Value Chain Suppliers */}
          <div className="ct-card p-6 mb-6">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 14 }}>3. Scope 3 Supplier Disclosures</h3>
            {report.top_suppliers.length > 0 ? (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Supplier Name', 'Industry', 'Location', 'Emissions (tCO₂e)', 'Data Type', 'Verified'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_suppliers.map((s) => (
                      <tr key={s.supplier_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 500, color: '#1e293b' }}>{s.supplier_name}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{s.industry || '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{s.location || '—'}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(s.emissions_kgco2e)}</td>
                        <td style={{ padding: '9px 12px' }}>{s.is_primary ? <PrimaryBadge /> : <EstimatedBadge />}</td>
                        <td style={{ padding: '9px 12px' }}>
                          {s.is_verified
                            ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Verified</span>
                            : <span style={{ fontSize: 11, color: '#d97706' }}>Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8' }}>No supplier records logged.</p>
            )}
          </div>

          {/* Section 4: Cryptographic Verification */}
          <div className="ct-card p-6 mb-6">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>4. Cryptographic Verification &amp; Trust</h3>
            <div style={{ background: report.hash_chain_valid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${report.hash_chain_valid ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, padding: 16 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 13, fontWeight: 700, color: report.hash_chain_valid ? '#065f46' : '#991b1b' }}>
                  {report.hash_chain_valid ? '✓ SHA-256 HASH-CHAIN INTACT & VERIFIED' : '✗ HASH-CHAIN COMPROMISED'}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {report.verification_summary.total_entries} Blocks · {report.verification_summary.verification_percentage.toFixed(0)}% Integrity Score
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: report.hash_chain_valid ? '#047857' : '#b91c1c', lineHeight: 1.6 }}>
                All calculations and supplier records are cryptographically sealed. Each ledger block hash depends on the preceding block hash.
              </p>
            </div>
          </div>

          {/* Section 5: Decarbonization Action Plan */}
          <div className="ct-card p-6 mb-6">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>5. Decarbonization Action Plan (Optimizer)</h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
              Target Reduction: <strong>{report.decarbonization_plan.target_reduction_percentage}%</strong> ·
              Optimized Abatement: <strong>{fmt(report.decarbonization_plan.optimized_reduction_kgco2e)} tCO₂e</strong> ·
              Budget Used: <strong>₹{report.decarbonization_plan.budget_used_inr.toLocaleString()}</strong>
            </p>
            {report.decarbonization_plan.recommendations.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                <span style={{ fontSize: 13, color: '#1e293b' }}>P{r.priority}: {r.action}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', fontFamily: 'var(--font-mono)' }}>
                  −{fmt(r.estimated_reduction_kgco2e)} tCO₂e (₹{r.estimated_cost_inr.toLocaleString()})
                </span>
              </div>
            ))}
          </div>

          {/* Section 6: Governance & Sign-off */}
          <div className="ct-card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>6. Governance &amp; Application Approval</h3>
              {!report.approval && (
                <button
                  onClick={() => onNav('signing')}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Go to Signing Page
                </button>
              )}
            </div>

            {report.approval ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16 }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare size={16} color="#059669" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>SIGNED &amp; APPROVED</span>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>{report.approval.signed_at}</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#334155', marginBottom: 6 }}>
                  Signer: <strong>{report.approval.signer_name}</strong> ({report.approval.signer_role})
                </p>
                <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  Signature Digest (SHA-256): {report.approval.signature_hash}
                </p>
              </div>
            ) : (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 12.5, color: '#92400e' }}>
                  Status: <strong>PENDING SIGN-OFF</strong>. Review the disclosure and use the Sign &amp; Approve screen to record application-level approval.
                </p>
              </div>
            )}
          </div>

          {/* Section 7: Prototype Disclaimer */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, marginBottom: 28 }}>
            <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.6, fontStyle: 'italic' }}>
              <strong>Notice:</strong> {report.disclaimer}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8: Signing / Local Corporate Approval
// ─────────────────────────────────────────────────────────────────────────────

function SigningView({ onNav }: { onNav: (s: Screen) => void }) {
  const [summary, setSummary] = useState<CarbonSummary | null>(null)
  const [verSummary, setVerSummary] = useState<VerificationSummary | null>(null)
  const [signerName, setSignerName] = useState('Dr. Rajesh Sharma')
  const [signerRole, setSignerRole] = useState('Chief Sustainability Officer & VP ESG')
  const [notes, setNotes] = useState('Reviewed inventory and supplier verification records.')
  const [confirmed, setConfirmed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signResult, setSignResult] = useState<ReportSignResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCarbonSummary(COMPANY_ID),
      getVerificationSummary(COMPANY_ID),
      getReportSigning(COMPANY_ID).catch(() => null),
    ])
      .then(([s, v, sign]) => {
        setSummary(s)
        setVerSummary(v)
        if (sign) setSignResult(sign)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSign = () => {
    if (!confirmed) {
      setError('You must confirm and check the verification box before signing.')
      return
    }
    setSigning(true)
    setError(null)
    signReport({
      company_id: COMPANY_ID,
      signer_name: signerName,
      signer_role: signerRole,
      is_confirmed: true,
      notes: notes,
    })
      .then(res => {
        setSignResult(res)
      })
      .catch(e => setError(e.message ?? 'Signing failed'))
      .finally(() => setSigning(false))
  }

  const fmt = (n: number) => (n / 1000).toFixed(2)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
          Report Sign-off &amp; Application Approval
        </h2>
        <p style={{ fontSize: 13.5, color: '#64748b' }}>
          Execute formal application-level corporate sign-off for Demo Industries India Pvt. Ltd. (FY 2024–25).
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading disclosure review data…" />}
      {error && <ErrorBanner message={error} />}

      {!loading && summary && verSummary && (
        <>
          {/* Disclosure Summary Review Box */}
          <div className="ct-card p-5 mb-6" style={{ background: '#f8fafc' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Emissions &amp; Verification State to Approve</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p style={{ fontSize: 11, color: '#64748b' }}>Gross Emissions</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{fmt(summary.total_emissions_kgco2e)} tCO₂e</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p style={{ fontSize: 11, color: '#64748b' }}>Primary Data</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#059669' }}>{summary.primary_data_percentage.toFixed(1)}%</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p style={{ fontSize: 11, color: '#64748b' }}>Ledger Blocks</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#3b82f6' }}>{verSummary.total_entries} Sealed</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <p style={{ fontSize: 11, color: '#64748b' }}>Integrity Score</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#059669' }}>{verSummary.verification_percentage.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Form / Signature state */}
          {signResult ? (
            <div className="ct-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ffffff)', border: '1px solid #86efac' }}>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ width: 44, height: 44, background: '#dcfce7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} color="#059669" />
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    SIGNED &amp; APPROVED
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#065f46' }}>Report Successfully Approved</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18, background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ fontSize: 11, color: '#64748b' }}>Authorized Signatory</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{signResult.signer_name}</p>
                  <p style={{ fontSize: 11.5, color: '#64748b' }}>{signResult.signer_role}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#64748b' }}>Report ID &amp; Timestamp</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{signResult.report_id}</p>
                  <p style={{ fontSize: 11.5, color: '#64748b' }}>{signResult.signed_at}</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <p style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                  Deterministic Approval Signature Digest (SHA-256)
                </p>
                <p className="hash-text" style={{ color: '#059669' }}>{signResult.signature_hash}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onNav('report')}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FileText size={14} /> View BRSR Report
                </button>
                <button
                  onClick={() => downloadReportPDF(COMPANY_ID)}
                  style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Export Signed PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="ct-card p-6">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Signatory Details &amp; Confirmation</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Signer Full Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Signer Role / Title</label>
                  <input
                    type="text"
                    value={signerRole}
                    onChange={e => setSignerRole(e.target.value)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>Approval Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', outline: 'none' }}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="checkbox"
                  id="confirmSign"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#059669', marginTop: 2, cursor: 'pointer' }}
                />
                <label htmlFor="confirmSign" style={{ fontSize: 12.5, color: '#334155', cursor: 'pointer', lineHeight: 1.5 }}>
                  <strong>Mandatory Confirmation:</strong> I confirm that the greenhouse gas emissions data, Scope 1/2/3 breakdown, and SHA-256 verification ledger records presented in this report have been reviewed and approved for corporate reporting period FY 2024–25.
                </label>
              </div>

              <button
                onClick={handleSign}
                disabled={signing || !confirmed}
                style={{
                  background: confirmed ? '#059669' : '#94a3b8',
                  color: 'white', border: 'none', borderRadius: 8, padding: '11px 26px', fontSize: 13.5, fontWeight: 600,
                  cursor: confirmed && !signing ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                {signing ? <><RefreshCw size={14} className="animate-spin" /> Signing &amp; Approving…</> : <><Lock size={14} /> Sign &amp; Approve Disclosure</>}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────────────────────────────────────

const tickerItems = [
  '✓ Grid Electricity (45,000 kWh) · Scope 2 · 32.22 tCO₂e',
  '✓ Fleet Diesel (1,200 L) · Scope 1 · 3.22 tCO₂e',
  '✓ Inbound Logistics (42,000 tkm) · 4.83 tCO₂e',
  '✓ Steel Batch JSW · PRIMARY data · 1.82 kgCO₂e/t',
  '⬡ Block #1 sealed · Hash-chain intact',
  '⬡ SHA-256 ledger verified · All entries OK',
]

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 600)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <div style={{
        flex: '0 0 55%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #020c18 0%, #042f1e 45%, #0a1628 100%)',
        display: 'flex', flexDirection: 'column', padding: '40px 52px'
      }}>
        <div className="flex items-center gap-3 mb-auto">
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={18} color="white" />
          </div>
          <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: 'white' }}>CarbonTrace</span>
        </div>

        <div style={{ marginTop: 60, marginBottom: 'auto' }}>
          <h1 className="font-display login-shimmer-text" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15, marginBottom: 18 }}>
            Verifiable Carbon Accounting &amp; BRSR Intelligence
          </h1>
          <p style={{ fontSize: 15.5, color: '#94a3b8', lineHeight: 1.75, maxWidth: 440, marginBottom: 36 }}>
            Deterministic Scope 1, 2 &amp; 3 emissions calculations, SHA-256 hash-chain verification audit trail, PuLP optimizer, and AI executive disclosure reporting.
          </p>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>100%</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Deterministic Math</p>
            </div>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>SHA-256</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Tamper-Evident Ledger</p>
            </div>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#34d399' }}>BRSR</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Export Ready</p>
            </div>
          </div>
        </div>

        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div className="animate-ticker" style={{ display: 'flex', gap: 48, whiteSpace: 'nowrap' }}>
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} style={{ fontSize: 11.5, color: '#475569', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#059669' }}>▸</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Sign In to CarbonTrace
          </h2>
          <p style={{ fontSize: 13.5, color: '#64748b', marginBottom: 28 }}>
            Enterprise Carbon Accounting &amp; Verification Platform
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Work Email</label>
              <input className="login-input" type="email" placeholder="sustainability@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
              <input className="login-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="login-btn" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Entering Workspace…' : 'Enter Demo Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────

const screenMeta: Record<Screen, { title: string; sub?: string }> = {
  dashboard: { title: 'Dashboard', sub: 'FY 2024–25 · GHG Protocol-aligned prototype' },
  upload: { title: 'Upload & Ingest', sub: 'Deterministic calculation & SHA-256 hash-chain ingestion from CSV' },
  carbon: { title: 'Carbon Data', sub: 'All emission records — stored in PostgreSQL' },
  suppliers: { title: 'Suppliers & Supply Chain', sub: 'Scope 3 value chain partners' },
  verification: { title: 'Verification Ledger', sub: 'Cryptographic SHA-256 hash-chain audit trail & tamper demo' },
  optimizer: { title: 'Decarbonization Optimizer', sub: 'PuLP/CBC mixed-integer linear programming solver' },
  report: { title: 'BRSR Compliance Report', sub: 'Demo Industries India Pvt. Ltd. · FY 2024–25' },
  signing: { title: 'Sign & Approve', sub: 'Application-level governance & cryptographic approval record' },
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />
  const meta = screenMeta[screen]

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard onNav={setScreen} />
      case 'upload': return <UploadAnalyze onNav={setScreen} />
      case 'carbon': return <CarbonData />
      case 'suppliers': return <Suppliers />
      case 'verification': return <Verification />
      case 'optimizer': return <Optimizer />
      case 'report': return <ReportView onNav={setScreen} />
      case 'signing': return <SigningView onNav={setScreen} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar active={screen} onNav={setScreen} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar
          title={meta.title}
          sub={meta.sub}
          onNav={screen !== 'dashboard' ? () => setScreen('dashboard') : undefined}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderScreen()}
        </main>
      </div>
    </div>
  )
}
