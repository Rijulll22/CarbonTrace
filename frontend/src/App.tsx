import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Upload, Database, Truck, Shield, Zap, FileText,
  ChevronRight, ChevronDown, TrendingDown, AlertTriangle, CheckCircle,
  Clock, RefreshCw, Eye, Edit2, Check, X, Filter, Search, Download,
  Plus, BarChart3, Leaf, Building2, ArrowRight, Hash, Lock, ExternalLink,
  FileSpreadsheet, File, Info, Star
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend, Area, AreaChart
} from 'recharts'
import {
  getCarbonSummary, getCarbonActivities,
  getSuppliers,
  getVerificationEntries, validateVerification, getVerificationSummary,
  runOptimization, getAIExplanation,
  type CarbonSummary, type CarbonActivity,
  type SupplierRecord,
  type VerificationEntry, type VerificationResult, type VerificationSummary,
  type OptimizationResponse,
  type AIExplanationResponse,
} from './api'

// ─── Constants ────────────────────────────────────────────────────────────────
const COMPANY_ID = 1

type Screen = 'dashboard' | 'upload' | 'processing' | 'review' | 'carbon' | 'suppliers' | 'verification' | 'optimizer' | 'report'

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
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
  { id: 'upload', label: 'Upload & Analyze', icon: Upload },
  { id: 'carbon', label: 'Carbon Data', icon: Database },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'verification', label: 'Verification', icon: Shield },
  { id: 'optimizer', label: 'Optimizer', icon: Zap },
  { id: 'report', label: 'Report', icon: FileText },
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
          const isActive = active === item.id || (active === 'processing' && item.id === 'upload') || (active === 'review' && item.id === 'carbon')
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
            <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>Meridian Industries</p>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>FY 2024–25</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ title, sub, onNav, showProcessing }: { title: string; sub?: string; onNav?: () => void; showProcessing?: boolean }) {
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
        {showProcessing && (
          <span style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', padding: '4px 10px', borderRadius: 20, border: '1px solid #bbf7d0' }}>
            <RefreshCw size={11} className="animate-spin" /> Processing 3 documents
          </span>
        )}
        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 500, color: '#334155' }}>Meridian Industries Ltd.</span>
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
    { label: 'Analyze Documents', icon: Upload, screen: 'upload' as Screen, color: '#059669' },
    { label: 'Review Carbon Data', icon: Database, screen: 'review' as Screen, color: '#3b82f6' },
    { label: 'View Suppliers', icon: Truck, screen: 'suppliers' as Screen, color: '#8b5cf6' },
    { label: 'Verify Ledger', icon: Shield, screen: 'verification' as Screen, color: '#f59e0b' },
    { label: 'Optimize', icon: Zap, screen: 'optimizer' as Screen, color: '#ef4444' },
    { label: 'Generate Report', icon: FileText, screen: 'report' as Screen, color: '#0ea5e9' },
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
            <KpiCard label="Reporting Year" value="FY24–25" sub="Current period" color="blue" />
          </div>
        </>
      )}

      {/* Chart + Quick Actions — always shown with static trend data */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        <div className="ct-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Emissions Breakdown</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Primary vs Estimated — kgCO₂e</p>
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
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Jump to a key workflow</p>
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

      {/* Recent activity — static demo section */}
      <div className="ct-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Recent Extraction Activity</h3>
          <button onClick={() => onNav('upload')} style={{ fontSize: 12, color: '#059669', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { doc: 'KSEB_Bill_Nov2024.pdf', type: 'Electricity Bill', scope: 2, records: 4, status: 'processed', time: '2h ago' },
            { doc: 'Fleet_Diesel_Oct2024.xlsx', type: 'Fleet Fuel Log', scope: 1, records: 12, status: 'processed', time: '5h ago' },
            { doc: 'Supplier_TataSteel_Q3.pdf', type: 'Supplier Report', scope: 3, records: 7, status: 'needs-review', time: '8h ago' },
            { doc: 'LPG_Invoices_Q2.pdf', type: 'Energy Invoice', scope: 1, records: 3, status: 'analyzing', time: '12h ago' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: 32, height: 32, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <File size={14} color="#64748b" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{row.doc}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{row.type} · {row.records} data points extracted</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>Scope {row.scope}</span>
                {row.status === 'processed' && <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}><CheckCircle size={13} /> Processed</span>}
                {row.status === 'analyzing' && <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}><RefreshCw size={13} /> Analyzing</span>}
                {row.status === 'needs-review' && <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12 }}><AlertTriangle size={13} /> Needs Review</span>}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Upload & Analyze (static — PDF ingestion is out of scope)
// ─────────────────────────────────────────────────────────────────────────────

