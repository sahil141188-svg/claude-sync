import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Target,
  Trophy,
  BookOpen,
  Tag,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Lock,
} from 'lucide-react'
import { useERPStore, DEFAULT_KPI_TARGETS, KPI_LABELS } from '../store/erpStore'
import type { KPITarget } from '../types'

function getWeekId(date?: Date): string {
  const d = date ? new Date(date) : new Date()
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

function getPrevWeekId(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return getWeekId(d)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WeeklyPlan() {
  const navigate = useNavigate()
  const {
    currentUser,
    getWeeklyPlan,
    getWeekScore,
    submitWeeklyPlan,
    getWeekBounds,
    assignedTasks,
    eveningActuals,
  } = useERPStore()

  const today = new Date()
  const isMonday = today.getDay() === 1
  const currentWeekId = getWeekId()
  const prevWeekId = getPrevWeekId()
  const { start: weekStart, end: weekEnd } = getWeekBounds(currentWeekId)

  const user = currentUser!
  const team = user?.team ?? 'OSR'
  const teamDefaults: KPITarget = DEFAULT_KPI_TARGETS[team] ?? {}
  const kpiKeys = Object.keys(teamDefaults)

  const existingPlan = getWeeklyPlan(user.id, currentWeekId)
  const planLocked = !!existingPlan

  const prevWeekScore = getWeekScore(user.id, prevWeekId)
  const { start: prevStart, end: prevEnd } = getWeekBounds(prevWeekId)

  // Carry-forward: pending assigned tasks from last week
  const lastWeekDates = (() => {
    const dates: string[] = []
    const start = new Date(prevStart)
    const end = new Date(prevEnd)
    const cur = new Date(start)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  })()

  const carryForwardItems: string[] = (() => {
    const items: string[] = []
    for (const date of lastWeekDates) {
      const evening = eveningActuals.find(
        (e) => e.userId === user.id && e.date === date
      )
      if (evening?.taskStatus) {
        for (const ts of evening.taskStatus) {
          if (ts.status === 'pending' || ts.status === 'rescheduled') {
            const task = assignedTasks.find((t) => t.id === ts.taskId)
            if (task) items.push(task.title)
          }
        }
      }
    }
    return [...new Set(items)]
  })()

  // Form state
  const initKpis = (): Record<string, string> => {
    const init: Record<string, string> = {}
    for (const key of kpiKeys) {
      init[key] = existingPlan
        ? String((existingPlan.kpiTargets as Record<string, number>)[key] ?? '')
        : ''
    }
    return init
  }

  const [kpiValues, setKpiValues] = useState<Record<string, string>>(initKpis)
  const [bigWin, setBigWin] = useState(existingPlan?.bigWin ?? '')
  const [extraLearning, setExtraLearning] = useState(existingPlan?.extraLearning ?? '')
  const [focusCategory, setFocusCategory] = useState(existingPlan?.focusCategory ?? '')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (existingPlan) {
      setKpiValues(initKpis())
      setBigWin(existingPlan.bigWin)
      setExtraLearning(existingPlan.extraLearning)
      setFocusCategory(existingPlan.focusCategory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPlan])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = () => {
    if (!isMonday || planLocked) return

    const kpiTargets: KPITarget = {} as KPITarget
    for (const key of kpiKeys) {
      ;(kpiTargets as Record<string, number>)[key] =
        kpiValues[key] !== '' ? Number(kpiValues[key]) : (teamDefaults as Record<string, number>)[key]
    }

    submitWeeklyPlan({
      userId: user.id,
      weekId: currentWeekId,
      weekStart,
      weekEnd,
      kpiTargets,
      bigWin,
      extraLearning,
      focusCategory,
      carryForward: carryForwardItems,
      submittedAt: new Date().toISOString(),
    })

    showToast('Weekly plan submitted successfully!')
    setTimeout(() => navigate('/'), 1500)
  }

  const gradeColor: Record<string, string> = {
    S: 'text-green-600',
    A: 'text-blue-600',
    B: 'text-yellow-600',
    C: 'text-orange-600',
    D: 'text-red-600',
    F: 'text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CalendarDays className="w-5 h-5" />
            <span className="font-semibold text-sm uppercase tracking-wide">Weekly Plan</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Week of {formatDate(weekStart)} – {formatDate(weekEnd)}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentWeekId} &nbsp;·&nbsp; {user.name} ({team})
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Not-Monday banner */}
        {!isMonday && !planLocked && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">
                Weekly plan is submitted on Mondays.
              </p>
              <p className="text-blue-700 text-sm mt-0.5">
                You can view this week's plan below. Editing will be available next Monday.
              </p>
            </div>
          </div>
        )}

        {/* Locked banner */}
        {planLocked && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <Lock className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Plan already submitted this week</p>
              <p className="text-green-700 text-sm">
                Submitted {existingPlan?.submittedAt ? new Date(existingPlan.submittedAt).toLocaleString('en-IN') : ''}
              </p>
            </div>
          </div>
        )}

        {/* Last Week Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Last Week Summary</h2>
            <span className="ml-auto text-xs text-gray-400">{formatDate(prevStart)} – {formatDate(prevEnd)}</span>
          </div>
          <div className="px-5 py-4">
            {prevWeekScore ? (
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-0.5">Final Score</span>
                  <span className="text-2xl font-bold text-gray-900">{prevWeekScore.finalScore}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-0.5">Grade</span>
                  <span className={`text-2xl font-bold ${gradeColor[prevWeekScore.grade] ?? 'text-gray-700'}`}>
                    {prevWeekScore.grade}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-0.5">Achievement</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(prevWeekScore.achievementPct)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 mb-0.5">Rank</span>
                  <span className="text-2xl font-bold text-gray-900">#{prevWeekScore.rank}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No data available for last week.</p>
            )}
          </div>
        </div>

        {/* Carry Forward */}
        {carryForwardItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
            <div className="px-5 py-3 bg-yellow-50 border-b flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <h2 className="font-semibold text-yellow-800 text-sm">
                Carry Forward from Last Week ({carryForwardItems.length})
              </h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {carryForwardItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700">
                  <ChevronRight className="w-4 h-4 text-yellow-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SECTION A — KPI Targets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-blue-50 border-b flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-blue-800 text-sm">A. This Week KPI Targets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-5 py-2.5 text-left font-semibold">KPI Name</th>
                  <th className="px-5 py-2.5 text-center font-semibold">Company Standard</th>
                  <th className="px-5 py-2.5 text-center font-semibold">Your Commitment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kpiKeys.map((key) => {
                  const standard = (teamDefaults as Record<string, number>)[key] ?? 0
                  const val = kpiValues[key]
                  const numVal = val !== '' ? Number(val) : null
                  const belowStandard = numVal !== null && numVal < standard

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {KPI_LABELS[key] ?? key}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">{standard}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            placeholder={String(standard)}
                            value={val}
                            onChange={(e) =>
                              !planLocked &&
                              setKpiValues((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            readOnly={planLocked}
                            className={`w-28 text-center border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                              planLocked
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : belowStandard
                                ? 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'
                                : 'border-gray-300'
                            }`}
                          />
                          {belowStandard && !planLocked && (
                            <span className="text-xs text-yellow-600 font-medium">
                              Below team standard
                            </span>
                          )}
                          {belowStandard && planLocked && (
                            <span className="text-xs text-yellow-600 font-medium">
                              Below team standard
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION B — Big Win */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-green-50 border-b flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-green-800 text-sm">B. Big Win This Week</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs text-gray-500 mb-1.5">
              Ek cheez jo zaroor karni hai is hafte
            </label>
            <input
              type="text"
              value={bigWin}
              onChange={(e) => !planLocked && setBigWin(e.target.value)}
              readOnly={planLocked}
              placeholder="e.g. 5 naye clients se meeting fix karna"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                planLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* SECTION C — Extra Learning */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-purple-50 border-b flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <h2 className="font-semibold text-purple-800 text-sm">C. Extra Learning This Week</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs text-gray-500 mb-1.5">
              Is hafte kya naya sikhoge
            </label>
            <input
              type="text"
              value={extraLearning}
              onChange={(e) => !planLocked && setExtraLearning(e.target.value)}
              readOnly={planLocked}
              placeholder="e.g. Product training, negotiation skills"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                planLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* SECTION D — Focus Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 bg-orange-50 border-b flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-600" />
            <h2 className="font-semibold text-orange-800 text-sm">D. Focus Category</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs text-gray-500 mb-1.5">
              Paints / Hardware / Other
            </label>
            <input
              type="text"
              value={focusCategory}
              onChange={(e) => !planLocked && setFocusCategory(e.target.value)}
              readOnly={planLocked}
              placeholder="e.g. Paints"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                planLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300'
              }`}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSubmit}
            disabled={!isMonday || planLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
              !isMonday || planLocked
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
            }`}
          >
            {planLocked ? (
              <>
                <Lock className="w-4 h-4" /> Plan Submitted
              </>
            ) : !isMonday ? (
              <>
                <Info className="w-4 h-4" /> Available on Monday
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Submit Weekly Plan
              </>
            )}
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
