import { useState } from 'react'
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
// SCREEN 1: Dashboard
// ─────────────────────────────────────────────────────────────────────────────

const emissionsData = [
  { month: 'Apr', scope1: 28, scope2: 74, scope3: 132 },
  { month: 'May', scope1: 31, scope2: 71, scope3: 141 },
  { month: 'Jun', scope1: 26, scope2: 79, scope3: 128 },
  { month: 'Jul', scope1: 29, scope2: 76, scope3: 138 },
  { month: 'Aug', scope1: 33, scope2: 72, scope3: 145 },
  { month: 'Sep', scope1: 30, scope2: 74, scope3: 135 },
  { month: 'Oct', scope1: 27, scope2: 78, scope3: 130 },
  { month: 'Nov', scope1: 32, scope2: 75, scope3: 142 },
  { month: 'Dec', scope1: 28, scope2: 71, scope3: 128 },
  { month: 'Jan', scope1: 30, scope2: 73, scope3: 134 },
  { month: 'Feb', scope1: 14, scope2: 36, scope3: 62 },
]

function Dashboard({ onNav }: { onNav: (s: Screen) => void }) {
  const quickActions = [
    { label: 'Analyze Documents', icon: Upload, screen: 'upload' as Screen, color: '#059669' },
    { label: 'Review Carbon Data', icon: Database, screen: 'review' as Screen, color: '#3b82f6' },
    { label: 'View Suppliers', icon: Truck, screen: 'suppliers' as Screen, color: '#8b5cf6' },
    { label: 'Verify Ledger', icon: Shield, screen: 'verification' as Screen, color: '#f59e0b' },
    { label: 'Optimize', icon: Zap, screen: 'optimizer' as Screen, color: '#ef4444' },
    { label: 'Generate Report', icon: FileText, screen: 'report' as Screen, color: '#0ea5e9' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1440 }}>
      {/* Hero strip */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
          Carbon Intelligence Dashboard
        </h2>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Automatic extraction from 143 business documents · Last updated 2 hours ago
        </p>
      </div>

      {/* Primary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="ct-card p-5" style={{ borderLeft: '4px solid #0f172a', gridColumn: '1' }}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Emissions</p>
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>2,847</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>tCO₂e</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingDown size={12} color="#059669" />
            <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>−8.4% vs last year</span>
          </div>
        </div>
        <KpiCard label="Scope 1 — Direct" value="342" unit="tCO₂e" sub="Fuel combustion, fleet" color="emerald" icon={<BarChart3 size={20} />} />
        <KpiCard label="Scope 2 — Energy" value="891" unit="tCO₂e" sub="Grid electricity purchased" color="blue" icon={<BarChart3 size={20} />} />
        <KpiCard label="Scope 3 — Value Chain" value="1,614" unit="tCO₂e" sub="67 suppliers · indirect" color="violet" icon={<BarChart3 size={20} />} />
      </div>

      {/* Secondary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard label="Data Quality Score" value="84" unit="%" sub="Primary + verified" color="emerald" />
        <KpiCard label="Documents Analyzed" value="143" sub="PDFs, XLS, CSV, DOCX" color="amber" />
        <KpiCard label="Suppliers Identified" value="67" sub="Across value chain" color="blue" />
        <KpiCard label="Flagged Records" value="12" sub="Needs review" color="rose" />
      </div>

      {/* Chart + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        <div className="ct-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Monthly Emissions Trend</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Scope 1 · 2 · 3 — tCO₂e</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#0f172a', display: 'inline-block' }} /> Scope 1</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#059669', display: 'inline-block' }} /> Scope 2</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6', display: 'inline-block' }} /> Scope 3</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={emissionsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="scope3" stroke="#8b5cf6" strokeWidth={2} fill="url(#s3)" />
              <Area type="monotone" dataKey="scope2" stroke="#059669" strokeWidth={2} fill="url(#s2)" />
              <Area type="monotone" dataKey="scope1" stroke="#0f172a" strokeWidth={2} fill="url(#s1)" />
            </AreaChart>
          </ResponsiveContainer>
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

      {/* Recent activity */}
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
// SCREEN 2: Upload & Analyze
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
// SCREEN 3: Document Processing
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
// SCREEN 4: Extracted Data Review
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
// SCREEN 5: Carbon Data
// ─────────────────────────────────────────────────────────────────────────────

const carbonRecords = [
  { doc: 'KSEB_Bill_Nov2024.pdf', date: '30 Nov 2024', scope: 2, activity: 'Grid Electricity', qty: '18,400 kWh', ef: '0.82 kgCO₂e/kWh', co2e: 15.09, quality: 'primary', status: 'verified' },
  { doc: 'Fleet_Diesel_Oct2024.xlsx', date: '31 Oct 2024', scope: 1, activity: 'Diesel Combustion', qty: '3,420 L', ef: '2.68 kgCO₂e/L', co2e: 9.17, quality: 'primary', status: 'verified' },
  { doc: 'LPG_Invoices_Q2.pdf', date: '30 Jun 2024', scope: 1, activity: 'LPG Combustion', qty: '1,800 kg', ef: '3.00 kgCO₂e/kg', co2e: 5.40, quality: 'primary', status: 'verified' },
  { doc: 'Supplier_TataSteel_Q3.pdf', date: '30 Sep 2024', scope: 3, activity: 'Steel Purchase', qty: '240 t', ef: '1.9 tCO₂e/t', co2e: 456.0, quality: 'estimated', status: 'pending' },
  { doc: 'MSIL_Supplier_2024.xlsx', date: '15 Oct 2024', scope: 3, activity: 'Auto Components', qty: '580 units', ef: '0.42 tCO₂e/unit', co2e: 243.6, quality: 'primary', status: 'verified' },
  { doc: 'Air_Travel_Corporate.docx', date: '20 Nov 2024', scope: 3, activity: 'Air Travel — Dom.', qty: '42 segments', ef: '0.44 tCO₂e/seg', co2e: 18.48, quality: 'estimated', status: 'pending' },
  { doc: 'Water_Consumption.csv', date: '30 Sep 2024', scope: 3, activity: 'Water Treatment', qty: '2,200 m³', ef: '0.001 tCO₂e/m³', co2e: 2.20, quality: 'estimated', status: 'flagged' },
]

function CarbonData() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Carbon Data</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Automatically extracted from 143 documents · 7 records shown</p>
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
          <strong>287 data points</strong> extracted automatically from your uploaded documents. Manual entries supplement AI-extracted data.
        </span>
      </div>

      <div className="ct-card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Source Document', 'Date', 'Scope', 'Activity', 'Quantity', 'Emission Factor', 'CO₂e (t)', 'Data Quality', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carbonRecords.map((r, i) => (
              <tr key={i} className="ct-row" style={{ borderBottom: i < carbonRecords.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ color: '#059669', cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>{r.doc}</span>
                </td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 12 }}>{r.date}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: r.scope === 1 ? '#f0fdf4' : r.scope === 2 ? '#eff6ff' : '#faf5ff', color: r.scope === 1 ? '#065f46' : r.scope === 2 ? '#1d4ed8' : '#6d28d9', padding: '2px 8px', borderRadius: 4 }}>S{r.scope}</span>
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 500, color: '#1e293b' }}>{r.activity}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>{r.qty}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b' }}>{r.ef}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{r.co2e.toFixed(2)}</td>
                <td style={{ padding: '11px 14px' }}>
                  {r.quality === 'primary' ? <PrimaryBadge /> : <EstimatedBadge />}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {r.status === 'verified' && <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} /> Verified</span>}
                  {r.status === 'pending' && <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> Pending</span>}
                  {r.status === 'flagged' && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={12} /> Flagged</span>}
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
// SCREEN 6: Suppliers
// ─────────────────────────────────────────────────────────────────────────────