const uploadedFiles = [
  { name: 'KSEB_Electricity_Bill_Nov2024.pdf', size: '1.2 MB', type: 'PDF', status: 'processed', scope: 2, records: 4 },
  { name: 'Fleet_Diesel_Log_Oct2024.xlsx', size: '840 KB', type: 'XLSX', status: 'processed', scope: 1, records: 12 },
  { name: 'Supplier_TataSteel_Q3_Report.pdf', size: '3.4 MB', type: 'PDF', status: 'needs-review', scope: 3, records: 7 },
  { name: 'LPG_Invoices_Q2_2024.pdf', size: '620 KB', type: 'PDF', status: 'analyzing', scope: 1, records: null },
  { name: 'MSIL_Supplier_Emissions_2024.xlsx', size: '2.1 MB', type: 'XLSX', status: 'processed', scope: 3, records: 19 },
  { name: 'Water_Consumption_FY24.csv', size: '42 KB', type: 'CSV', status: 'processed', scope: 3, records: 2 },
  { name: 'Air_Travel_Corporate_2024.docx', size: '280 KB', type: 'DOCX', status: 'analyzing', scope: 3, records: null },
]

function FileIcon({ type }: { type: string }) {
  const colors: Record<string, string> = { PDF: '#ef4444', XLSX: '#16a34a', XLS: '#16a34a', CSV: '#3b82f6', DOCX: '#2563eb' }
  return (
    <div style={{ width: 34, height: 34, background: `${colors[type] || '#64748b'}18`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: colors[type] || '#64748b', fontFamily: 'var(--font-mono)' }}>{type}</span>
    </div>
  )
}

