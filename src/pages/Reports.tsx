import { useState, useMemo, useEffect } from 'react'
import useERPStore, { KPI_LABELS, DEFAULT_KPI_TARGETS } from '../store/erpStore'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Printer,
  TrendingUp,
  Users,
  ClipboardList,
  CheckCircle,
} from 'lucide-react'

type Tab = 'daily' | 'weekly' | 'monthly'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const GRADE_COLOR: Record<string, string> = {
  S: '#22c55e',
  A: '#84cc16',
  B: '#eab308',
  C: '#f97316',
  D: '#ef4444',
  F: '#7f1d1d',
}

function fmtLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekIdOf(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - yearStart.getTime()) / 86400000 -
        3 +
        ((yearStart.getDay() + 6) % 7)) /
        7
    )
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getWeekIdFromOffset(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  d.setHours(0, 0, 0, 0)
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - yearStart.getTime()) / 86400000 -
        3 +
        ((yearStart.getDay() + 6) % 7)) /
        7
    )
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getWeekBoundsLocal(weekId: string): { start: string; end: string } {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  return { start: fmtLocalDate(monday), end: fmtLocalDate(saturday) }
}

function getWeekDates(weekId: string): string[] {
  const { start } = getWeekBoundsLocal(weekId)
  const dates: string[] = []
  const cursor = new Date(start + 'T00:00:00')
  for (let i = 0; i < 6; i++) {
    dates.push(fmtLocalDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function gradeFromScore(score: number): string {
  if (score >= 0) return 'S'
  if (score >= -20) return 'A'
  if (score >= -50) return 'B'
  if (score >= -100) return 'C'
  if (score >= -150) return 'D'
  return 'F'
}

function scoreColor(score: number): string {
  if (score >= 0) return '#22c55e'
  if (score >= -10) return '#84cc16'
  if (score >= -20) return '#eab308'
  if (score >= -50) return '#f97316'
  return '#ef4444'
}

export default function Reports() {
  const { users, morningPlans, eveningActuals, weeklyPlans, leads, followUps, warnings, weekScores, computeWeekScore } =
    useERPStore()

  const [tab, setTab] = useState<Tab>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(fmtLocalDate(new Date()))
  const [kpiViewMode, setKpiViewMode] = useState<'team' | string>('team')
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const salesExecs = useMemo(() => users.filter(u => u.role === 'sales_exec'), [users])

  const weekId = useMemo(() => getWeekIdFromOffset(weekOffset), [weekOffset])
  const weekDates = useMemo(() => getWeekDates(weekId), [weekId])
  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekBoundsLocal(weekId), [weekId])

  const weekLabel = useMemo(() => {
    const s = new Date(weekStart)
    const e = new Date(weekEnd)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    return `${fmt(s)} – ${fmt(e)}`
  }, [weekStart, weekEnd])

  // Single source of truth: the store's computed week scores.
  // Make sure scores exist for every week this page can display.
  useEffect(() => {
    const wids = new Set<string>([weekId, getWeekIdOf(new Date(selectedDate + 'T00:00:00'))])
    for (let i = 0; i < 4; i++) wids.add(getWeekIdFromOffset(-i))
    salesExecs.forEach(u => wids.forEach(wid => computeWeekScore(u.id, wid)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, selectedDate, salesExecs, morningPlans, eveningActuals])

  function getDayScore(userId: string, date: string): number | null {
    const wid = getWeekIdOf(new Date(date + 'T00:00:00'))
    const ws = weekScores.find(s => s.userId === userId && s.weekId === wid)
    const ds = ws?.dailyScores[date]
    if (!ds) return null
    if (!ds.morningDone && !ds.eveningDone && ds.total === 0) return null
    return ds.total
  }

  // ---- WEEKLY SCORECARD ----
  const scorecardRows = useMemo(() => {
    return salesExecs.map(user => {
      const ws = weekScores.find(s => s.userId === user.id && s.weekId === weekId)
      const dayScores = weekDates.map(date => {
        const ds = ws?.dailyScores[date]
        if (!ds || (!ds.morningDone && !ds.eveningDone && ds.total === 0)) return null
        return ds.total
      })
      const total = ws?.finalScore ?? 0
      const grade = ws?.grade ?? gradeFromScore(total)
      const achievementPct = Math.round(ws?.achievementPct ?? 0)
      return { user, dayScores, total, grade, achievementPct }
    })
  }, [salesExecs, weekDates, weekId, weekScores])

  // ---- KPI PERFORMANCE CHART ----
  function getKpiChartData(userId?: string): { name: string; pct: number }[] {
    const targetUserId = userId && userId !== 'team' ? userId : null
    const targetUsers = targetUserId ? salesExecs.filter(u => u.id === targetUserId) : salesExecs

    // Collect team KPI keys
    const kpiKeys = new Set<string>()
    targetUsers.forEach(u => {
      const targets = DEFAULT_KPI_TARGETS[u.team] ?? {}
      Object.keys(targets).forEach(k => kpiKeys.add(k))
    })

    return Array.from(kpiKeys).map(key => {
      let totalPct = 0
      let count = 0
      targetUsers.forEach(u => {
        const targets = DEFAULT_KPI_TARGETS[u.team] ?? {}
        const target = (targets as Record<string, number>)[key]
        if (!target) return
        const wp = weeklyPlans.find(p => p.userId === u.id && p.weekId === weekId)
        const planned = wp ? ((wp.kpiTargets as Record<string, number>)[key] ?? 0) : 0
        if (planned === 0) return
        let actual = 0
        weekDates.forEach(date => {
          const ev = eveningActuals.find(e => e.userId === u.id && e.date === date)
          if (ev) {
            actual += (ev.kpiActual as Record<string, number>)[key] ?? 0
          }
        })
        totalPct += Math.min(150, (actual / planned) * 100)
        count++
      })
      return {
        name: KPI_LABELS[key] ?? key,
        pct: count > 0 ? Math.round(totalPct / count) : 0,
      }
    }).filter(d => d.pct > 0)
  }

  const kpiChartData = useMemo(
    () => getKpiChartData(kpiViewMode === 'team' ? undefined : kpiViewMode),
    [kpiViewMode, weekId, weekDates, eveningActuals, weeklyPlans, salesExecs]
  )

  // ---- PLAN VS ACTUAL ----
  function getPlanVsActual(userId: string, date: string) {
    const morning = morningPlans.find(p => p.userId === userId && p.date === date)
    const evening = eveningActuals.find(e => e.userId === userId && e.date === date)
    if (!morning && !evening) return []
    const user = users.find(u => u.id === userId)
    const teamTargets = DEFAULT_KPI_TARGETS[user?.team ?? 'OSR'] ?? {}
    return Object.keys(teamTargets).map(key => {
      const committed = morning ? ((morning.kpiCommitment as Record<string, number>)[key] ?? 0) : 0
      const actual = evening ? ((evening.kpiActual as Record<string, number>)[key] ?? 0) : 0
      const gap = actual - committed
      const score = committed > 0 ? Math.round((actual / committed) * 100) : null
      return { key, label: KPI_LABELS[key] ?? key, committed, actual, gap, score }
    }).filter(r => r.committed > 0 || r.actual > 0)
  }

  // ---- ACTIVITY SUMMARY ----
  const activitySummary = useMemo(() => {
    const totalMembers = salesExecs.length
    const plansSubmitted = salesExecs.filter(u =>
      weeklyPlans.some(p => p.userId === u.id && p.weekId === weekId)
    ).length
    const actualsSubmitted = salesExecs.filter(u =>
      eveningActuals.some(e => e.userId === u.id && weekDates.includes(e.date))
    ).length
    const newLeads = leads.filter(l => weekDates.includes(l.createdAt.split('T')[0])).length
    const completedFollowUps = followUps.filter(
      f => f.status === 'done' && weekDates.includes(f.dueDate)
    ).length
    return { totalMembers, plansSubmitted, actualsSubmitted, newLeads, completedFollowUps }
  }, [salesExecs, weeklyPlans, eveningActuals, leads, followUps, weekId, weekDates])

  // ---- DAILY TAB ----
  const dailyRows = useMemo(() => {
    return salesExecs.map(user => {
      const hasPlan = morningPlans.some(p => p.userId === user.id && p.date === selectedDate)
      const hasActual = eveningActuals.some(e => e.userId === user.id && e.date === selectedDate)
      const score = getDayScore(user.id, selectedDate)
      return { user, hasPlan, hasActual, score }
    })
  }, [salesExecs, morningPlans, eveningActuals, selectedDate])

  const planCompliancePie = useMemo(() => {
    const submitted = dailyRows.filter(r => r.hasPlan).length
    const notSubmitted = dailyRows.length - submitted
    return [
      { name: 'Submitted', value: submitted },
      { name: 'Not Submitted', value: notSubmitted },
    ]
  }, [dailyRows])

  // ---- MONTHLY TAB ----
  const past4Weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const wid = getWeekIdFromOffset(-(3 - i))
      const { start, end } = getWeekBoundsLocal(wid)
      const dates = getWeekDates(wid)
      const label = `W${wid.split('-W')[1]}`
      return { wid, start, end, dates, label }
    })
  }, [])

  const monthlyMemberData = useMemo(() => {
    return salesExecs.map(user => {
      const weekGrades = past4Weeks.map(w => {
        const total = w.dates.reduce((sum, date) => sum + (getDayScore(user.id, date) ?? 0), 0)
        return { label: w.label, grade: gradeFromScore(total), score: total }
      })
      return { user, weekGrades }
    })
  }, [salesExecs, past4Weeks])

  // Revenue pipeline by team
  const revenuePipeline = useMemo(() => {
    const teamMap: Record<string, number> = {}
    leads.forEach(lead => {
      const user = users.find(u => u.id === lead.userId)
      if (!user) return
      teamMap[user.team] = (teamMap[user.team] ?? 0) + lead.expectedValue
    })
    return Object.entries(teamMap).map(([team, value]) => ({ team, value }))
  }, [leads, users])

  const recentWarnings = useMemo(() => warnings.slice(-10).reverse(), [warnings])

  // ---- EXPORT ----
  function copyWhatsAppSummary() {
    const lines: string[] = []
    lines.push(`*Weekly Report - ${weekLabel}*`)
    lines.push('')
    lines.push('*Scorecard:*')
    scorecardRows.forEach(row => {
      lines.push(`${row.user.name}: ${row.total > 0 ? '+' : ''}${row.total} (${row.grade})`)
    })
    lines.push('')
    lines.push('*Activity:*')
    lines.push(`Plans submitted: ${activitySummary.plansSubmitted}/${activitySummary.totalMembers}`)
    lines.push(`Actuals submitted: ${activitySummary.actualsSubmitted}/${activitySummary.totalMembers}`)
    lines.push(`New leads: ${activitySummary.newLeads}`)
    lines.push(`Follow-ups done: ${activitySummary.completedFollowUps}`)
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
  }

  function toggleDay(key: string) {
    setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={copyWhatsAppSummary}
            className="flex items-center gap-1 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Copy size={14} />
            Copy WhatsApp Summary
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer size={14} />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit print:hidden">
        {(['daily', 'weekly', 'monthly'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* WEEKLY TAB */}
      {tab === 'weekly' && (
        <div className="space-y-6">
          {/* Week selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="font-semibold text-white">{weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : weekId}</div>
              <div className="text-xs text-gray-400">{weekLabel}</div>
            </div>
            <button
              onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
              className="p-1 rounded hover:bg-gray-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Activity Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList size={16} className="text-indigo-400" />
                <span className="text-xs text-gray-400">Plans Submitted</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {activitySummary.plansSubmitted}
                <span className="text-sm text-gray-400">/{activitySummary.totalMembers}</span>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-xs text-gray-400">Actuals Submitted</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {activitySummary.actualsSubmitted}
                <span className="text-sm text-gray-400">/{activitySummary.totalMembers}</span>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-blue-400" />
                <span className="text-xs text-gray-400">New Leads Added</span>
              </div>
              <div className="text-2xl font-bold text-white">{activitySummary.newLeads}</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Follow-ups Done</span>
              </div>
              <div className="text-2xl font-bold text-white">{activitySummary.completedFollowUps}</div>
            </div>
          </div>

          {/* Scorecard Table */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Weekly Scorecard</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-3 text-gray-400 font-medium">Member</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} className="p-3 text-gray-400 font-medium text-center">{d}</th>
                  ))}
                  <th className="p-3 text-gray-400 font-medium text-center">Total</th>
                  <th className="p-3 text-gray-400 font-medium text-center">Grade</th>
                  <th className="p-3 text-gray-400 font-medium text-center">Achieve%</th>
                </tr>
              </thead>
              <tbody>
                {scorecardRows.map(row => (
                  <tr key={row.user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3 font-medium text-white">{row.user.name}</td>
                    {row.dayScores.map((score, i) => (
                      <td key={i} className="p-3 text-center">
                        {score === null ? (
                          <span className="text-gray-600">—</span>
                        ) : (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              color: scoreColor(score),
                              backgroundColor: scoreColor(score) + '22',
                            }}
                          >
                            {score > 0 ? `+${score}` : score}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold" style={{ color: scoreColor(row.total) }}>
                      {row.total > 0 ? `+${row.total}` : row.total}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className="inline-block w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                        style={{
                          backgroundColor: GRADE_COLOR[row.grade] + '33',
                          color: GRADE_COLOR[row.grade],
                          border: `1px solid ${GRADE_COLOR[row.grade]}55`,
                        }}
                      >
                        {row.grade}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-300">{row.achievementPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* KPI Performance Chart */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">KPI Performance</h2>
              <select
                value={kpiViewMode}
                onChange={e => setKpiViewMode(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="team">Team Average</option>
                {salesExecs.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            {kpiChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                No KPI data available for this week
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kpiChartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 150]} unit="%" />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Achievement']}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f9fafb' }}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {kpiChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.pct >= 100 ? '#22c55e' : entry.pct >= 80 ? '#f97316' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Plan vs Actual */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="font-semibold text-white mb-4">Plan vs Actual (by Member)</h2>
            <div className="space-y-2">
              {salesExecs.map(user => (
                <div key={user.id} className="border border-gray-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/60 font-medium text-gray-200 text-sm">
                    {user.name} — {user.team}
                  </div>
                  {weekDates.map((date, di) => {
                    const rows = getPlanVsActual(user.id, date)
                    if (rows.length === 0) return null
                    const key = `${user.id}-${date}`
                    const isOpen = expandedDays[key] ?? false
                    return (
                      <div key={date} className="border-t border-gray-800">
                        <button
                          className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-800/40 transition-colors"
                          onClick={() => toggleDay(key)}
                        >
                          <span className="text-gray-300">{DAY_LABELS[di]} — {date}</span>
                          {isOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  <th className="text-left py-1.5 text-gray-400">KPI</th>
                                  <th className="text-right py-1.5 text-gray-400">Committed</th>
                                  <th className="text-right py-1.5 text-gray-400">Actual</th>
                                  <th className="text-right py-1.5 text-gray-400">Gap</th>
                                  <th className="text-right py-1.5 text-gray-400">Score%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map(r => (
                                  <tr key={r.key} className="border-b border-gray-800">
                                    <td className="py-1.5 text-gray-300">{r.label}</td>
                                    <td className="py-1.5 text-right text-gray-300">{r.committed}</td>
                                    <td className="py-1.5 text-right text-gray-300">{r.actual}</td>
                                    <td
                                      className="py-1.5 text-right font-medium"
                                      style={{ color: r.gap >= 0 ? '#22c55e' : '#ef4444' }}
                                    >
                                      {r.gap >= 0 ? `+${r.gap}` : r.gap}
                                    </td>
                                    <td className="py-1.5 text-right">
                                      {r.score !== null ? (
                                        <span
                                          style={{
                                            color: r.score >= 100 ? '#22c55e' : r.score >= 80 ? '#f97316' : '#ef4444',
                                          }}
                                        >
                                          {r.score}%
                                        </span>
                                      ) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DAILY TAB */}
      {tab === 'daily' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">Member Status — {selectedDate}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3 text-gray-400 font-medium">Name</th>
                    <th className="p-3 text-gray-400 font-medium text-center">Plan?</th>
                    <th className="p-3 text-gray-400 font-medium text-center">Actual?</th>
                    <th className="p-3 text-gray-400 font-medium text-center">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map(row => (
                    <tr key={row.user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 font-medium text-white">{row.user.name}</td>
                      <td className="p-3 text-center">
                        {row.hasPlan ? (
                          <span className="text-green-400 text-xs font-bold">YES</span>
                        ) : (
                          <span className="text-red-400 text-xs">NO</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.hasActual ? (
                          <span className="text-green-400 text-xs font-bold">YES</span>
                        ) : (
                          <span className="text-red-400 text-xs">NO</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.score === null ? (
                          <span className="text-gray-600 text-xs">—</span>
                        ) : (
                          <span
                            className="text-xs font-bold"
                            style={{ color: scoreColor(row.score) }}
                          >
                            {row.score > 0 ? `+${row.score}` : row.score}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Plan Compliance Pie */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <h2 className="font-semibold text-white mb-4">Plan Compliance</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={planCompliancePie}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Submitted ({planCompliancePie[0].value})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Not Submitted ({planCompliancePie[1].value})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY TAB */}
      {tab === 'monthly' && (
        <div className="space-y-6">
          {/* Grade Progression */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="font-semibold text-white mb-4">4-Week Grade Progression</h2>
            <div className="space-y-3">
              {monthlyMemberData.map(({ user, weekGrades }) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-300 truncate">{user.name}</div>
                  <div className="flex gap-2 flex-1">
                    {weekGrades.map((wg, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full h-8 rounded flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: GRADE_COLOR[wg.grade] + '33',
                            color: GRADE_COLOR[wg.grade],
                            border: `1px solid ${GRADE_COLOR[wg.grade]}55`,
                          }}
                        >
                          {wg.grade}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{wg.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Pipeline by Team */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="font-semibold text-white mb-4">Revenue Pipeline by Team</h2>
            {revenuePipeline.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                No pipeline data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenuePipeline} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="team" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Pipeline']}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#f9fafb' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Warning History */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="font-semibold text-white mb-4">Recent Warning History</h2>
            {recentWarnings.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-6">No warnings issued</div>
            ) : (
              <div className="space-y-2">
                {recentWarnings.map(w => {
                  const member = users.find(u => u.id === w.userId)
                  const levelColor =
                    w.level === 'red'
                      ? '#ef4444'
                      : w.level === 'orange'
                      ? '#f97316'
                      : '#eab308'
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-800/40"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: levelColor }}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white">
                          {member?.name ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {w.weekId}
                        </span>
                        {w.managerNote && (
                          <div className="text-xs text-gray-400 mt-0.5">{w.managerNote}</div>
                        )}
                      </div>
                      <span
                        className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                        style={{ color: levelColor, backgroundColor: levelColor + '22' }}
                      >
                        {w.level}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
