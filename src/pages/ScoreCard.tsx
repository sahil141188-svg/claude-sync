import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Printer,
  User as UserIcon,
  Target,
  BarChart2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import useERPStore, { KPI_LABELS, DEFAULT_KPI_TARGETS } from '../store/erpStore'

// ─── helpers ────────────────────────────────────────────────────────────────

function getWeekId(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - offset * 7)
  const year = d.getFullYear()
  const start = new Date(d)
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const week = Math.ceil(
    ((start.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
  )
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getWeekBounds(weekId: string): { start: string; end: string } {
  const [yearStr, wStr] = weekId.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(wStr)
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay()
  const mondayOffset = dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek
  const firstMonday = new Date(jan1)
  firstMonday.setDate(jan1.getDate() + mondayOffset)
  const start = new Date(firstMonday)
  start.setDate(firstMonday.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 5)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function getDatesInWeek(weekId: string): string[] {
  const { start, end } = getWeekBounds(weekId)
  const dates: string[] = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function dayLabel(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'from-purple-600 to-purple-800'
    case 'A': return 'from-green-600 to-green-800'
    case 'B': return 'from-blue-600 to-blue-800'
    case 'C': return 'from-yellow-500 to-yellow-700'
    case 'D': return 'from-orange-500 to-orange-700'
    default:  return 'from-red-600 to-red-800'
  }
}

function gradeBadgeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'A': return 'bg-green-100 text-green-800 border-green-300'
    case 'B': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300'
    default:  return 'bg-red-100 text-red-800 border-red-300'
  }
}

function cellColor(pct: number): string {
  if (pct >= 100) return 'bg-green-100 text-green-800'
  if (pct >= 80)  return 'bg-yellow-100 text-yellow-800'
  if (pct >= 60)  return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ScoreCard() {
  const { userId } = useParams<{ userId?: string }>()
  const {
    currentUser,
    users,
    weekScores,
    morningPlans,
    eveningActuals,
    attendance,
    computeWeekScore,
    coachingNotes,
    addCoachingNote,
  } = useERPStore()

  const targetUser = userId ? users.find(u => u.id === userId) ?? currentUser : currentUser

  const currentWeekId = getWeekId(0)
  const weekId = currentWeekId

  // Ensure score is computed
  const weekScore = useMemo(() => {
    if (!targetUser) return null
    const existing = weekScores.find(s => s.userId === targetUser.id && s.weekId === weekId)
    if (existing) return existing
    return computeWeekScore(targetUser.id, weekId)
  }, [targetUser, weekScores, weekId, computeWeekScore])

  const dates = useMemo(() => getDatesInWeek(weekId), [weekId])
  const { start, end } = useMemo(() => getWeekBounds(weekId), [weekId])

  // KPI keys for this user's team
  const teamTargets = targetUser ? DEFAULT_KPI_TARGETS[targetUser.team] ?? {} : {}
  const kpiKeys = Object.keys(teamTargets)

  // Build per-day data
  const dayData = useMemo(() => {
    if (!targetUser) return []
    return dates.map(date => {
      const morning = morningPlans.find(p => p.userId === targetUser.id && p.date === date)
      const evening = eveningActuals.find(e => e.userId === targetUser.id && e.date === date)
      const att = attendance.find(a => a.userId === targetUser.id && a.date === date)
      const committed: Record<string, number> = morning ? (morning.kpiCommitment as Record<string, number>) : {}
      const actual: Record<string, number> = evening ? (evening.kpiActual as Record<string, number>) : {}
      const dayScoreEntry = (weekScore as any)?.dayScores?.find
        ? (weekScore as any).dayScores.find((d: any) => d.date === date)
        : null
      return { date, morning, evening, att, committed, actual, dayScore: dayScoreEntry }
    })
  }, [targetUser, dates, morningPlans, eveningActuals, attendance, weekScore])

  // KPI grid: per KPI, per day pct
  const kpiGrid = useMemo(() => {
    return kpiKeys.map(key => {
      const weekTarget = (teamTargets as Record<string, number>)[key] ?? 0
      const dailyTarget = weekTarget > 0 ? weekTarget / 6 : 0
      const cells = dayData.map(dd => {
        const committed = dd.committed[key] ?? dailyTarget
        const actual = dd.actual[key] ?? 0
        const pct = committed > 0 ? Math.round((actual / committed) * 100) : null
        return { actual, committed, pct }
      })
      const totalActual = dayData.reduce((s, dd) => s + (dd.actual[key] ?? 0), 0)
      const totalTarget = weekTarget
      const totalPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null
      return { key, cells, totalActual, totalTarget, totalPct }
    })
  }, [kpiKeys, dayData, teamTargets])

  // Leaderboard rank
  const rank = useMemo(() => {
    if (!targetUser) return { rank: 0, total: 0 }
    const teamMembers = users.filter(
      u => u.team === targetUser.team && u.role === 'sales_exec'
    )
    const scores = teamMembers.map(u => {
      const s = weekScores.find(ws => ws.userId === u.id && ws.weekId === weekId)
      return { userId: u.id, score: s ? (s as any).finalScore ?? 0 : 0 }
    })
    scores.sort((a, b) => b.score - a.score)
    const idx = scores.findIndex(s => s.userId === targetUser.id)
    return { rank: idx + 1, total: scores.length }
  }, [targetUser, users, weekScores, weekId])

  // Grade history (last 6 weeks)
  const gradeHistory = useMemo(() => {
    if (!targetUser) return []
    return Array.from({ length: 6 }, (_, i) => {
      const wid = getWeekId(5 - i)
      const s = weekScores.find(ws => ws.userId === targetUser.id && ws.weekId === wid)
      return { weekId: wid, grade: s ? (s as any).grade ?? '–' : '–' }
    })
  }, [targetUser, weekScores])

  // Score breakdown
  const breakdown = useMemo(() => {
    const ds: any[] = (weekScore as any)?.dayScores ?? []
    let missingPlans = 0
    let missingPlansDays = 0
    let kpiDeductions = 0
    let taskPenalties = 0
    let attendancePenalty = 0
    let bonus = 0

    for (const d of ds) {
      const score: number = d.score ?? d.total ?? 0
      const issues: string[] = d.issues ?? []
      const hasMissing = issues.some((i: string) => i.includes('morning plan') || i.includes('No morning'))
      if (hasMissing) {
        missingPlans += -10
        missingPlansDays++
      }
      const kpiIssues = issues.filter((i: string) => i.includes('achieved'))
      kpiDeductions += kpiIssues.length > 0 ? -kpiIssues.length * 5 : 0
      const attIssues = issues.filter((i: string) => i === 'Absent' || i === 'Late')
      for (const a of attIssues) {
        if (a === 'Absent') attendancePenalty -= 10
        if (a === 'Late') attendancePenalty -= 3
      }
      if (score > 0) bonus += score
    }

    return { missingPlans, missingPlansDays, kpiDeductions, taskPenalties, attendancePenalty, bonus }
  }, [weekScore])

  // Attendance summary
  const attSummary = useMemo(() => {
    if (!targetUser) return { present: 0, late: 0, absent: 0, pct: 0 }
    const records = dates.map(d => attendance.find(a => a.userId === targetUser.id && a.date === d))
    const present = records.filter(r => r?.status === 'present' || r?.status === 'wfh' || r?.status === 'meeting').length
    const late = records.filter(r => r?.status === 'late').length
    const absent = records.filter(r => r?.status === 'absent').length
    const pct = Math.round(((present + late) / dates.length) * 100)
    return { present, late, absent, pct }
  }, [targetUser, dates, attendance])

  // Focus suggestions
  const focusSuggestions = useMemo(() => {
    return kpiGrid
      .filter(k => k.totalPct !== null && k.totalPct < 100)
      .sort((a, b) => (a.totalPct ?? 100) - (b.totalPct ?? 100))
      .slice(0, 3)
      .map(k => `${KPI_LABELS[k.key] ?? k.key} (${k.totalPct}%)`)
  }, [kpiGrid])

  // Manager comment
  const isManager =
    currentUser?.role === 'manager' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin'

  const existingComment = useMemo(() => {
    if (!targetUser) return null
    return coachingNotes
      .filter(n => n.memberId === targetUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  }, [coachingNotes, targetUser])

  const [comment, setComment] = useState(existingComment?.note ?? '')
  const [commentSaved, setCommentSaved] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  function saveComment() {
    if (!currentUser || !targetUser) return
    addCoachingNote({ memberId: targetUser.id, managerId: currentUser.id, note: comment })
    setCommentSaved(true)
    setTimeout(() => setCommentSaved(false), 2000)
  }

  if (!targetUser) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <UserIcon className="w-8 h-8 mr-2" /> User not found.
      </div>
    )
  }

  const finalScore: number = (weekScore as any)?.finalScore ?? 0
  const grade: string = (weekScore as any)?.grade ?? '–'
  const achievementPct: number = Math.round((weekScore as any)?.achievementPct ?? 0)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 print:p-0 print:space-y-4">
      {/* PRINT BUTTON */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          <Printer className="w-4 h-4" /> Print / Export
        </button>
      </div>

      {/* HEADER CARD */}
      <div className={`rounded-2xl bg-gradient-to-br ${gradeColor(grade)} text-white p-6 shadow-xl`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{targetUser.name}</h1>
            <p className="text-white/80 text-sm mt-1">
              Team: <span className="font-semibold">{targetUser.team}</span>
              &nbsp;|&nbsp;
              Week: {formatDate(start)} – {formatDate(end)}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <div className="text-4xl font-black">{finalScore > 0 ? `+${finalScore}` : finalScore}</div>
              <div className="text-xs text-white/70 mt-1 uppercase tracking-wide">Week Score</div>
            </div>
            <div className="text-center">
              <span className={`inline-block text-3xl font-black px-4 py-2 rounded-xl border-2 ${gradeBadgeColor(grade)}`}>
                {grade}
              </span>
              <div className="text-xs text-white/70 mt-1 uppercase tracking-wide">Grade</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-green-300">{achievementPct}%</div>
            <div className="text-sm text-white/80 mt-1">Achieved</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-black">
              #{rank.rank}
              <span className="text-lg font-normal text-white/60"> / {rank.total}</span>
            </div>
            <div className="text-sm text-white/80 mt-1">Team Rank</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-black">{attSummary.pct}%</div>
            <div className="text-sm text-white/80 mt-1">Attendance</div>
          </div>
        </div>
      </div>

      {/* DAILY KPI GRID TABLE */}
      <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" /> Daily KPI Grid
        </h2>
        <table className="w-full text-sm border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200">KPI</th>
              {dates.map(d => (
                <th key={d} className="px-2 py-2 font-semibold text-gray-600 border border-gray-200 text-center">
                  <div>{dayLabel(d)}</div>
                  <div className="text-xs font-normal text-gray-400">{formatDate(d)}</div>
                </th>
              ))}
              <th className="px-2 py-2 font-semibold text-gray-600 border border-gray-200 text-center">Total</th>
              <th className="px-2 py-2 font-semibold text-gray-600 border border-gray-200 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {kpiGrid.map(row => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700 border border-gray-200 whitespace-nowrap">
                  {KPI_LABELS[row.key] ?? row.key}
                </td>
                {row.cells.map((cell, i) => (
                  <td key={dates[i]} className="px-2 py-2 border border-gray-200 text-center">
                    {cell.pct !== null ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${cellColor(cell.pct)}`}>
                        {cell.pct}%
                      </span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-2 border border-gray-200 text-center font-semibold text-gray-700">
                  {row.totalActual}
                </td>
                <td className="px-2 py-2 border border-gray-200 text-center">
                  {row.totalPct !== null ? (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${cellColor(row.totalPct)}`}>
                      {row.totalPct}%
                    </span>
                  ) : (
                    <span className="text-gray-300">–</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Day total row */}
            <tr className="bg-gray-100 font-semibold">
              <td className="px-3 py-2 border border-gray-200 text-gray-700">Day Score</td>
              {dayData.map(dd => {
                const s = dd.dayScore?.score ?? dd.dayScore?.total ?? 0
                return (
                  <td key={dd.date} className={`px-2 py-2 border border-gray-200 text-center ${s >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {s > 0 ? `+${s}` : s}
                  </td>
                )
              })}
              <td className={`px-2 py-2 border border-gray-200 text-center ${finalScore >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {finalScore > 0 ? `+${finalScore}` : finalScore}
              </td>
              <td className="px-2 py-2 border border-gray-200 text-center text-gray-500">–</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DAILY SUBMISSION STATUS */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" /> Daily Submission Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {dayData.map(dd => {
            const dayS = dd.dayScore?.score ?? dd.dayScore?.total ?? 0
            const isExpanded = expandedDay === dd.date
            return (
              <div key={dd.date} className="space-y-1">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : dd.date)}
                  className={`w-full rounded-xl border-2 p-3 text-center cursor-pointer transition-all
                    ${isExpanded ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}
                >
                  <div className="text-xs font-bold text-gray-500 uppercase">{dayLabel(dd.date)}</div>
                  <div className="text-xs text-gray-400 mb-2">{formatDate(dd.date)}</div>
                  <div className="flex justify-between text-xs gap-1">
                    <span className="flex items-center gap-0.5">
                      {dd.morning ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-gray-500">AM</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      {dd.evening ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                      <span className="text-gray-500">PM</span>
                    </span>
                  </div>
                  <div className={`mt-2 text-sm font-bold ${dayS >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {dayS > 0 ? `+${dayS}` : dayS}
                  </div>
                  {isExpanded ? <ChevronUp className="w-3 h-3 mx-auto text-gray-400 mt-1" /> : <ChevronDown className="w-3 h-3 mx-auto text-gray-400 mt-1" />}
                </button>
              </div>
            )
          })}
        </div>

        {/* Expanded day detail */}
        {expandedDay && (() => {
          const dd = dayData.find(d => d.date === expandedDay)
          if (!dd) return null
          return (
            <div className="mt-4 border border-indigo-200 rounded-xl bg-indigo-50 p-4">
              <h3 className="font-semibold text-indigo-800 mb-3">
                {dayLabel(dd.date)} — {formatDate(dd.date)} Detail
              </h3>
              {kpiKeys.length > 0 && (dd.morning || dd.evening) ? (
                <table className="text-sm w-full">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-1">KPI</th>
                      <th className="pb-1 text-center">Committed</th>
                      <th className="pb-1 text-center">Actual</th>
                      <th className="pb-1 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiKeys.map(key => {
                      const committed = dd.committed[key] ?? 0
                      const actual = dd.actual[key] ?? 0
                      const pct = committed > 0 ? Math.round((actual / committed) * 100) : null
                      return (
                        <tr key={key} className="border-t border-indigo-100">
                          <td className="py-1 text-gray-700">{KPI_LABELS[key] ?? key}</td>
                          <td className="py-1 text-center text-gray-500">{committed || '–'}</td>
                          <td className="py-1 text-center font-medium text-gray-800">{actual || '–'}</td>
                          <td className="py-1 text-center">
                            {pct !== null ? (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${cellColor(pct)}`}>{pct}%</span>
                            ) : '–'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No data submitted for this day.</p>
              )}
              {dd.dayScore?.issues?.length > 0 && (
                <div className="mt-3">
                  {dd.dayScore.issues.map((issue: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-orange-700 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* SCORE BREAKDOWN */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-500" /> Score Breakdown
        </h2>
        <div className="space-y-2">
          <BreakdownRow
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            label="Missing Plans"
            value={breakdown.missingPlans}
            note={`${breakdown.missingPlansDays} day${breakdown.missingPlansDays !== 1 ? 's' : ''} missed`}
          />
          <BreakdownRow
            icon={<TrendingDown className="w-4 h-4 text-orange-400" />}
            label="KPI Deductions"
            value={breakdown.kpiDeductions}
          />
          <BreakdownRow
            icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
            label="Task Penalties"
            value={breakdown.taskPenalties}
          />
          <BreakdownRow
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="Attendance"
            value={breakdown.attendancePenalty}
          />
          <BreakdownRow
            icon={<Star className="w-4 h-4 text-yellow-500" />}
            label="Bonus Points"
            value={breakdown.bonus}
            positive
          />
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-bold text-gray-800">
            <span>FINAL</span>
            <span className={`text-lg ${finalScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {finalScore > 0 ? `+${finalScore}` : finalScore} pts &nbsp;
              <span className="text-sm text-gray-500 font-normal">({achievementPct}% achieved)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ATTENDANCE SUMMARY */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" /> Attendance Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AttBox label="Present" value={attSummary.present} color="text-green-600" />
          <AttBox label="Late" value={attSummary.late} color="text-yellow-600" />
          <AttBox label="Absent" value={attSummary.absent} color="text-red-600" />
          <AttBox label="Attendance %" value={`${attSummary.pct}%`} color={attSummary.pct >= 80 ? 'text-green-600' : 'text-orange-600'} />
        </div>
      </div>

      {/* GRADE HISTORY */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Grade History (Last 6 Weeks)
        </h2>
        <div className="flex gap-3 flex-wrap">
          {gradeHistory.map(h => (
            <div key={h.weekId} className="flex flex-col items-center">
              <span className={`inline-block text-lg font-black px-3 py-1 rounded-lg border ${gradeBadgeColor(h.grade)}`}>
                {h.grade}
              </span>
              <span className="text-xs text-gray-400 mt-1">{h.weekId.replace('-W', ' W')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* NEXT WEEK FOCUS */}
      {focusSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5" /> Next Week Focus Suggestions
          </h2>
          <p className="text-blue-700 text-sm">
            <TrendingUp className="w-4 h-4 inline mr-1 text-blue-500" />
            Focus areas: {focusSuggestions.join(' | ')} — aim for 100%
          </p>
        </div>
      )}

      {/* MANAGER COMMENT */}
      {isManager && (
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" /> Manager Comment
          </h2>
          <textarea
            className="w-full border border-gray-300 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            rows={3}
            placeholder="Add coaching note or feedback for this week..."
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={saveComment}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition"
            >
              Save Comment
            </button>
            {commentSaved && (
              <span className="text-green-600 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function BreakdownRow({
  icon,
  label,
  value,
  note,
  positive,
}: {
  icon: React.ReactNode
  label: string
  value: number
  note?: string
  positive?: boolean
}) {
  if (value === 0) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        {icon}
        <span>{label}</span>
        {note && <span className="text-gray-400 text-xs">({note})</span>}
      </div>
      <span className={`text-sm font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {positive && value > 0 ? `+${value}` : value} pts
      </span>
    </div>
  )
}

function AttBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
