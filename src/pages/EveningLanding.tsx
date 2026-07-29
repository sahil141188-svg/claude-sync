import React, { useState, useEffect } from 'react'
import { fmtLocalDate, todayLocal } from '../utils/dates'
import { useNavigate } from 'react-router-dom'
import {
  Moon, Clock, AlertTriangle, CheckCircle, ChevronRight,
  Plus, Trash2, Trophy, TrendingDown, TrendingUp, Star,
  ArrowLeft, Target, Users, PhoneCall
} from 'lucide-react'
import useERPStore, { KPI_LABELS } from '../store/erpStore'
import type { KPITarget, LeadStage } from '../types'

type TaskStatusVal = 'done' | 'partial' | 'not_done'

const NOT_DONE_REASONS = [
  'Customer not available',
  'Needed more info',
  'Will do tomorrow',
  'External delay',
  'Forgot',
]

interface NewLead {
  name: string
  company: string
  phone: string
  expectedValue: number
  stage: LeadStage
}

function getKpiScoreImpact(actual: number, committed: number): number {
  if (committed === 0) return 0
  const pct = (actual / committed) * 100
  if (pct >= 110) return 5
  if (pct >= 100) return 0
  if (pct >= 90) return -5
  if (pct >= 70) return -10
  if (pct >= 50) return -15
  return -20
}

function getGapPct(actual: number, committed: number): number | null {
  if (committed === 0) return null
  return ((actual - committed) / committed) * 100
}

function computeGrade(score: number): string {
  if (score >= 0) return 'S'
  if (score >= -20) return 'A'
  if (score >= -50) return 'B'
  if (score >= -100) return 'C'
  if (score >= -150) return 'D'
  return 'F'
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-yellow-400'
    case 'A': return 'text-green-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-orange-400'
    case 'D': return 'text-red-400'
    default: return 'text-red-600'
  }
}

