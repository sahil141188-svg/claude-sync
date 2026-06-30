import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Moon,
  BarChart2,
  Target,
  CheckSquare,
  Square,
  ChevronRight,
  AlertCircle,
  Clock,
  Users,
} from 'lucide-react'
import useERPStore from '../store/erpStore'
import { KPI_LABELS } from '../store/erpStore'
import type { KPITarget } from '../types'

const TEAM_COLORS: Record<string, string> = {
  OSR: 'bg-blue-500',
  CRR: 'bg-purple-500',
  NBD: 'bg-green-500',
  FSR: 'bg-yellow-500',
}

const GRADE_COLORS: Record<string, string> = {
  S: 'bg-yellow-400 text-yellow-900',
  A: 'bg-green-400 text-green-900',
  B: 'bg-blue-400 text-blue-900',
  C: 'bg-orange-400 text-orange-900',
  D: 'bg-red-400 text-red-900',
  F: 'bg-red-700 text-white',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MyDashboard() {
  const navigate = useNavigate()
  const {
    currentUser,
    getTodayMorning,
    getTodayEvening,
    getWeekScore,
    getLeaderboard,
    getPendingItems,
    getWeekId,
    getWeekBounds,
    leads,
    followUps,
    assignedTasks,
  } = useERPStore()

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Not logged in.
      </div>
    )
  }

  const today = todayStr()
  const now = new Date()
  const isAfter5PM = now.getHours() >= 17

  const morning = getTodayMorning(currentUser.id)
  const evening = getTodayEvening(currentUser.id)
  const weekId = getWeekId()
  const weekScore = getWeekScore(currentUser.id, weekId)
  const leaderboard = getLeaderboard(weekId)
  const pending = getPendingItems(currentUser.id)

  const myRank = leaderboard.findIndex(e => e.userId === currentUser.id) + 1

  // Streak: consecutive days with morning plan submitted (going backwards from yesterday)
  const streak = (() => {
    let count = 0
    const cursor = new Date()
    cursor.setDate(cursor.getDate() - 1)
    for (let i = 0; i < 30; i++) {
      const d = cursor.toISOString().split('T')[0]
      const hasMorning = useERPStore.getState().morningPlans.some(
        p => p.userId === currentUser.id && p.date === d
      )
      if (hasMorning) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
    return count
  })()

  // Week bounds Mon-Sat
  const { start: weekStart, end: weekEnd } = getWeekBounds(weekId)
  const weekDays: string[] = []
  {
    const c = new Date(weekStart)
    const e = new Date(weekEnd)
    while (c <= e) {
      weekDays.push(c.toISOString().split('T')[0])
      c.setDate(c.getDate() + 1)
    }
  }

  // KPI progress from today's morning commitment
  const kpiCommitment: KPITarget = morning?.kpiCommitment ?? {}
  const kpiActual: KPITarget = evening?.kpiActual ?? {}

  // Tasks from morning plan
  const todayTasks = morning?.tasks ?? []

  // Score info
  const achievementPct = weekScore?.achievementPct ?? 0
  const finalScore = weekScore?.finalScore ?? 0
  const grade = weekScore?.grade ?? null

  // Per-KPI bars for score breakdown
  const kpiKeys = Object.keys(kpiCommitment).filter(
    k => (kpiCommitment as Record<string, number>)[k] > 0
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* HEADER CARD */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white px-4 pt-6 pb-5 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{currentUser.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${TEAM_COLORS[currentUser.team] ?? 'bg-gray-500'}`}
              >
                {currentUser.team}
              </span>
              <span className="text-orange-200 text-sm">{formatDate(now)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
            <span>🏅</span>
            <span>Rank #{myRank > 0 ? myRank : '--'}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
            <span>🔥</span>
            <span>Streak: {streak} Days</span>
          </div>
          {grade && (
            <div
              className={`rounded-full px-3 py-1 text-sm font-bold ${GRADE_COLORS[grade] ?? 'bg-white text-gray-800'}`}
            >
              Week: {grade} ({finalScore > 0 ? '+' : ''}{finalScore})
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* TODAY STATUS */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Today's Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Morning Plan */}
            <div
              className={`rounded-xl p-3 shadow-sm ${
                morning ? 'bg-green-50 border border-green-200' : 'bg-white border border-orange-200'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <Sun size={14} className={morning ? 'text-green-500' : 'text-orange-500'} />
                <span className="text-xs font-semibold text-gray-700">Morning Plan</span>
              </div>
              {morning ? (
                <div>
                  <div className="text-green-600 font-bold text-sm">Done ✓</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatTime(morning.submittedAt)}</div>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/morning')}
                  className="mt-1 w-full bg-orange-500 text-white text-xs font-semibold rounded-lg py-1.5 flex items-center justify-center gap-1"
                >
                  Submit Now <ChevronRight size={12} />
                </button>
              )}
            </div>

            {/* Evening Update */}
            <div
              className={`rounded-xl p-3 shadow-sm ${
                evening
                  ? 'bg-blue-50 border border-blue-200'
                  : isAfter5PM
                  ? 'bg-white border border-purple-200'
                  : 'bg-gray-50 border border-gray-100'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <Moon size={14} className={evening ? 'text-blue-500' : 'text-purple-500'} />
                <span className="text-xs font-semibold text-gray-700">Evening Update</span>
              </div>
              {evening ? (
                <div>
                  <div className="text-blue-600 font-bold text-sm">Done ✓</div>
                  <div className="text-xs text-gray-500 mt-0.5">{formatTime(evening.submittedAt)}</div>
                </div>
              ) : isAfter5PM ? (
                <button
                  onClick={() => navigate('/evening')}
                  className="mt-1 w-full bg-purple-500 text-white text-xs font-semibold rounded-lg py-1.5 flex items-center justify-center gap-1"
                >
                  Submit Update <ChevronRight size={12} />
                </button>
              ) : (
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={11} /> After 5 PM
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TODAY'S KPI PROGRESS */}
        {morning && kpiKeys.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Today's KPI Progress
            </h2>
            <div className="space-y-2.5">
              {kpiKeys.map(key => {
                const committed = (kpiCommitment as Record<string, number>)[key] ?? 0
                const actual = (kpiActual as Record<string, number>)[key] ?? 0
                const pct = committed > 0 ? Math.min((actual / committed) * 100, 100) : 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{KPI_LABELS[key] ?? key}</span>
                      <span className="text-gray-500">
                        {actual}/{committed}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100
                            ? 'bg-green-500'
                            : pct >= 70
                            ? 'bg-orange-400'
                            : 'bg-red-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Sun size={20} />, label: 'Morning', path: '/morning', color: 'text-orange-500 bg-orange-50 border-orange-200' },
              { icon: <Moon size={20} />, label: 'Evening', path: '/evening', color: 'text-purple-500 bg-purple-50 border-purple-200' },
              { icon: <BarChart2 size={20} />, label: 'Weekly', path: '/weekly', color: 'text-blue-500 bg-blue-50 border-blue-200' },
              { icon: <Target size={20} />, label: 'Leads', path: '/leads', color: 'text-green-500 bg-green-50 border-green-200' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-xs font-semibold shadow-sm active:scale-95 transition-transform ${action.color}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* MY TASKS TODAY */}
        {todayTasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              My Tasks Today
            </h2>
            <p className="text-xs text-gray-400 mb-2 italic">
              Visual only — mark completion in your Evening Update.
            </p>
            <div className="space-y-2">
              {todayTasks.map((task, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg p-2.5 border ${
                    task.carryForward
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {task.carryForward ? (
                    <Square size={16} className="text-orange-400 mt-0.5 shrink-0" />
                  ) : (
                    <CheckSquare size={16} className="text-gray-300 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{task.text}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-medium ${
                          task.priority === 'high'
                            ? 'text-red-500'
                            : task.priority === 'medium'
                            ? 'text-orange-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.carryForward && (
                        <span className="text-xs text-orange-500 font-medium">Carry-forward</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEEK TRACKER */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Week Tracker
          </h2>
          <div className="grid grid-cols-6 gap-1.5">
            {weekDays.map(date => {
              const dayMorning = useERPStore
                .getState()
                .morningPlans.some(p => p.userId === currentUser.id && p.date === date)
              const dayEvening = useERPStore
                .getState()
                .eveningActuals.some(e => e.userId === currentUser.id && e.date === date)
              const isToday = date === today
              const isFuture = date > today

              let icon = '⚪'
              let bg = 'bg-gray-50 border-gray-100'
              if (isFuture) {
                icon = '⚪'
                bg = 'bg-gray-50 border-gray-100'
              } else if (isToday) {
                if (dayMorning && dayEvening) {
                  icon = '✅'
                  bg = 'bg-green-50 border-green-200'
                } else if (dayMorning) {
                  icon = '📝'
                  bg = 'bg-yellow-50 border-yellow-200'
                } else {
                  icon = '⏳'
                  bg = 'bg-orange-50 border-orange-200'
                }
              } else {
                if (dayMorning && dayEvening) {
                  icon = '✅'
                  bg = 'bg-green-50 border-green-200'
                } else if (dayMorning) {
                  icon = '📝'
                  bg = 'bg-yellow-50 border-yellow-200'
                } else if (dayEvening) {
                  icon = '🌙'
                  bg = 'bg-blue-50 border-blue-200'
                } else {
                  icon = '⚪'
                  bg = 'bg-red-50 border-red-100'
                }
              }

              const dayLabel = new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })

              return (
                <div
                  key={date}
                  className={`rounded-lg border p-1.5 flex flex-col items-center gap-0.5 ${bg} ${
                    isToday ? 'ring-2 ring-orange-400' : ''
                  }`}
                >
                  <span className="text-xs text-gray-500 font-medium">{dayLabel}</span>
                  <span className="text-base leading-none">{icon}</span>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
            <span>✅ Complete</span>
            <span>📝 Morning only</span>
            <span>🌙 Evening only</span>
            <span>⏳ Pending</span>
            <span>⚪ Future/Missed</span>
          </div>
        </div>

        {/* MY SCORE BREAKDOWN */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            My Score Breakdown
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  achievementPct >= 80
                    ? 'text-green-500'
                    : achievementPct >= 60
                    ? 'text-orange-400'
                    : 'text-red-500'
                }`}
              >
                {Math.round(achievementPct)}%
              </div>
              <div className="text-xs text-gray-400">Achievement</div>
            </div>
            <div className="text-center">
              <div
                className={`text-xl font-bold ${finalScore >= 0 ? 'text-green-500' : 'text-orange-500'}`}
              >
                {finalScore > 0 ? '+' : ''}{finalScore}
              </div>
              <div className="text-xs text-gray-400">Week Score</div>
            </div>
            {grade && (
              <div className="text-center">
                <div
                  className={`text-xl font-bold px-3 py-1 rounded-lg ${GRADE_COLORS[grade] ?? 'bg-gray-100'}`}
                >
                  {grade}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Grade</div>
              </div>
            )}
          </div>

          {kpiKeys.length > 0 && (
            <div className="space-y-2">
              {kpiKeys.map(key => {
                const committed = (kpiCommitment as Record<string, number>)[key] ?? 0
                const actual = (kpiActual as Record<string, number>)[key] ?? 0
                const pct = committed > 0 ? Math.min((actual / committed) * 100, 100) : 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{KPI_LABELS[key] ?? key}</span>
                      <span className="text-gray-400">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-orange-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!weekScore && (
            <p className="text-sm text-gray-400 text-center py-2">
              No score data yet for this week.
            </p>
          )}
        </div>

        {/* PENDING ITEMS */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Pending Items
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Pending Tasks', count: pending.tasks, icon: <CheckSquare size={16} /> },
              { label: 'Overdue Follow-ups', count: pending.followUps, icon: <Clock size={16} /> },
              { label: 'Stale Leads', count: pending.staleLeads, icon: <AlertCircle size={16} /> },
            ].map(item => (
              <div
                key={item.label}
                className={`rounded-xl p-3 border shadow-sm flex flex-col items-center gap-1 ${
                  item.count > 0
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                }`}
              >
                <div className={item.count > 0 ? 'text-red-500' : 'text-gray-300'}>{item.icon}</div>
                <div className={`text-2xl font-bold ${item.count > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                  {item.count}
                </div>
                <div className="text-xs text-center leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MANAGER FEEDBACK */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Manager Feedback
            </h2>
          </div>
          <p className="text-sm text-gray-400 italic text-center py-3">
            No feedback from your manager yet this week.
          </p>
        </div>
      </div>
    </div>
  )
}