function UploadAnalyze({ onNext }: { onNext: () => void }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', marginBottom: 8, lineHeight: 1.25 }}>
          Analyze your carbon footprint<br />from your existing business data
        </h2>
        <p style={{ fontSize: 14.5, color: '#475569', maxWidth: 560, lineHeight: 1.65 }}>
          Upload bills, invoices, spreadsheets, supplier reports, and other enterprise documents.
          CarbonTrace extracts and organizes carbon-relevant data automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="drop-zone"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
        style={{ border: dragging ? '2px dashed #059669' : '2px dashed #cbd5e1', background: dragging ? '#f0fdf4' : '#fafafa', borderRadius: 16, padding: '48px 32px', textAlign: 'center', marginBottom: 28, cursor: 'pointer' }}
      >
        <div style={{ width: 52, height: 52, background: '#f1f5f9', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Upload size={22} color="#64748b" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Drop documents here to analyze</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>PDF, XLSX, XLS, CSV, DOCX supported · Up to 50 MB per file</p>
        <button style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Browse Files
        </button>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {['Electricity Bills', 'Fuel Invoices', 'Fleet Logs', 'Supplier Reports', 'Travel Receipts', 'Utility Statements'].map(t => (
            <span key={t} style={{ fontSize: 11.5, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '3px 10px' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* File list */}
      <div className="ct-card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Uploaded Documents</span>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 12, color: '#64748b' }}>{uploadedFiles.length} files · 8.5 MB total</span>
            <button onClick={onNext} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} /> View Processing Status
            </button>
          </div>
        </div>
        <div>
          {uploadedFiles.map((f, i) => (
            <div key={i} className="ct-row flex items-center justify-between" style={{ padding: '12px 20px', borderBottom: i < uploadedFiles.length - 1 ? '1px solid #f8fafc' : 'none' }}>
              <div className="flex items-center gap-3">
                <FileIcon type={f.type} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{f.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{f.size}{f.records ? ` · ${f.records} data points extracted` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {f.scope && <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>Scope {f.scope}</span>}
                {f.status === 'processed' && (
                  <span style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                    <CheckCircle size={13} /> Processed
                  </span>
                )}
                {f.status === 'analyzing' && (
                  <span style={{ fontSize: 12, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                    <RefreshCw size={13} className="animate-spin" /> Analyzing…
                  </span>
                )}
                {f.status === 'needs-review' && (
                  <span style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                    <AlertTriangle size={13} /> Needs Review
                  </span>
                )}
                <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Document Processing (static)
// ─────────────────────────────────────────────────────────────────────────────

function DocumentProcessing({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Document Processing</h2>
        <p style={{ fontSize: 13, color: '#64748b' }}>AI is extracting carbon-relevant data from your uploaded documents</p>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Docs Processed', value: '5 / 7', color: '#059669' },
          { label: 'Data Points', value: '287', color: '#3b82f6' },
          { label: 'Activities', value: '43', color: '#8b5cf6' },
          { label: 'Suppliers', value: '12', color: '#f59e0b' },
          { label: 'Needs Review', value: '3', color: '#ef4444' },
        ].map(m => (
          <div key={m.label} className="ct-card p-4 text-center">
            <p style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: 'var(--font-display)' }}>{m.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Data quality breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="ct-card p-5">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Data Source Quality</h3>
          {[
            { label: 'Primary Data', pct: 62, color: '#059669' },
            { label: 'Estimated / Modelled', pct: 27, color: '#f59e0b' },
            { label: 'Missing / Flagged', pct: 11, color: '#ef4444' },
          ].map(q => (
            <div key={q.label} className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: q.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12.5, color: '#334155' }}>{q.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div style={{ width: 120, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${q.pct}%`, background: q.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-mono)', width: 32, textAlign: 'right' }}>{q.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="ct-card p-5">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Activities Identified</h3>
          {[
            { label: 'Electricity Consumption', count: 8 },
            { label: 'Fuel & Fleet Operations', count: 14 },
            { label: 'Supplier Purchases', count: 11 },
            { label: 'Business Travel', count: 6 },
            { label: 'Water & Waste', count: 4 },
          ].map(a => (
            <div key={a.label} className="flex items-center justify-between mb-2.5">
              <span style={{ fontSize: 12.5, color: '#334155' }}>{a.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#f0fdf4', padding: '1px 8px', borderRadius: 4 }}>{a.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-document status */}
      <div className="ct-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Per-Document Status</span>
          <button onClick={onNext} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
            Review Extracted Data <ArrowRight size={12} />
          </button>
        </div>
        {uploadedFiles.map((f, i) => (
          <div key={i} style={{ padding: '13px 20px', borderBottom: i < uploadedFiles.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <FileIcon type={f.type} />
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{f.name}</span>
                {f.status === 'processed' && <span style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}><CheckCircle size={13} /> Complete</span>}
                {f.status === 'analyzing' && <span style={{ fontSize: 12, color: '#d97706', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}><RefreshCw size={13} className="animate-spin" /> Analyzing…</span>}
                {f.status === 'needs-review' && <span style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}><AlertTriangle size={13} /> Needs Review</span>}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: f.status === 'processed' ? '100%' : f.status === 'analyzing' ? '55%' : '100%',
                  background: f.status === 'processed' ? 'linear-gradient(90deg,#047857,#059669)' : f.status === 'analyzing' ? 'linear-gradient(90deg,#b45309,#d97706)' : 'linear-gradient(90deg,#b91c1c,#ef4444)'
                }} />
              </div>
              {f.records && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{f.records} data points extracted · Scope {f.scope}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 4: Extracted Data Review (static)
// ─────────────────────────────────────────────────────────────────────────────

const extractedRecords = [
  { id: 1, doc: 'KSEB_Bill_Nov2024.pdf', activity: 'Grid Electricity', qty: 18400, unit: 'kWh', period: 'Nov 2024', facility: 'Plant — Kochi', scope: 2, dataType: 'primary', confidence: 97, co2e: 14.7, status: 'accepted' },
  { id: 2, doc: 'Fleet_Diesel_Log_Oct2024.xlsx', activity: 'Diesel Combustion', qty: 3420, unit: 'litres', period: 'Oct 2024', facility: 'Fleet HQ', scope: 1, dataType: 'primary', confidence: 99, co2e: 9.1, status: 'accepted' },
  { id: 3, doc: 'Supplier_TataSteel_Q3.pdf', activity: 'Steel Purchase', qty: 240, unit: 'tonnes', period: 'Q3 2024', facility: 'Procurement', scope: 3, dataType: 'estimated', confidence: 71, co2e: 456.0, status: 'pending' },
  { id: 4, doc: 'LPG_Invoices_Q2_2024.pdf', activity: 'LPG Combustion', qty: 1800, unit: 'kg', period: 'Q2 2024', facility: 'Plant — Pune', scope: 1, dataType: 'primary', confidence: 95, co2e: 5.4, status: 'accepted' },
  { id: 5, doc: 'Air_Travel_Corporate.docx', activity: 'Air Travel — Dom.', qty: 42, unit: 'segments', period: 'Oct–Nov 2024', facility: 'Corporate', scope: 3, dataType: 'estimated', confidence: 60, co2e: 18.3, status: 'pending' },
  { id: 6, doc: 'Water_Consumption.csv', activity: 'Water Treatment', qty: 2200, unit: 'm³', period: 'Q3 2024', facility: 'Plant — Kochi', scope: 3, dataType: 'estimated', confidence: 55, co2e: 2.2, status: 'flagged' },
]

function ExtractedReview() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? extractedRecords : extractedRecords.filter(r => r.dataType === filter || r.status === filter)

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Traceability chain */}
      <div className="ct-card p-4 mb-6" style={{ background: 'linear-gradient(90deg, #f0fdf4, #fafafa)' }}>
        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>Source Traceability Chain</p>
        <div className="flex items-center gap-2 flex-wrap">
          {['Document', 'Extracted Field', 'Activity', 'Scope', 'CO₂e', 'Verification', 'Report'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '4px 12px', borderRadius: 20, border: '1px solid #a7f3d0' }}>{step}</span>
              {i < arr.length - 1 && <ChevronRight size={14} color="#94a3b8" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="flex gap-2">
          {['all', 'primary', 'estimated', 'flagged'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: filter === f ? '#059669' : '#e2e8f0', background: filter === f ? '#059669' : 'white', color: filter === f ? 'white' : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="ct-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Source Document', 'Activity', 'Quantity', 'Period', 'Facility', 'Scope', 'Type', 'Confidence', 'CO₂e (t)', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="ct-row" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div className="flex items-center gap-2">
                    <File size={12} color="#94a3b8" />
                    <span style={{ color: '#059669', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>{r.doc}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 500, color: '#1e293b' }}>{r.activity}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>{r.qty.toLocaleString()} {r.unit}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{r.period}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{r.facility}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4 }}>S{r.scope}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {r.dataType === 'primary' ? <PrimaryBadge /> : <EstimatedBadge />}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <ConfidenceBar pct={r.confidence} />
                </td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1e293b', fontSize: 12 }}>{r.co2e.toFixed(1)}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div className="flex items-center gap-1.5">
                    <button style={{ fontSize: 11, color: '#3b82f6', background: '#eff6ff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>View</button>
                    <button style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}><Edit2 size={10} /></button>
                    {r.status !== 'accepted' && <button style={{ fontSize: 11, color: '#059669', background: '#f0fdf4', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}><Check size={10} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 5: Carbon Data — connected to real backend
// ─────────────────────────────────────────────────────────────────────────────

function CarbonData() {
  const [activities, setActivities] = useState<CarbonActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getCarbonActivities(COMPANY_ID)
      .then(setActivities)
      .catch(e => setError(e.message ?? 'Failed to load carbon activities'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Carbon Data</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            {loading ? 'Loading…' : error ? 'Error loading data' : `${activities.length} activity records from database`}
          </p>
        </div>
        <div className="flex gap-2">
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <Filter size={13} /> Filter
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <Download size={13} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'white', background: '#334155', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <Plus size={13} /> Add Manual Entry
          </button>
        </div>
      </div>

      {/* Notice */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Info size={14} color="#059669" />
        <span style={{ fontSize: 13, color: '#065f46' }}>
          <strong>{activities.length} carbon activity records</strong> loaded from the PostgreSQL database. Emissions calculated as activity_quantity × emission_factor.
        </span>
      </div>

      {loading && <LoadingSpinner label="Loading carbon activities…" />}
      {error && !loading && <ErrorBanner message={error} />}
      {!loading && !error && activities.length === 0 && <EmptyState label="No carbon activities found. Use POST /api/v1/seed to load demo data." />}

      {!loading && !error && activities.length > 0 && (
        <div className="ct-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['ID', 'Activity Type', 'Quantity', 'Unit', 'Emissions (kgCO₂e)', 'Data Quality', 'Flagged'].map(h => (
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
                    {r.emissions_kgco2e.toFixed(2)}
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
// SCREEN 6: Suppliers — connected to real backend
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
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Suppliers" value={`${supplierList.length}`} sub="In database" color="blue" />
          <KpiCard label="Verified" value={`${supplierList.filter(s => s.is_verified).length}`} sub="Confirmed" color="emerald" />
          <KpiCard label="Unverified" value={`${supplierList.filter(s => !s.is_verified).length}`} sub="Need attention" color="rose" />
          <KpiCard label="Company ID" value={`${COMPANY_ID}`} sub="Demo dataset" color="amber" />
        </div>

        {/* Search + filter */}
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

        {/* Supplier table */}
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

      {/* Supplier drawer */}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
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

          <button style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Shield size={13} /> View on Ledger
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7: Verification — connected to real backend SHA-256 hash-chain
// ─────────────────────────────────────────────────────────────────────────────

function Verification() {
  const [entries, setEntries] = useState<VerificationEntry[]>([])
  const [chainResult, setChainResult] = useState<VerificationResult | null>(null)
  const [summary, setSummary] = useState<VerificationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

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

  const handleVerify = () => {
    setValidating(true)
    validateVerification()
      .then(setChainResult)
      .catch(e => setError(e.message))
      .finally(() => setValidating(false))
  }

  const truncateHash = (h: string) => h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* Chain status banner */}
      <div style={{
        background: chainResult?.is_verified
          ? 'linear-gradient(135deg, #022c22, #064e3b)'
          : 'linear-gradient(135deg, #450a0a, #7f1d1d)',
        borderRadius: 14, padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div className="flex items-center gap-4">
          <div style={{ width: 48, height: 48, background: 'rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color={chainResult?.is_verified ? '#34d399' : '#f87171'} />
          </div>
          <div>
            {loading
              ? <span style={{ fontSize: 13, color: '#94a3b8' }}>Loading verification data…</span>
              : chainResult
                ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 13, fontWeight: 700, color: chainResult.is_verified ? '#34d399' : '#f87171', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {chainResult.is_verified ? '✓ CHAIN INTACT' : '✗ CHAIN COMPROMISED'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: '#6ee7b7' }}>
                      {chainResult.checked_entries} entries checked · SHA-256 hash-chain ledger · {chainResult.is_verified ? 'All hashes match' : `${chainResult.invalid_entries.length} invalid entries`}
                    </p>
                  </>
                )
                : <span style={{ fontSize: 13, color: '#f87171' }}>Verification unavailable</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            disabled={validating}
            style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={validating ? 'animate-spin' : ''} /> {validating ? 'Verifying…' : 'Verify Chain'}
          </button>
        </div>
      </div>

      {/* Chain stats from real summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {summary ? (
          <>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{summary.total_entries}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Total Entries</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-display)' }}>{summary.verified_entries}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Verified</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-display)' }}>{summary.verification_percentage.toFixed(0)}%</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Integrity</p>
            </div>
            <div className="ct-card p-4 text-center">
              <p style={{ fontSize: 20, fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-display)' }}>{summary.flagged_entries}</p>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Flagged</p>
            </div>
          </>
        ) : [
          { label: 'Total Entries', value: '—', color: '#0f172a' },
          { label: 'Verified', value: '—', color: '#059669' },
          { label: 'Integrity', value: '—', color: '#059669' },
          { label: 'Flagged', value: '—', color: '#d97706' },
        ].map(m => (
          <div key={m.label} className="ct-card p-4 text-center">
            <p style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: 'var(--font-display)' }}>{m.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Info size={14} color="#64748b" />
        <span style={{ fontSize: 12, color: '#475569' }}>
          This is a <strong>SHA-256 hash-chain ledger</strong> (tamper-evident audit trail). Each block's hash depends on the previous block. This is not a deployed blockchain or smart contract.
        </span>
      </div>

      {loading && <LoadingSpinner label="Loading ledger entries…" />}
      {error && !loading && <ErrorBanner message={error} />}
      {!loading && !error && entries.length === 0 && <EmptyState label="No ledger entries. Seed demo data first." />}

      {/* Block explorer */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((b) => (
            <div key={b.entry_id} className="block-card">
              <div
                className="flex items-center justify-between"
                style={{ padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === b.entry_id ? null : b.entry_id)}
              >
                <div className="flex items-center gap-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={12} color="#059669" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>Entry #{b.entry_id}</span>
                  </div>
                  <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-mono)' }}>{b.created_at.slice(0, 19).replace('T', ' ')}</span>
                  <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                  <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{b.entry_type}</span>
                  <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                  {b.is_primary ? <PrimaryBadge /> : <EstimatedBadge />}
                </div>
                <div className="flex items-center gap-3">
                  {b.is_verified
                    ? <CheckCircle size={14} color="#059669" />
                    : <AlertTriangle size={14} color="#ef4444" />}
                  {expanded === b.entry_id ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                </div>
              </div>

              {expanded === b.entry_id && (
                <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 18px', background: '#fafafa', borderRadius: '0 0 10px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Previous Hash</p>
                      <p className="hash-text">{b.previous_hash ?? '(genesis)'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Block Hash</p>
                      <p className="hash-text" style={{ color: '#059669' }}>{b.block_hash}</p>
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Payload</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {[
                        { k: 'entry_id', v: b.entry_id },
                        { k: 'entry_type', v: b.entry_type },
                        { k: 'source_id', v: b.source_id },
                        { k: 'data_hash', v: truncateHash(b.data_hash) },
                        { k: 'is_primary', v: String(b.is_primary) },
                      ].map(({ k, v }) => (
                        <div key={k}>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{k}: </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono)' }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8: Optimizer — connected to real backend
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
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Reduction Optimizer</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Model cost-effective abatement pathways using PuLP/CBC solver</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Left: input + results */}
        <div>
          {/* Input card */}
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
              {loading ? <><RefreshCw size={13} className="animate-spin" /> Optimizing…</> : <><Zap size={13} /> Run Optimizer</>}
            </button>
          </div>

          {error && <ErrorBanner message={error} />}

          {/* Recommendations */}
          {result && result.recommendations.length > 0 && (
            <div className="ct-card">
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Recommended Interventions</span>
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

          {result && result.recommendations.length === 0 && (
            <EmptyState label="No interventions available for the given constraints." />
          )}
        </div>

        {/* Right: summary + chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary card */}
          {result && (
            <div className="ct-card p-5">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Optimization Summary</h3>
              {[
                { label: 'Current Emissions', value: `${(result.current_emissions_kgco2e / 1000).toFixed(2)} tCO₂e` },
                { label: 'Target Reduction', value: `${result.target_reduction_percentage}%` },
                { label: 'Required Reduction', value: `${(result.required_reduction_kgco2e / 1000).toFixed(2)} tCO₂e` },
                { label: 'Optimized Reduction', value: `${(result.optimized_reduction_kgco2e / 1000).toFixed(2)} tCO₂e`, highlight: true },
                { label: 'Residual Emissions', value: `${(result.residual_emissions_kgco2e / 1000).toFixed(2)} tCO₂e` },
                { label: 'Budget Used', value: result.budget_used_inr ? `₹${result.budget_used_inr.toLocaleString()}` : '—' },
                { label: 'Remaining Budget', value: result.remaining_budget_inr != null ? `₹${result.remaining_budget_inr.toLocaleString()}` : '—' },
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

          {!result && (
            <div className="ct-card p-5">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Optimization Summary</h3>
              <EmptyState label="Run the optimizer to see results." />
            </div>
          )}

          {/* Abatement chart */}
          {result && chartData.length > 0 && (
            <div className="ct-card p-5">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Abatement by Intervention (tCO₂e)</h3>
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
// SCREEN 9: BRSR-style Report — connected where possible
// ─────────────────────────────────────────────────────────────────────────────

function Report() {
  const [summary, setSummary] = useState<CarbonSummary | null>(null)
  const [verSummary, setVerSummary] = useState<VerificationSummary | null>(null)
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getCarbonSummary(COMPANY_ID),
      getVerificationSummary(COMPANY_ID),
    ])
      .then(([s, v]) => { setSummary(s); setVerSummary(v) })
      .catch(() => { /* non-fatal — report still renders */ })
      .finally(() => setLoading(false))
  }, [])

  const handleAIExplain = () => {
    setAiLoading(true)
    setAiError(null)
    getAIExplanation({
      context_type: 'summary',
      context_id: COMPANY_ID,
      question: 'Summarize the carbon emissions data for the executive report and suggest improvements.',
    })
      .then(setAiExplanation)
      .catch(e => setAiError(e.message ?? 'AI explanation failed'))
      .finally(() => setAiLoading(false))
  }

  const fmt = (n: number) => (n / 1000).toFixed(2)

  const scopePieData = summary
    ? [
        { name: 'Primary Emissions', value: parseFloat((summary.primary_emissions_kgco2e / 1000).toFixed(2)), color: '#0f172a' },
        { name: 'Estimated Emissions', value: parseFloat((summary.estimated_emissions_kgco2e / 1000).toFixed(2)), color: '#059669' },
      ]
    : []

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Report header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: '40px 48px', marginBottom: 32, color: 'white' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={16} color="#34d399" />
              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CarbonTrace · GHG Protocol-Aligned Report</span>
            </div>
            <h1 className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'white', marginBottom: 8, lineHeight: 1.2 }}>
              Greenhouse Gas Emissions<br />Disclosure Report
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Meridian Industries Ltd. · Financial Year 2024–25</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Prepared by CarbonTrace Intelligence Platform · GHG Protocol-aligned prototype</p>
          </div>
          <div className="flex gap-3">
            <button style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100 }}>
        {/* Executive Summary */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>1. Executive Summary</h2>

          {/* AI explanation */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            {aiExplanation ? (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  🤖 AI-generated explanation {aiExplanation.is_fallback ? '(fallback — AI unavailable)' : ''}
                </p>
                <p style={{ fontSize: 13, color: '#065f46', lineHeight: 1.7 }}>{aiExplanation.explanation}</p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Info size={14} color="#059669" />
                <span style={{ fontSize: 13, color: '#065f46' }}>
                  {loading ? 'Loading emissions data…' : summary
                    ? `Total GHG emissions: ${fmt(summary.total_emissions_kgco2e)} tCO₂e · Primary data: ${summary.primary_data_percentage.toFixed(1)}%`
                    : 'Seed demo data and reload to see live figures.'}
                </span>
                {!aiLoading && !aiExplanation && summary && (
                  <button
                    onClick={handleAIExplain}
                    style={{ marginLeft: 'auto', background: '#059669', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Star size={12} /> Generate AI Explanation
                  </button>
                )}
                {aiLoading && <RefreshCw size={13} color="#059669" className="animate-spin" style={{ marginLeft: 'auto' }} />}
              </div>
            )}
            {aiError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 8 }}>{aiError}</p>}
          </div>

          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { label: 'Total GHG Emissions', value: `${fmt(summary.total_emissions_kgco2e)} tCO₂e`, delta: 'From database' },
                { label: 'Primary Data Coverage', value: `${summary.primary_data_percentage.toFixed(1)}%`, delta: 'Direct measurement' },
                { label: 'Flagged Records', value: `${summary.flagged_entries_count}`, delta: 'Needs review' },
              ].map(m => (
                <div key={m.label} className="ct-card p-4">
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{m.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{m.value}</p>
                  <p style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 500 }}>{m.delta}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scope Breakdown */}
        {summary && (
          <div className="report-section">
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>2. Emissions Breakdown</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                {[
                  { label: 'Primary Emissions', desc: 'Direct measurement data', value: summary.primary_emissions_kgco2e, color: '#0f172a' },
                  { label: 'Estimated Emissions', desc: 'Factor-based / modelled data', value: summary.estimated_emissions_kgco2e, color: '#059669' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 20 }}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.label}</span>
                        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{s.desc}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{fmt(s.value)} tCO₂e</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                          {((s.value / summary.total_emissions_kgco2e) * 100).toFixed(1)}% of total
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={scopePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                      {scopePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${String(v)} tCO₂e`, '']} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Legend iconType="square" iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Methodology */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>3. Methodology</h2>
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.75, marginBottom: 12 }}>
            Emissions were calculated in accordance with the <strong>GHG Protocol Corporate Accounting and Reporting Standard</strong>. Activity data was extracted from business documents. Emission factors sourced from IPCC AR6, CEA Grid Emission Factor (FY 2023-24), and supplier-disclosed LCA data where available.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Standard', value: 'GHG Protocol-aligned prototype' },
              { label: 'Base Year', value: 'FY 2023–24' },
              { label: 'Reporting Boundary', value: 'Operational Control' },
            ].map(m => (
              <div key={m.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>{m.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Assurance + Verification */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>4. Assurance Statement</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
            <div className="flex items-start gap-3">
              <Shield size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, color: '#1e293b', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>
                  "This platform provides audit-ready data; it does not replace statutory third-party assurance."
                </p>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65 }}>
                  All emission records have been cryptographically hashed and appended to a tamper-evident SHA-256 hash-chain ledger. Source traceability is maintained from activity record to reported figure. Independent third-party limited or reasonable assurance is recommended for statutory reporting.
                </p>
              </div>
            </div>
          </div>
          {verSummary && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ fontSize: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} /> <strong>Verification:</strong> SHA-256 hash-chain · {verSummary.total_entries} entries · {verSummary.verification_percentage.toFixed(0)}% integrity · Last verified on load
              </p>
            </div>
          )}
        </div>

        {/* BRSR gap note */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <div className="flex items-start gap-3">
            <Info size={16} color="#854d0e" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#854d0e', marginBottom: 4 }}>BRSR Full Report — Not Yet Implemented</p>
              <p style={{ fontSize: 12, color: '#713f12', lineHeight: 1.65 }}>
                The full BRSR Compliance Report (Scope 1/2/3 breakdown by GHG category, regulatory disclosure tables, statutory assurance sections) requires a dedicated backend report endpoint that is not currently implemented. The data shown above is directly sourced from the PostgreSQL database via the CarbonTrace API.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────────────────────────────────────

const tickerItems = [
  '✓ KSEB_Bill_Nov2024.pdf · 4 records extracted',
  '✓ Fleet_Diesel_Oct2024.xlsx · Scope 1 · 9.17 tCO₂e',
  '✓ Supplier_TataSteel_Q3.pdf · 456 tCO₂e estimated',
  '✓ Air_Travel_Corporate.docx · 18.48 tCO₂e',
  '✓ MSIL_Supplier_2024.xlsx · PRIMARY data · 94% confidence',
  '✓ Water_Consumption.csv · Scope 3 · 2.20 tCO₂e',
  '⬡ Block #1 sealed · Hash-chain intact',
  '⬡ SHA-256 ledger verified · All entries OK',
]

const orbs = [
  { w: 340, h: 340, top: '-80px', left: '-80px', opacity: 0.22, delay: '0s', dur: '20s' },
  { w: 220, h: 220, top: '55%', right: '-60px', opacity: 0.18, delay: '4s', dur: '26s' },
  { w: 160, h: 160, top: '30%', left: '38%', opacity: 0.12, delay: '8s', dur: '32s' },
]

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 1200)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>

      {/* ── Left panel ── */}
      <div style={{
        flex: '0 0 55%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #020c18 0%, #042f1e 45%, #0a1628 100%)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Animated orbs */}
        {orbs.map((o, i) => (
          <div key={i} style={{
            position: 'absolute', width: o.w, height: o.h,
            top: o.top, left: (o as any).left, right: (o as any).right,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(5,150,105,0.55) 0%, rgba(4,120,87,0.2) 50%, transparent 75%)',
            filter: 'blur(40px)',
            opacity: o.opacity,
            animation: `drift ${o.dur} ease-in-out infinite ${o.delay}`,
          }} />
        ))}

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(5,150,105,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(5,150,105,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Spinning rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
          {[320, 240, 170].map((size, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: size, height: size,
              top: '50%', left: '50%',
              marginTop: -size / 2, marginLeft: -size / 2,
              borderRadius: '50%',
              border: `1px solid rgba(5,150,105,${0.12 - i * 0.03})`,
              animation: i % 2 === 0 ? `spin-slow ${16 + i * 6}s linear infinite` : `counter-spin ${18 + i * 5}s linear infinite`,
            }}>
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -4, left: '50%', marginLeft: -4,
                  width: 8, height: 8, borderRadius: '50%', background: '#059669',
                  boxShadow: '0 0 10px rgba(5,150,105,0.8)',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 52px' }}>
          {/* Logo */}
          <div className="flex items-center gap-3" style={{ marginBottom: 'auto' }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #059669, #047857)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(5,150,105,0.5)',
            }}>
              <Leaf size={18} color="white" />
            </div>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}>
              CarbonTrace
            </span>
          </div>

          {/* Hero text */}
          <div style={{ marginTop: 60, marginBottom: 'auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 20, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px #34d399', animation: 'pulse-ring 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500, letterSpacing: '0.04em' }}>AI-POWERED CARBON INTELLIGENCE</span>
            </div>

            <h1 className="font-display login-shimmer-text" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1, marginBottom: 20 }}>
              Turn your documents<br />into a carbon footprint
            </h1>

            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.75, maxWidth: 420, marginBottom: 40 }}>
              Upload invoices, bills, and supplier reports. CarbonTrace extracts, calculates, and verifies your Scope 1, 2 &amp; 3 emissions — automatically.
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 32, marginBottom: 48 }}>
              {[
                { val: '143+', label: 'Document types' },
                { val: '99.2%', label: 'Extraction accuracy' },
                { val: 'BRSR', label: 'Report ready' },
              ].map(s => (
                <div key={s.label}>
                  <p className="font-display" style={{ fontSize: 26, fontWeight: 700, color: '#34d399', lineHeight: 1 }}>{s.val}</p>
                  <p style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Floating document cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { file: 'KSEB_Bill_Nov2024.pdf', result: '15.09 tCO₂e', scope: 'S2', color: '#059669', delay: '0s' },
                { file: 'Fleet_Diesel_Q3.xlsx', result: '9.17 tCO₂e', scope: 'S1', color: '#3b82f6', delay: '1.2s' },
                { file: 'TataSteel_Report.pdf', result: '456 tCO₂e', scope: 'S3', color: '#8b5cf6', delay: '2.4s' },
              ].map((card, i) => (
                <div key={i} className="animate-float" style={{
                  animationDelay: card.delay,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '12px 14px',
                  backdropFilter: 'blur(12px)',
                  minWidth: 160,
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <File size={12} color="#64748b" />
                    <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>{card.file}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{card.result}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: `${card.color}25`, color: card.color, padding: '2px 7px', borderRadius: 4 }}>{card.scope}</span>
                  </div>
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${card.color}, transparent)`, borderRadius: 1, marginTop: 8 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Live ticker */}
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
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#ffffff', padding: '48px 40px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle bg pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(5,150,105,0.04) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)',
        }} />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {tab === 'signin' ? 'Welcome back' : 'Get started'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              {tab === 'signin'
                ? 'Sign in to your CarbonTrace workspace'
                : 'Create your organization account'}
            </p>
          </div>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {(['signin', 'signup'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: 'none',
                background: tab === t ? '#ffffff' : 'transparent',
                color: tab === t ? '#0f172a' : '#64748b',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease',
              }}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* SSO buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            {[
              { label: 'Google', icon: '🔵' },
              { label: 'Microsoft', icon: '🟦' },
            ].map(p => (
              <button key={p.label} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', border: '1.5px solid #e2e8f0', borderRadius: 10,
                fontSize: 13.5, fontWeight: 600, color: '#334155', background: 'white',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#94a3b8'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <span style={{ fontSize: 16 }}>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'signup' && (
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Organization Name</label>
                <input className="login-input" type="text" placeholder="Meridian Industries Ltd." />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Work Email</label>
              <input className="login-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Password</label>
                {tab === 'signin' && <button type="button" style={{ fontSize: 12, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Forgot password?</button>}
              </div>
              <div style={{ position: 'relative' }}>
                <input className="login-input" type={showPass ? 'text' : 'password'} placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 0 }}>
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {tab === 'signin' && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" style={{ accentColor: '#059669', width: 15, height: 15 }} />
                <label htmlFor="remember" style={{ fontSize: 13, color: '#64748b', cursor: 'pointer' }}>Keep me signed in</label>
              </div>
            )}

            <button type="submit" className="login-btn" style={{ marginTop: 4, position: 'relative' }} disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><RefreshCw size={14} className="animate-spin" /> Signing in…</span>
                : (tab === 'signin' ? 'Sign In to CarbonTrace' : 'Create Account')}
            </button>
          </form>

          {/* Trial note */}
          <div style={{ marginTop: 24, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ fontSize: 12.5, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={13} color="#059669" />
              <span><strong>Free 14-day trial</strong> · No credit card · GHG Protocol &amp; BRSR ready</span>
            </p>
          </div>

          {/* Footer links */}
          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 24 }}>
            By signing in you agree to our{' '}
            <span style={{ color: '#059669', cursor: 'pointer', fontWeight: 500 }}>Terms</span>
            {' '}and{' '}
            <span style={{ color: '#059669', cursor: 'pointer', fontWeight: 500 }}>Privacy Policy</span>
          </p>
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
  upload: { title: 'Upload & Analyze', sub: 'Extract carbon data from your existing business documents' },
  processing: { title: 'Document Processing', sub: 'AI extraction in progress' },
  review: { title: 'Extracted Data Review', sub: 'Review and accept AI-extracted records before they enter your carbon ledger' },
  carbon: { title: 'Carbon Data', sub: 'All emission records — from database' },
  suppliers: { title: 'Suppliers & Supply Chain', sub: 'Scope 3 value chain management' },
  verification: { title: 'Verification Ledger', sub: 'SHA-256 hash-chain audit trail' },
  optimizer: { title: 'Reduction Optimizer', sub: 'Model cost-effective abatement pathways' },
  report: { title: 'GHG Emissions Report', sub: 'Meridian Industries Ltd. · FY 2024–25' },
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />
  const meta = screenMeta[screen]

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard': return <Dashboard onNav={setScreen} />
      case 'upload': return <UploadAnalyze onNext={() => setScreen('processing')} />
      case 'processing': return <DocumentProcessing onNext={() => setScreen('review')} />
      case 'review': return <ExtractedReview />
      case 'carbon': return <CarbonData />
      case 'suppliers': return <Suppliers />
      case 'verification': return <Verification />
      case 'optimizer': return <Optimizer />
      case 'report': return <Report />
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
          showProcessing={screen === 'dashboard' || screen === 'upload'}
        />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {renderScreen()}
        </main>
      </div>
    </div>
  )
}