function todayStr(): string {
  return todayLocal()
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function useCountdown(): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function calc() {
      const now = new Date()
      const deadline = new Date(now)
      deadline.setHours(19, 0, 0, 0)
      const diff = deadline.getTime() - now.getTime()
      if (diff <= 0) {
        setLabel('Deadline passed')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(`${h}h ${m}m ${s}s remaining`)
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [])
  return label
}

export default function EveningLanding() {
  const navigate = useNavigate()
  const { currentUser, getTodayMorning, getTodayEvening, submitEveningActual, addLead, getWeekScore, computeWeekScore } = useERPStore()

  const countdown = useCountdown()
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [submitted, setSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState<{ todayScore: number; grade: string; weekScore: number } | null>(null)

  const userId = currentUser?.id ?? ''
  const morningPlan = getTodayMorning(userId)
  const existingEvening = getTodayEvening(userId)

  // KPI actuals state — keyed by kpi key
  const [kpiActual, setKpiActual] = useState<Record<string, number>>(() => {
    if (existingEvening) {
      const obj: Record<string, number> = {}
      Object.entries(existingEvening.kpiActual).forEach(([k, v]) => {
        if (v !== undefined) obj[k] = v as number
      })
      return obj
    }
    return {}
  })

  // Task status state
  const tasks = morningPlan?.tasks ?? []
  const [taskStatuses, setTaskStatuses] = useState<TaskStatusVal[]>(() =>
    tasks.map((_, i) => {
      const existing = existingEvening?.taskStatus?.find(t => t.taskIndex === i)
      return existing ? existing.status : 'done'
    })
  )
  const [taskReasons, setTaskReasons] = useState<string[]>(() =>
    tasks.map((_, i) => {
      const existing = existingEvening?.taskStatus?.find(t => t.taskIndex === i)
      return existing?.reason ?? NOT_DONE_REASONS[0]
    })
  )

  // New leads
  const emptyLead = (): NewLead => ({ name: '', company: '', phone: '', expectedValue: 0, stage: 'new' })
  const [newLeads, setNewLeads] = useState<NewLead[]>([])

  // Win of day
  const [winOfDay, setWinOfDay] = useState(existingEvening?.winOfDay ?? '')
  // Kal ki priority
  const [kalKaPriority, setKalKaPriority] = useState(existingEvening?.kalKaPriority ?? '')

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Please login first.</p>
      </div>
    )
  }

  if (!morningPlan) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-300 mb-2">Morning plan not found!</h2>
          <p className="text-red-400 mb-6">Submit morning plan first.</p>
          <button
            onClick={() => navigate('/morning')}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Morning Plan
          </button>
        </div>
      </div>
    )
  }

  const committedKpis: Record<string, number> = {}
  if (morningPlan.kpiCommitment) {
    Object.entries(morningPlan.kpiCommitment).forEach(([k, v]) => {
      if (v !== undefined && v !== null) committedKpis[k] = v as number
    })
  }
  const kpiKeys = Object.keys(committedKpis).filter(k => committedKpis[k] > 0)

  // Live score computation
  let kpiDeductions = 0
  let kpiBonus = 0
  kpiKeys.forEach(k => {
    const committed = committedKpis[k]
    const actual = kpiActual[k] ?? 0
    const impact = getKpiScoreImpact(actual, committed)
    if (impact < 0) kpiDeductions += impact
    if (impact > 0) kpiBonus += impact
  })

  let taskPenalties = 0
  taskStatuses.forEach(s => {
    if (s === 'partial') taskPenalties -= 5
    if (s === 'not_done') taskPenalties -= 10
  })

  const todayScore = kpiDeductions + taskPenalties + kpiBonus
  const grade = computeGrade(todayScore)

  // Week score
  const weekScore = getWeekScore(userId)
  const weekTotal = weekScore ? weekScore.finalScore : 0

  if (existingEvening && !submitted) {
    // Read-only summary view
    const readonlyScore = existingEvening.todayScore ?? 0
    const readonlyGrade = computeGrade(readonlyScore)
    return (
      <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Moon className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-purple-300">Evening Landing</h1>
              <p className="text-gray-400 text-sm">{formatDate(todayStr())}</p>
            </div>
          </div>

          <div className="bg-green-900/30 border border-green-600 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-300 mb-1">Already submitted today!</h2>
            <p className="text-gray-400 text-sm">Submitted at {new Date(existingEvening.submittedAt).toLocaleTimeString('en-IN')}</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-4">
            <h3 className="text-lg font-semibold text-purple-300 mb-4">Score Summary</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300">Today's Score</span>
              <span className={`text-3xl font-bold ${readonlyScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {readonlyScore > 0 ? '+' : ''}{readonlyScore} pts
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Grade</span>
              <span className={`text-3xl font-bold ${gradeColor(readonlyGrade)}`}>{readonlyGrade}</span>
            </div>
          </div>

          {existingEvening.winOfDay && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 font-semibold text-sm">Win of the Day</span>
              </div>
              <p className="text-gray-300">{existingEvening.winOfDay}</p>
            </div>
          )}

          {existingEvening.kalKaPriority && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 font-semibold text-sm">Kal ki Priority</span>
              </div>
              <p className="text-gray-300">{existingEvening.kalKaPriority}</p>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (submitted && submittedData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-8xl mb-6">🚀</div>
          <h1 className="text-3xl font-bold text-green-400 mb-2">Evening Submitted!</h1>
          <p className="text-gray-400 mb-8">Great work today. Keep it up!</p>

          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Today Score</p>
                <p className={`text-2xl font-bold ${submittedData.todayScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {submittedData.todayScore > 0 ? '+' : ''}{submittedData.todayScore}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Grade</p>
                <p className={`text-2xl font-bold ${gradeColor(submittedData.grade)}`}>{submittedData.grade}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Week Total</p>
                <p className={`text-2xl font-bold ${submittedData.weekScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {submittedData.weekScore > 0 ? '+' : ''}{submittedData.weekScore}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl font-bold text-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  function handleSubmit() {
    if (!currentUser || !morningPlan) return
    const date = todayStr()
    const kpiActualTyped: KPITarget = {}
    const kpiGapTyped: KPITarget = {}
    kpiKeys.forEach(k => {
      const committed = committedKpis[k]
      const actual = kpiActual[k] ?? 0
      ;(kpiActualTyped as Record<string, number>)[k] = actual
      ;(kpiGapTyped as Record<string, number>)[k] = actual - committed
    })

    const taskStatusRecords = tasks.map((_, i) => ({
      taskIndex: i,
      status: taskStatuses[i],
      reason: taskStatuses[i] === 'not_done' ? taskReasons[i] : undefined,
    }))

    const submittedAt = new Date().toISOString()
    const submittedOnTime = new Date().getHours() < 19

    submitEveningActual({
      userId: currentUser.id,
      date,
      kpiActual: kpiActualTyped,
      kpiGap: kpiGapTyped,
      taskStatus: taskStatusRecords,
      newLeads: newLeads.filter(l => l.name.trim()).map(l => ({
        userId: currentUser.id,
        name: l.name,
        company: l.company,
        phone: l.phone,
        expectedValue: l.expectedValue,
        stage: l.stage,
        source: 'evening_form',
        nextFollowUp: fmtLocalDate(new Date(Date.now() + 86400000)),
      })),
      winOfDay,
      kalKaPriority,
      submittedAt,
      submittedOnTime,
      todayScore,
    })

    newLeads.forEach(l => {
      if (l.name.trim()) {
        addLead({
          userId: currentUser.id,
          name: l.name,
          company: l.company,
          phone: l.phone,
          expectedValue: l.expectedValue,
          stage: l.stage,
          source: 'evening_form',
          nextFollowUp: fmtLocalDate(new Date(Date.now() + 86400000)),
        })
      }
    })

    const ws = computeWeekScore(currentUser.id)
    setSubmittedData({ todayScore, grade, weekScore: ws?.finalScore ?? 0 })
    setSubmitted(true)
  }

  const deadlinePassed = new Date().getHours() >= 19

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-48">
      <div className="max-w-2xl mx-auto p-4">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Moon className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold text-purple-300">🌙 EVENING LANDING</h1>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Clock className="w-4 h-4" />
            <span>{formatDate(todayStr())} · {now.toLocaleTimeString('en-IN')}</span>
          </div>
          <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-3 flex items-center justify-between">
            <span className="text-purple-300 text-sm font-medium">7 PM tak submit karna zaroori hai</span>
            <span className={`text-sm font-bold ${deadlinePassed ? 'text-red-400' : 'text-yellow-400'}`}>
              ⏰ {countdown}
            </span>
          </div>
        </div>

        {/* SECTION 1 — KPI ACTUALS */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Section 1 — KPI Actuals
          </h2>

          {kpiKeys.length === 0 && (
            <p className="text-gray-500 text-sm">No KPI commitments in morning plan.</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-3">KPI</th>
                  <th className="text-right py-2 pr-3">Committed</th>
                  <th className="text-right py-2 pr-3">Actual</th>
                  <th className="text-right py-2 pr-3">Gap %</th>
                  <th className="text-right py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {kpiKeys.map(k => {
                  const committed = committedKpis[k]
                  const actual = kpiActual[k] ?? 0
                  const gap = getGapPct(actual, committed)
                  const impact = getKpiScoreImpact(actual, committed)
                  return (
                    <tr key={k} className="border-b border-gray-800/60">
                      <td className="py-3 pr-3 text-gray-300 font-medium whitespace-nowrap">
                        {KPI_LABELS[k] ?? k}
                      </td>
                      <td className="py-3 pr-3 text-right text-gray-400">{committed}</td>
                      <td className="py-3 pr-3">
                        <input
                          type="number"
                          min={0}
                          value={kpiActual[k] ?? ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value)
                            setKpiActual(prev => ({ ...prev, [k]: isNaN(val) ? 0 : val }))
                          }}
                          className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-right text-white focus:outline-none focus:border-purple-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {gap === null ? (
                          <span className="text-gray-600">—</span>
                        ) : gap < 0 ? (
                          <span className="text-red-400 flex items-center justify-end gap-1">
                            <TrendingDown className="w-3 h-3" />
                            ▼ {Math.abs(gap).toFixed(1)}%
                          </span>
                        ) : gap === 0 ? (
                          <span className="text-green-400">0%</span>
                        ) : (
                          <span className="text-green-400 flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            ▲ {gap.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-bold ${impact < 0 ? 'text-red-400' : impact > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {impact > 0 ? '+' : ''}{impact} pts
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2 — TASK STATUS */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Section 2 — Task Status
          </h2>

          {tasks.length === 0 && (
            <p className="text-gray-500 text-sm">No tasks in morning plan.</p>
          )}

          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="bg-gray-800/60 rounded-xl p-4">
                <p className="text-gray-300 text-sm mb-3 font-medium">{task.text}</p>
                <div className="flex gap-2 mb-2">
                  {(['done', 'partial', 'not_done'] as TaskStatusVal[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setTaskStatuses(prev => {
                        const next = [...prev]
                        next[i] = s
                        return next
                      })}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                        taskStatuses[i] === s
                          ? s === 'done'
                            ? 'bg-green-600 text-white'
                            : s === 'partial'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-700 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {s === 'done' ? '✅ Done' : s === 'partial' ? '⚠️ Partial' : '❌ Not Done'}
                    </button>
                  ))}
                </div>
                {taskStatuses[i] === 'not_done' && (
                  <select
                    value={taskReasons[i]}
                    onChange={e => setTaskReasons(prev => {
                      const next = [...prev]
                      next[i] = e.target.value
                      return next
                    })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
                  >
                    {NOT_DONE_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3 — NEW LEADS */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Section 3 — New Leads Today
            </h2>
            <button
              onClick={() => setNewLeads(prev => [...prev, emptyLead()])}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>

          {newLeads.length === 0 && (
            <p className="text-gray-500 text-sm">No new leads added. Click + Add Lead to add one.</p>
          )}

          <div className="space-y-4">
            {newLeads.map((lead, i) => (
              <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 relative">
                <button
                  onClick={() => setNewLeads(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="text-gray-400 text-xs font-semibold mb-3 uppercase tracking-wide">Lead #{i + 1}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Name</label>
                    <input
                      value={lead.name}
                      onChange={e => setNewLeads(prev => prev.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Company</label>
                    <input
                      value={lead.company}
                      onChange={e => setNewLeads(prev => prev.map((l, idx) => idx === i ? { ...l, company: e.target.value } : l))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Phone</label>
                    <input
                      value={lead.phone}
                      onChange={e => setNewLeads(prev => prev.map((l, idx) => idx === i ? { ...l, phone: e.target.value } : l))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Expected Value (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={lead.expectedValue || ''}
                      onChange={e => setNewLeads(prev => prev.map((l, idx) => idx === i ? { ...l, expectedValue: parseFloat(e.target.value) || 0 } : l))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-500 text-xs mb-1 block">Stage</label>
                    <select
                      value={lead.stage}
                      onChange={e => setNewLeads(prev => prev.map((l, idx) => idx === i ? { ...l, stage: e.target.value as LeadStage } : l))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
                    >
                      {(['new', 'contacted', 'interested', 'demo', 'proposal', 'negotiation', 'won', 'lost'] as LeadStage[]).map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 — WIN OF THE DAY */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Section 4 — Win of the Day
          </h2>
          <div className="relative">
            <textarea
              value={winOfDay}
              onChange={e => setWinOfDay(e.target.value.slice(0, 100))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-yellow-500 pr-16"
              placeholder="Aaj ka sabse bada win kya tha?"
            />
            <span className={`absolute bottom-3 right-3 text-xs ${winOfDay.length >= 90 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {winOfDay.length}/100
            </span>
          </div>
        </div>

        {/* SECTION 5 — KAL KI PRIORITY */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-blue-400" />
            Section 5 — Kal ki Priority
          </h2>
          <input
            value={kalKaPriority}
            onChange={e => setKalKaPriority(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder="Kal sabse important kya hai?"
          />
        </div>

        {/* Spacer for sticky panel */}
        <div className="h-4" />
      </div>

      {/* SECTION 6 — LIVE SCORE PREVIEW (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="bg-gray-900 border border-purple-700 rounded-2xl p-4 shadow-2xl shadow-purple-900/50">
            <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wider">Live Score Preview</p>
            <div className="grid grid-cols-4 gap-2 text-sm mb-3">
              <div className="text-center">
                <p className="text-gray-500 text-xs">KPI Deduct</p>
                <p className={`font-bold ${kpiDeductions < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {kpiDeductions === 0 ? '0' : kpiDeductions} pts
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Task Penalty</p>
                <p className={`font-bold ${taskPenalties < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {taskPenalties === 0 ? '0' : taskPenalties} pts
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Bonus</p>
                <p className={`font-bold ${kpiBonus > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  +{kpiBonus} pts
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Week So Far</p>
                <p className={`font-bold ${weekTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {weekTotal > 0 ? '+' : ''}{weekTotal}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2 mb-3 flex items-center justify-between">
              <div>
                <span className="text-gray-400 text-xs mr-2">TODAY TOTAL</span>
                <span className={`text-xl font-bold ${todayScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {todayScore > 0 ? '+' : ''}{todayScore} pts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">GRADE</span>
                <span className={`text-2xl font-black ${gradeColor(grade)}`}>{grade}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
            >
              <Star className="w-5 h-5" />
              Submit Evening Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