const suppliers = [
  { name: 'Tata Steel Ltd.', category: 'Raw Materials', emissions: 456.0, dataType: 'estimated', confidence: 71, status: 'flagged', reason: 'No direct emissions data; IPCC factor used', docs: 2 },
  { name: 'MSIL Supplier Network', category: 'Auto Components', emissions: 243.6, dataType: 'primary', confidence: 94, status: 'verified', reason: null, docs: 4 },
  { name: 'DHL Logistics', category: 'Transport & Freight', emissions: 187.4, dataType: 'estimated', confidence: 68, status: 'pending', reason: 'Partial route data', docs: 1 },
  { name: 'BPCL Fuel Station', category: 'Fuel Supply', emissions: 112.3, dataType: 'primary', confidence: 99, status: 'verified', reason: null, docs: 6 },
  { name: 'L&T Engineering', category: 'Contract Services', emissions: 88.7, dataType: 'estimated', confidence: 55, status: 'flagged', reason: 'Spend-based estimate; no primary data', docs: 1 },
  { name: 'Hindalco Industries', category: 'Aluminium', emissions: 76.2, dataType: 'primary', confidence: 88, status: 'verified', reason: null, docs: 3 },
]

function Suppliers() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<typeof suppliers[0] | null>(null)

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'primary' && s.dataType === 'primary') || (filter === 'estimated' && s.dataType === 'estimated') || (filter === 'flagged' && s.status === 'flagged'))
  )

  return (
    <div style={{ padding: '28px 32px', display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Total Suppliers" value="67" sub="Across value chain" color="blue" />
          <KpiCard label="Scope 3 Emissions" value="1,614" unit="tCO₂e" sub="All value chain" color="violet" />
          <KpiCard label="Primary Data" value="38%" sub="Direct measurement" color="emerald" />
          <KpiCard label="Flagged" value="12" sub="Need attention" color="rose" />
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
          {['all', 'primary', 'estimated', 'flagged'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: filter === f ? '#059669' : '#e2e8f0', background: filter === f ? '#059669' : 'white', color: filter === f ? 'white' : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Supplier table */}
        <div className="ct-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Supplier', 'Category', 'Emissions (tCO₂e)', 'Data Type', 'Confidence', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} className="ct-row" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }} onClick={() => setSelected(s)}>
                  <td style={{ padding: '12px 14px' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 28, height: 28, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                        {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.category}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1e293b' }}>{s.emissions.toFixed(1)}</td>
                  <td style={{ padding: '12px 14px' }}>{s.dataType === 'primary' ? <PrimaryBadge /> : <EstimatedBadge />}</td>
                  <td style={{ padding: '12px 14px' }}><ConfidenceBar pct={s.confidence} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    {s.status === 'verified' && <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} /> Verified</span>}
                    {s.status === 'pending' && <span style={{ fontSize: 12, color: '#d97706', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> Pending</span>}
                    {s.status === 'flagged' && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={12} /> Flagged</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}><ChevronRight size={14} color="#94a3b8" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier drawer */}
      {selected && (
        <div className="ct-card" style={{ width: 320, flexShrink: 0, padding: 24, height: 'fit-content', position: 'sticky', top: 80 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Supplier Detail</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
          </div>
          <div style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
            {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{selected.name}</h4>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{selected.category}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {[
              { label: 'Scope 3 Emissions', value: `${selected.emissions.toFixed(1)} tCO₂e` },
              { label: 'Data Quality', value: selected.dataType },
              { label: 'Confidence', value: `${selected.confidence}%` },
              { label: 'Source Documents', value: `${selected.docs} files` },
            ].map(row => (
              <div key={row.label} className="flex justify-between" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {selected.reason && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#9a3412', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>Flag reason:</strong> {selected.reason}</span>
              </p>
            </div>
          )}

          <button style={{ width: '100%', background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Shield size={13} /> Verify on Ledger
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 7: Verification
// ─────────────────────────────────────────────────────────────────────────────

const blocks = [
  {
    id: 847, ts: '2024-11-30 18:42:03 UTC', prevHash: '0xa3f9...d7c2', hash: '0x1b8e...4f91',
    payload: { type: 'Carbon Record', activity: 'Grid Electricity', co2e: '15.09 tCO₂e', source: 'KSEB_Bill_Nov2024.pdf', facility: 'Plant — Kochi' }
  },
  {
    id: 846, ts: '2024-10-31 16:15:22 UTC', prevHash: '0x7d4c...a1b3', hash: '0xa3f9...d7c2',
    payload: { type: 'Carbon Record', activity: 'Diesel Combustion', co2e: '9.17 tCO₂e', source: 'Fleet_Diesel_Oct2024.xlsx', facility: 'Fleet HQ' }
  },
  {
    id: 845, ts: '2024-10-15 09:30:44 UTC', prevHash: '0x2e81...c490', hash: '0x7d4c...a1b3',
    payload: { type: 'Supplier Record', activity: 'Auto Components — MSIL', co2e: '243.6 tCO₂e', source: 'MSIL_Supplier_2024.xlsx', facility: 'Procurement' }
  },
  {
    id: 844, ts: '2024-09-30 20:08:11 UTC', prevHash: '0x5c3a...f082', hash: '0x2e81...c490',
    payload: { type: 'Carbon Record', activity: 'LPG Combustion', co2e: '5.40 tCO₂e', source: 'LPG_Invoices_Q2.pdf', facility: 'Plant — Pune' }
  },
]

function Verification() {
  const [expanded, setExpanded] = useState<number | null>(847)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* Chain status */}
      <div style={{ background: 'linear-gradient(135deg, #022c22, #064e3b)', borderRadius: 14, padding: '24px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex items-center gap-4">
          <div style={{ width: 48, height: 48, background: 'rgba(16,185,129,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="#34d399" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ CHAIN INTACT</span>
            </div>
            <p style={{ fontSize: 13, color: '#6ee7b7' }}>847 blocks verified · All hashes match · Tamper-evident ledger</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button style={{ background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export Proof
          </button>
          <button style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Verify Chain
          </button>
        </div>
      </div>

      {/* Chain stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Blocks', value: '847', color: '#0f172a' },
          { label: 'Last Verified', value: '2h ago', color: '#059669' },
          { label: 'Integrity', value: '100%', color: '#059669' },
          { label: 'Pending', value: '3', color: '#d97706' },
        ].map(m => (
          <div key={m.label} className="ct-card p-4 text-center">
            <p style={{ fontSize: 20, fontWeight: 700, color: m.color, fontFamily: 'var(--font-display)' }}>{m.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Block explorer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {blocks.map((b) => (
          <div key={b.id} className="block-card">
            <div
              className="flex items-center justify-between"
              style={{ padding: '14px 18px', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === b.id ? null : b.id)}
            >
              <div className="flex items-center gap-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={12} color="#059669" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>Block #{b.id}</span>
                </div>
                <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-mono)' }}>{b.ts}</span>
                <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{b.payload.activity}</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={14} color="#059669" />
                {expanded === b.id ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </div>
            </div>

            {expanded === b.id && (
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 18px', background: '#fafafa', borderRadius: '0 0 10px 10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Previous Hash</p>
                    <p className="hash-text">{b.prevHash}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Current Hash</p>
                    <p className="hash-text" style={{ color: '#059669' }}>{b.hash}</p>
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Payload</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {Object.entries(b.payload).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{k}: </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-mono)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 8: Optimizer
// ─────────────────────────────────────────────────────────────────────────────

const interventions = [
  { name: 'Switch to Green Tariff (KSEB RE)', scope: 2, abatement: 142.4, cost: 1800000, costPerKg: 12.64, selected: true },
  { name: 'Fleet Electrification — Phase 1', scope: 1, abatement: 94.7, cost: 4200000, costPerKg: 44.35, selected: true },
  { name: 'Rooftop Solar — Plant Kochi', scope: 2, abatement: 87.2, cost: 3100000, costPerKg: 35.55, selected: true },
  { name: 'Supplier Engagement — Tata Steel', scope: 3, abatement: 228.0, cost: 6500000, costPerKg: 28.51, selected: false },
  { name: 'Energy Audit + Retrofits', scope: 1, abatement: 36.5, cost: 800000, costPerKg: 21.92, selected: true },
  { name: 'Carbon Offset — Gold Standard', scope: 3, abatement: 50.0, cost: 1000000, costPerKg: 20.00, selected: false },
]

const abatementData = interventions.filter(i => i.selected).map(i => ({ name: i.name.length > 22 ? i.name.slice(0, 22) + '…' : i.name, abatement: i.abatement }))

function Optimizer() {
  const [budget, setBudget] = useState('10000000')
  const [selected, setSelected] = useState(new Set(interventions.filter(i => i.selected).map(i => i.name)))

  const total = interventions.filter(i => selected.has(i.name)).reduce((a, b) => a + b.abatement, 0)
  const spent = interventions.filter(i => selected.has(i.name)).reduce((a, b) => a + b.cost, 0)
  const budgetN = parseInt(budget.replace(/,/g, '')) || 0
  const avgCost = spent > 0 ? (spent / (total * 1000)).toFixed(2) : '0'

  const toggle = (name: string) => {
    const next = new Set(selected)
    next.has(name) ? next.delete(name) : next.add(name)
    setSelected(next)
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>Reduction Optimizer</h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>Select interventions within your budget to maximize abatement</p>
        </div>
        <div className="flex gap-2">
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'white', background: '#059669', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            <FileText size={13} /> Add to Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Left: interventions */}
        <div>
          {/* Budget input */}
          <div className="ct-card p-5 mb-5">
            <div className="flex items-center gap-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Budget (₹)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', width: 180, outline: 'none' }}
                  />
                  <button style={{ background: '#0f172a', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Optimize
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '12px 16px' }}>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Budget utilization</p>
                <div className="progress-bar" style={{ marginBottom: 6 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (spent / budgetN) * 100)}%` }} />
                </div>
                <p style={{ fontSize: 12, color: '#334155', fontFamily: 'var(--font-mono)' }}>
                  ₹{(spent / 1e6).toFixed(2)}M used of ₹{(budgetN / 1e6).toFixed(1)}M
                </p>
              </div>
            </div>
          </div>

          {/* Interventions list */}
          <div className="ct-card">
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Reduction Interventions</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{selected.size} selected · {interventions.length - selected.size} rejected</span>
            </div>
            {interventions.map((item, i) => {
              const isSelected = selected.has(item.name)
              return (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < interventions.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 14, opacity: isSelected ? 1 : 0.5 }}>
                  <button onClick={() => toggle(item.name)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isSelected ? '#059669' : '#cbd5e1'}`, background: isSelected ? '#059669' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSelected && <Check size={11} color="white" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{item.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#065f46', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>−{item.abatement} tCO₂e</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Scope {item.scope}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>₹{(item.cost / 1e5).toFixed(1)}L capex</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>₹{item.costPerKg}/kg CO₂e avoided</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: summary + chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary card */}
          <div className="ct-card p-5">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Optimization Summary</h3>
            {[
              { label: 'Total Abatement', value: `${total.toFixed(1)} tCO₂e`, highlight: true },
              { label: 'Reduction vs Baseline', value: `${((total / 2847) * 100).toFixed(1)}%`, highlight: false },
              { label: 'Budget Used', value: `₹${(spent / 1e6).toFixed(2)}M`, highlight: false },
              { label: 'Budget Remaining', value: `₹${Math.max(0, (budgetN - spent) / 1e6).toFixed(2)}M`, highlight: false },
              { label: 'Avg Cost / kg CO₂e', value: `₹${avgCost}`, highlight: false },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.highlight ? '#059669' : '#1e293b', fontFamily: row.highlight ? 'var(--font-display)' : 'var(--font-mono)' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Abatement chart */}
          <div className="ct-card p-5">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Abatement by Intervention</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={abatementData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v) => [`${String(v)} tCO₂e`, "Abatement"]} />
                <Bar dataKey="abatement" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 9: BRSR-style Report
// ─────────────────────────────────────────────────────────────────────────────

const scopePieData = [
  { name: 'Scope 1 — Direct', value: 342, color: '#0f172a' },
  { name: 'Scope 2 — Energy', value: 891, color: '#059669' },
  { name: 'Scope 3 — Value Chain', value: 1614, color: '#8b5cf6' },
]

const topSupplierData = [
  { name: 'Tata Steel', value: 456 },
  { name: 'MSIL Network', value: 244 },
  { name: 'DHL Logistics', value: 187 },
  { name: 'L&T Engineering', value: 89 },
  { name: 'Hindalco', value: 76 },
]

function Report() {
  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Report header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: 16, padding: '40px 48px', marginBottom: 32, color: 'white' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={16} color="#34d399" />
              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CarbonTrace · BRSR-Aligned Report</span>
            </div>
            <h1 className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'white', marginBottom: 8, lineHeight: 1.2 }}>
              Greenhouse Gas Emissions<br />Disclosure Report
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Meridian Industries Ltd. · Financial Year 2024–25</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Prepared by CarbonTrace Intelligence Platform · September 2026</p>
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
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#065f46', lineHeight: 1.7 }}>
              <strong>AI-generated explanation of computed figures:</strong> Meridian Industries Ltd. recorded total GHG emissions of <strong>2,847 tCO₂e</strong> for FY 2024–25, representing an 8.4% reduction from the prior year. Scope 3 (value chain) accounts for 56.7% of total emissions, driven primarily by purchased steel, automotive components, and logistics. Primary data covers 62% of emission sources by weight; the remainder relies on spend-based or IPCC-factor estimates. Confidence-weighted data quality score is 84%.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Total GHG Emissions', value: '2,847 tCO₂e', delta: '−8.4% YoY' },
              { label: 'Data Quality Score', value: '84 / 100', delta: 'Primary: 62%' },
              { label: 'Documents Analyzed', value: '143 files', delta: '287 data points' },
            ].map(m => (
              <div key={m.label} className="ct-card p-4">
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{m.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{m.value}</p>
                <p style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 500 }}>{m.delta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scope Breakdown */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>2. Emissions by Scope</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              {[
                { scope: 'Scope 1', desc: 'Direct emissions from owned / controlled sources', value: 342, pct: 12.0, color: '#0f172a', items: ['Diesel combustion — fleet operations', 'LPG combustion — plant heating', 'Company-owned vehicles'] },
                { scope: 'Scope 2', desc: 'Indirect emissions from purchased electricity', value: 891, pct: 31.3, color: '#059669', items: ['Grid electricity — Plant Kochi (KSEB)', 'Grid electricity — Plant Pune (MSEDCL)', 'Corporate offices'] },
                { scope: 'Scope 3', desc: 'All other indirect value chain emissions', value: 1614, pct: 56.7, color: '#8b5cf6', items: ['Purchased goods and services', 'Upstream transportation', 'Business travel', 'Waste in operations'] },
              ].map(s => (
                <div key={s.scope} style={{ marginBottom: 20 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.scope}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{s.desc}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{s.value} tCO₂e</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>{s.pct}% of total</span>
                    </div>
                  </div>
                  <ul style={{ paddingLeft: 16, marginTop: -12 }}>
                    {s.items.map(it => <li key={it} style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>{it}</li>)}
                  </ul>
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

        {/* Methodology */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>3. Methodology</h2>
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.75, marginBottom: 12 }}>
            Emissions were calculated in accordance with the <strong>GHG Protocol Corporate Accounting and Reporting Standard</strong> and the <strong>BRSR Core Framework</strong> (SEBI, 2023). Activity data was extracted automatically from 143 uploaded business documents using CarbonTrace's AI extraction engine. Emission factors sourced from IPCC AR6, CEA Grid Emission Factor (FY 2023-24), and supplier-disclosed LCA data where available.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Standard', value: 'GHG Protocol + BRSR Core' },
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

        {/* Top Suppliers */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>4. Scope 3 / Value Chain — Top Suppliers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supplier</th>
                    <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>tCO₂e</th>
                    <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0f172a' }}>{s.emissions.toFixed(1)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{s.dataType === 'primary' ? <PrimaryBadge /> : <EstimatedBadge />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSupplierData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={(v) => [`${String(v)} tCO₂e`, 'Emissions']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Quality */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>5. Data Quality Assessment</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'Primary Data Coverage', value: '62%', badge: <PrimaryBadge /> },
              { label: 'Estimated / Modelled', value: '27%', badge: <EstimatedBadge /> },
              { label: 'Missing / Flagged', value: '11%', badge: <FlaggedBadge /> },
            ].map(m => (
              <div key={m.label} className="ct-card p-4">
                <div className="flex items-center justify-between mb-2">{m.badge}</div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{m.value}</p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Assurance + Verification */}
        <div className="report-section">
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>6. Assurance Statement</h2>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
            <div className="flex items-start gap-3">
              <Shield size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13.5, color: '#1e293b', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 8 }}>
                  "This platform provides audit-ready data; it does not replace statutory third-party assurance."
                </p>
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65 }}>
                  All emission records have been cryptographically hashed and appended to an immutable audit ledger (847 blocks, chain integrity verified 100%). Source traceability is maintained from raw document to reported figure. Independent third-party limited or reasonable assurance is recommended for statutory reporting under SEBI BRSR Core requirements.
                </p>
              </div>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontSize: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} /> <strong>Verification:</strong> Chain verified · 847 blocks · Hash: 0x1b8e...4f91 · Last verified: 30 Sep 2026
            </p>
          </div>
        </div>

        {/* Action Plan */}
        <div style={{ paddingBottom: 0 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>7. Recommended Action Plan</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { priority: 'High', action: 'Switch KSEB supply to Green Tariff / renewable energy procurement', abatement: '−142 tCO₂e', timeline: 'Q1 FY25-26' },
              { priority: 'High', action: 'Initiate Scope 3 data collection from Tata Steel and L&T Engineering', abatement: 'Quality uplift', timeline: 'Q2 FY25-26' },
              { priority: 'Medium', action: 'Deploy rooftop solar at Plant Kochi (800 kWp)', abatement: '−87 tCO₂e', timeline: 'Q3 FY25-26' },
              { priority: 'Medium', action: 'Fleet electrification — Phase 1 (20 vehicles)', abatement: '−95 tCO₂e', timeline: 'Q2–Q3 FY25-26' },
              { priority: 'Low', action: 'Submit for third-party limited assurance under BRSR Core', abatement: 'Compliance', timeline: 'Q4 FY25-26' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, height: 'fit-content', flexShrink: 0, background: a.priority === 'High' ? '#fee2e2' : a.priority === 'Medium' ? '#fef3c7' : '#f0fdf4', color: a.priority === 'High' ? '#991b1b' : a.priority === 'Medium' ? '#92400e' : '#065f46' }}>{a.priority}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{a.action}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{a.abatement}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>{a.timeline}</p>
                </div>
              </div>
            ))}
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
  '⬡ Block #847 sealed · Hash 0x1b8e...4f91 · Chain intact',
  '⬡ Block #846 verified · Hash 0xa3f9...d7c2',
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
              <span><strong>Free 14-day trial</strong> · No credit card · BRSR & GHG Protocol ready</span>
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
  dashboard: { title: 'Dashboard', sub: 'FY 2024–25 · 143 documents analyzed' },
  upload: { title: 'Upload & Analyze', sub: 'Extract carbon data from your existing business documents' },
  processing: { title: 'Document Processing', sub: 'AI extraction in progress' },
  review: { title: 'Extracted Data Review', sub: 'Review and accept AI-extracted records before they enter your carbon ledger' },
  carbon: { title: 'Carbon Data', sub: 'All emission records — extracted and manual' },
  suppliers: { title: 'Suppliers & Supply Chain', sub: 'Scope 3 value chain management' },
  verification: { title: 'Verification Ledger', sub: 'Cryptographic audit trail' },
  optimizer: { title: 'Reduction Optimizer', sub: 'Model cost-effective abatement pathways' },
  report: { title: 'BRSR Emissions Report', sub: 'Meridian Industries Ltd. · FY 2024–25' },
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
