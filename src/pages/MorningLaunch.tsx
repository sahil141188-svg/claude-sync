import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Copy, CheckCircle, AlertTriangle, Rocket } from 'lucide-react'
import { useERPStore, KPI_LABELS, DEFAULT_KPI_TARGETS } from '../store/erpStore'
import type { Task, KPITarget } from '../types'

type Priority = 'High' | 'Medium' | 'Low'

interface TaskRow {
  text: string
  priority: Priority
  carryForward?: boolean
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getWeekId(date?: Date): string {
  const d = date ? new Date(date) : new Date()
  d.setHours(0, 0, 0, 0)
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - (d.getDay() + 6) % 7 + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - yearStart.getTime()) / 86400000 -
        3 +
        (yearStart.getDay() + 6) % 7) /
        7,
    )
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default function MorningLaunch() {
  const navigate = useNavigate()
  const {
    currentUser,
    getTodayMorning,
    submitMorningPlan,
    getWeeklyPlan,
    eveningActuals,
  } = useERPStore()

  const today = todayStr()
  const existing = currentUser ? getTodayMorning(currentUser.id) : null
  const alreadySubmitted = !!existing

  const weeklyPlan = currentUser ? getWeeklyPlan(currentUser.id) : null
  const teamTargets: KPITarget =
    currentUser && DEFAULT_KPI_TARGETS[currentUser.team]
      ? DEFAULT_KPI_TARGETS[currentUser.team]
      : {}
  const weeklyKpis: KPITarget = weeklyPlan ? weeklyPlan.kpiTargets : {}
  const kpiKeys = Object.keys(weeklyKpis).filter(
    (k) => (weeklyKpis as any)[k] != null && (weeklyKpis as any)[k] > 0,
  )

  // Compute done-so-far from this week's evening actuals
  const weekId = getWeekId()
  const weekActuals = currentUser
    ? eveningActuals.filter(
        (e) => e.userId === currentUser.id && getWeekId(new Date(e.date)) === weekId,
      )
    : []

  function sumKpi(key: string): number {
    return weekActuals.reduce((acc, e) => acc + ((e.kpiActual as any)[key] ?? 0), 0)
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayDow = new Date().getDay() // 0=Sun
  // Monday=1..Saturday=6
  const dayIndex = todayDow === 0 ? 6 : todayDow - 1 // 0-based index in work week
  const daysLeft = Math.max(1, 6 - dayIndex)

  // Yesterday's evening for carry-forward
  const yesterdayEvening = currentUser
    ? eveningActuals.find((e) => e.userId === currentUser.id && e.date === yesterdayStr())
    : null

  function buildCarryForwardTasks(): TaskRow[] {
    if (!yesterdayEvening) return []
    const rows: TaskRow[] = []
    if (yesterdayEvening.kalKaPriority) {
      rows.push({ text: yesterdayEvening.kalKaPriority, priority: 'High', carryForward: true })
    }
    if (yesterdayEvening.taskStatus) {
      yesterdayEvening.taskStatus.forEach((ts) => {
        if (ts.status === 'not_done') {
          // We don't have the original task text in evening actual easily,
          // skip if no text available
        }
      })
    }
    return rows
  }

  const carryForward = buildCarryForwardTasks()

  // Initial KPI commitment: suggested = remaining / daysLeft
  function buildInitialKpi(): KPITarget {
    if (!weeklyPlan) return {}
    const kpi: KPITarget = {}
    kpiKeys.forEach((k) => {
      const target = (weeklyKpis as any)[k] ?? 0
      const done = sumKpi(k)
      const remaining = Math.max(0, target - done)
      ;(kpi as any)[k] = Math.ceil(remaining / daysLeft)
    })
    return kpi
  }

  const [tasks, setTasks] = useState<TaskRow[]>(() => {
    if (alreadySubmitted && existing) {
      return existing.tasks.map((t) => ({
        text: t.text,
        priority: t.priority as Priority,
        carryForward: t.carryForward,
      }))
    }
    return carryForward.length > 0
      ? [...carryForward, { text: '', priority: 'High' as Priority }]
      : [{ text: '', priority: 'High' as Priority }]
  })

  const [kpiCommitment, setKpiCommitment] = useState<KPITarget>(() => {
    if (alreadySubmitted && existing) return existing.kpiCommitment
    return buildInitialKpi()
  })

  const [nayaKaam, setNayaKaam] = useState(() =>
    alreadySubmitted && existing ? existing.nayaKaam : '',
  )
  const [businessAdd, setBusinessAdd] = useState(() =>
    alreadySubmitted && existing ? existing.businessAdd : '',
  )

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const [copied, setCopied] = useState(false)

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please log in to submit Morning Launch.
      </div>
    )
  }

  // WhatsApp brief
  function buildWhatsAppBrief(): string {
    const dateLabel = formatDate(today)
    const kpiLine = kpiKeys
      .map((k) => `${KPI_LABELS[k] ?? k}: ${(kpiCommitment as any)[k] ?? 0}`)
      .join(', ')
    const taskLines = tasks
      .filter((t) => t.text.trim())
      .map((t, i) => `${i + 1}. [${t.priority}] ${t.text}`)
      .join('\n')
    let brief = `📅 MORNING PLAN — ${currentUser.name} — ${dateLabel}\n`
    if (kpiLine) brief += `🎯 KPI Target: ${kpiLine}\n`
    brief += `📋 Tasks:\n${taskLines}`
    if (nayaKaam.trim()) brief += `\n💡 Naya: ${nayaKaam}`
    if (businessAdd.trim()) brief += `\n💼 Business Add: ${businessAdd}`
    return brief
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildWhatsAppBrief()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSubmit() {
    const filteredTasks: Task[] = tasks
      .filter((t) => t.text.trim())
      .map((t) => ({ text: t.text.trim(), priority: t.priority, carryForward: t.carryForward }))

    const isOnTime = now.getHours() < 10 || (now.getHours() === 10 && now.getMinutes() === 0)

    submitMorningPlan({
      userId: currentUser.id,
      date: today,
      tasks: filteredTasks,
      kpiCommitment,
      nayaKaam,
      businessAdd,
      submittedAt: new Date().toISOString(),
      submittedOnTime: isOnTime,
    })
    navigate('/')
  }

  function addTask() {
    if (tasks.length >= 7) return
    setTasks([...tasks, { text: '', priority: 'High' }])
  }

  function removeTask(idx: number) {
    setTasks(tasks.filter((_, i) => i !== idx))
  }

  function updateTask(idx: number, field: 'text' | 'priority', value: string) {
    setTasks(tasks.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }

  function updateKpi(key: string, value: string) {
    setKpiCommitment({ ...kpiCommitment, [key]: Number(value) })
  }

  // Score for submitted plan (simple: count tasks + on-time bonus)
  function computeScore(plan: NonNullable<typeof existing>): number {
    let score = plan.tasks.length * 10
    if (plan.submittedOnTime) score += 20
    if (plan.nayaKaam) score += 10
    if (plan.businessAdd) score += 10
    return score
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-orange-600 text-white px-4 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Rocket className="w-7 h-7" />
          <h1 className="text-2xl font-bold tracking-wide">MORNING LAUNCH</h1>
        </div>
        <div className="text-orange-100 text-sm">
          {now.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}{' '}
          &mdash;{' '}
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="mt-1 text-orange-200 text-xs font-medium">
          ⏰ 10 AM meeting se pehle submit karein
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Already submitted banner */}
        {alreadySubmitted && existing && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Plan submitted successfully!</p>
              <p className="text-green-700 text-sm">
                Submitted at: {formatDateTime(existing.submittedAt)}
                {existing.submittedOnTime
                  ? ' ✅ On time'
                  : ' ⚠️ Late submission'}
              </p>
              <p className="text-green-700 text-sm">
                Score: {computeScore(existing)} pts
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1 — WEEKLY KPI TRACKER */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">📊 Weekly KPI Tracker</h2>
          </div>
          <div className="p-4">
            {!weeklyPlan ? (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-orange-700 text-sm">
                  No weekly plan found. Please submit Monday weekly plan first.
                </p>
              </div>
            ) : kpiKeys.length === 0 ? (
              <p className="text-gray-400 text-sm">No KPI targets set in weekly plan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="text-left py-2 pr-2 font-medium">KPI</th>
                      <th className="text-right py-2 px-2 font-medium">Weekly</th>
                      <th className="text-right py-2 px-2 font-medium">Done</th>
                      <th className="text-right py-2 px-2 font-medium">Left</th>
                      <th className="text-right py-2 px-2 font-medium">Days</th>
                      <th className="text-right py-2 px-2 font-medium">Suggested</th>
                      <th className="text-right py-2 pl-2 font-medium">Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiKeys.map((k) => {
                      const target = (weeklyKpis as any)[k] ?? 0
                      const done = sumKpi(k)
                      const remaining = Math.max(0, target - done)
                      const suggested = Math.ceil(remaining / daysLeft)
                      return (
                        <tr key={k} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-gray-700 font-medium">
                            {KPI_LABELS[k] ?? k}
                          </td>
                          <td className="text-right px-2 text-gray-600">{target}</td>
                          <td className="text-right px-2 text-green-600 font-medium">{done}</td>
                          <td className="text-right px-2 text-red-500">{remaining}</td>
                          <td className="text-right px-2 text-gray-500">{daysLeft}</td>
                          <td className="text-right px-2 text-blue-600 font-semibold">{suggested}</td>
                          <td className="text-right pl-2">
                            {alreadySubmitted ? (
                              <span className="font-bold text-orange-600">
                                {(kpiCommitment as any)[k] ?? suggested}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                value={(kpiCommitment as any)[k] ?? suggested}
                                onChange={(e) => updateKpi(k, e.target.value)}
                                className="w-16 text-right border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-orange-400"
                              />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 — TODAY'S TASKS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-purple-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">📋 Aaj ke Tasks (max 7)</h2>
          </div>
          <div className="p-4 space-y-2">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-lg p-2 ${
                  task.carryForward ? 'bg-red-50 border border-red-200' : ''
                }`}
              >
                {task.carryForward && (
                  <span className="text-xs text-red-600 font-semibold whitespace-nowrap">
                    CF ↩
                  </span>
                )}
                {alreadySubmitted ? (
                  <span className="flex-1 text-gray-800 text-sm">{task.text}</span>
                ) : (
                  <input
                    type="text"
                    placeholder={`Task ${idx + 1}...`}
                    value={task.text}
                    onChange={(e) => updateTask(idx, 'text', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                  />
                )}
                {alreadySubmitted ? (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      task.priority === 'High'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'Medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {task.priority}
                  </span>
                ) : (
                  <select
                    value={task.priority}
                    onChange={(e) => updateTask(idx, 'priority', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                )}
                {!alreadySubmitted && (
                  <button
                    onClick={() => removeTask(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!alreadySubmitted && (
              <button
                onClick={addTask}
                disabled={tasks.length >= 7}
                className="mt-2 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Task {tasks.length < 7 ? `(${7 - tasks.length} left)` : '(max reached)'}
              </button>
            )}
          </div>
        </div>

        {/* SECTION 3 — NAYA KYA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-teal-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">💡 Naya Kya Karoge Aaj?</h2>
          </div>
          <div className="p-4">
            {alreadySubmitted ? (
              <p className="text-gray-800 text-sm">
                {nayaKaam || <span className="text-gray-400 italic">Kuch naya plan nahi tha.</span>}
              </p>
            ) : (
              <input
                type="text"
                placeholder="Aaj kuch naya karoge? New dealer / new pitch / new market..."
                value={nayaKaam}
                onChange={(e) => setNayaKaam(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            )}
          </div>
        </div>

        {/* SECTION 4 — BUSINESS ADD */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">💼 Business Add</h2>
          </div>
          <div className="p-4">
            {alreadySubmitted ? (
              <p className="text-gray-800 text-sm">
                {businessAdd || (
                  <span className="text-gray-400 italic">Koi business add plan nahi tha.</span>
                )}
              </p>
            ) : (
              <input
                type="text"
                placeholder="Party name + expected business"
                value={businessAdd}
                onChange={(e) => setBusinessAdd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            )}
          </div>
        </div>

        {/* SECTION 5 — WHATSAPP BRIEF */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">📱 WhatsApp Brief Preview</h2>
          </div>
          <div className="p-4">
            <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-900 whitespace-pre-wrap font-sans leading-relaxed">
              {buildWhatsAppBrief()}
            </pre>
            <button
              onClick={handleCopy}
              className="mt-3 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>

        {/* SUBMIT */}
        {!alreadySubmitted && (
          <button
            onClick={handleSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-lg py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-3"
          >
            <Rocket className="w-6 h-6" />
            SUBMIT MORNING LAUNCH
          </button>
        )}
      </div>
    </div>
  )
}
