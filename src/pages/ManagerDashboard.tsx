import { useState } from 'react'
import { fmtLocalDate, todayLocal } from '../utils/dates'
import { useNavigate, Link } from 'react-router-dom'
import {
  Users,
  ClipboardList,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Plus,
  X,
} from 'lucide-react'
import useERPStore from '../store/erpStore'
import type { TaskPriority } from '../types'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(): string[] {
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7 // 0 = Mon
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return fmtLocalDate(d)
  })
}

function todayStr(): string {
  return todayLocal()
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-purple-600'
    case 'A': return 'text-green-600'
    case 'B': return 'text-blue-600'
    case 'C': return 'text-yellow-600'
    case 'D': return 'text-orange-600'
    case 'F': return 'text-red-600'
    default: return 'text-gray-500'
  }
}

function cellBg(score: number | undefined): string {
  if (score === undefined) return 'bg-gray-100 text-gray-400'
  if (score >= 0) return 'bg-green-100 text-green-800'
  if (score >= -10) return 'bg-yellow-100 text-yellow-800'
  if (score >= -20) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const {
    currentUser,
    getTeamMembers,
    getTodayMorning,
    getTodayEvening,
    morningPlans,
    eveningActuals,
    weekScores,
    assignedTasks,
    coachingNotes,
    assignTask,
    addCoachingNote,
    getWeekId,
  } = useERPStore()

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({
    assignedTo: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TaskPriority,
    expectedOutcome: '',
  })
  const [expandedCoaching, setExpandedCoaching] = useState<Record<string, boolean>>({})
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Map<string, string>>(new Map())

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Not logged in. <Link to="/" className="text-blue-600 underline">Go home</Link></p>
      </div>
    )
  }

  const teamMembers = getTeamMembers(currentUser.id)
  const today = todayStr()
  const weekId = getWeekId()
  const prevWeekId = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    d.setHours(0, 0, 0, 0)
    const thursday = new Date(d)
    thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
    const yearStart = new Date(thursday.getFullYear(), 0, 4)
    const week = 1 + Math.round(((thursday.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7)
    return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
  })()
  const weekDates = getWeekDates()

  // Per-member derived data
  const memberData = teamMembers.map(member => {
    const morning = getTodayMorning(member.id)
    const evening = getTodayEvening(member.id)

    // Status dot logic
    const missingCount = weekDates.filter(d => {
      if (d >= today) return false
      return !morningPlans.find(p => p.userId === member.id && p.date === d)
    }).length

    let statusColor = 'bg-red-500'
    if (evening) statusColor = 'bg-green-500'
    else if (morning) statusColor = 'bg-yellow-400'
    else if (missingCount < 2) statusColor = 'bg-yellow-400'

    const weekScore = weekScores.find(s => s.userId === member.id && s.weekId === weekId)

    // Day scores for table
    const dayScores = weekDates.map(date => {
      if (weekScore && weekScore.dailyScores) {
        return (weekScore.dailyScores as Record<string, { total: number }>)[date]?.total
      }
      return undefined
    })

    const totalScore = weekScore?.finalScore ?? 0
    const grade = weekScore?.grade ?? '-'

    return { member, morning, evening, statusColor, weekScore, dayScores, totalScore, grade }
  })

  // Approval queue: team members who submitted evening actuals today
  const approvalQueue = teamMembers
    .map(member => {
      const evening = eveningActuals.find(e => e.userId === member.id && e.date === today)
      if (!evening) return null
      return { member, evening }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter(x => !approvedIds.has(x.member.id) && !rejectedIds.has(x.member.id))

  // Daily team brief
  const briefLines = teamMembers
    .map(member => {
      const morning = getTodayMorning(member.id)
      if (!morning) return `❌ ${member.name}: No morning plan submitted`
      const taskList = morning.tasks.map((t, i) => `  ${i + 1}. ${t.text}`).join('\n')
      return `✅ ${member.name}:\n${taskList}`
    })
    .join('\n\n')

  const briefText = `*${currentUser.team} Team Brief — ${today}*\n\n${briefLines}`

  function handleCopyBrief() {
    navigator.clipboard.writeText(briefText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSaveTask() {
    if (!currentUser || !newTask.assignedTo || !newTask.title) return
    assignTask({
      assignedTo: newTask.assignedTo,
      assignedBy: currentUser.id,
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      expectedOutcome: newTask.expectedOutcome,
      status: 'assigned',
    })
    setNewTask({ assignedTo: '', title: '', description: '', dueDate: '', priority: 'medium', expectedOutcome: '' })
    setShowTaskModal(false)
  }

  function handleAddNote(memberId: string) {
    const text = newNoteText[memberId]?.trim()
    if (!text || !currentUser) return
    addCoachingNote({ memberId, managerId: currentUser.id, note: text })
    setNewNoteText(prev => ({ ...prev, [memberId]: '' }))
  }

  function toggleCoaching(memberId: string) {
    setExpandedCoaching(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  const taskStatusColors: Record<string, string> = {
    assigned: 'bg-blue-100 text-blue-700',
    accepted: 'bg-cyan-100 text-cyan-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white px-4 py-5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">👥 TEAM DASHBOARD</h1>
              <p className="text-indigo-200 text-sm">{currentUser.name} &bull; Team {currentUser.team}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm">{formatDate(new Date())}</p>
            <Link to="/" className="text-indigo-300 text-xs hover:text-white underline">← Home</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* TEAM PULSE GRID */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Team Pulse
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {memberData.map(({ member, morning, evening, statusColor, totalScore, grade }) => (
              <button
                key={member.id}
                onClick={() => navigate(`/scorecard/${member.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left hover:border-indigo-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700">{member.name}</p>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 mt-1 inline-block">
                      {member.role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${statusColor}`} title="Activity status" />
                </div>
                <div className="space-y-1 mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Plan Today</span>
                    <span>{morning ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Actual Today</span>
                    <span>{evening ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100 mt-1">
                    <span>Week Score</span>
                    <span className="font-bold text-gray-800">{totalScore}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Grade</span>
                    <span className={`font-bold text-base ${gradeColor(String(grade))}`}>{String(grade)}</span>
                  </div>
                </div>
              </button>
            ))}
            {teamMembers.length === 0 && (
              <p className="col-span-4 text-gray-400 text-sm text-center py-8">No team members found.</p>
            )}
          </div>
        </section>

        {/* APPROVAL QUEUE */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" /> Approval Queue
            {approvalQueue.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{approvalQueue.length}</span>
            )}
          </h2>
          {approvalQueue.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
              No pending approvals for today.
            </div>
          ) : (
            <div className="space-y-3">
              {approvalQueue.map(({ member, evening }) => {
                const kpis = evening.kpiActual as Record<string, number>
                return (
                  <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.entries(kpis)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' | ') || 'No KPI data'}
                      </p>
                      {evening.winOfDay && (
                        <p className="text-xs text-green-700 mt-1">Win: {evening.winOfDay}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setApprovedIds(prev => new Set([...prev, member.id]))}
                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      {rejectingId === member.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="border rounded-lg px-2 py-1 text-sm w-40"
                            placeholder="Reason..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                          />
                          <button
                            onClick={() => {
                              setRejectedIds(prev => new Map([...prev, [member.id, rejectReason]]))
                              setRejectingId(null)
                              setRejectReason('')
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg"
                          >
                            Confirm
                          </button>
                          <button onClick={() => setRejectingId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejectingId(member.id)}
                          className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {/* Processed items */}
              {teamMembers.filter(m => approvedIds.has(m.id)).map(m => (
                <div key={m.id} className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" /> {m.name} — Approved
                </div>
              ))}
              {teamMembers.filter(m => rejectedIds.has(m.id)).map(m => (
                <div key={m.id} className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
                  <XCircle className="w-4 h-4" /> {m.name} — Rejected: {rejectedIds.get(m.id)}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DAILY TEAM BRIEF */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" /> Daily Team Brief
            </h2>
            <button
              onClick={handleCopyBrief}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </button>
          </div>
          <div className="bg-gray-800 text-gray-100 rounded-xl p-4 font-mono text-xs whitespace-pre-wrap overflow-x-auto">
            {briefText}
          </div>
        </section>

        {/* TASK ASSIGNMENT */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" /> Task Assignment
            </h2>
            <button
              onClick={() => setShowTaskModal(prev => !prev)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Assign New Task
            </button>
          </div>

          {showTaskModal && (
            <div className="bg-white border border-purple-200 rounded-xl p-5 mb-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                    value={newTask.assignedTo}
                    onChange={e => setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))}
                  >
                    <option value="">Select member...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                    value={newTask.priority}
                    onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Task Title</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                    placeholder="e.g. Follow up with 10 cold leads"
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none resize-none"
                    rows={2}
                    placeholder="Details..."
                    value={newTask.description}
                    onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                    value={newTask.dueDate}
                    onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expected Outcome</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 outline-none"
                    placeholder="e.g. 3 meetings booked"
                    value={newTask.expectedOutcome}
                    onChange={e => setNewTask(prev => ({ ...prev, expectedOutcome: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={!newTask.assignedTo || !newTask.title}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Save Task
                </button>
              </div>
            </div>
          )}

          {/* Tasks per member */}
          <div className="space-y-3">
            {teamMembers.map(member => {
              const memberTasks = assignedTasks.filter(
                t => t.assignedTo === member.id && t.status !== 'approved' && t.status !== 'rejected'
              )
              if (memberTasks.length === 0) return null
              return (
                <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="font-semibold text-gray-700 text-sm mb-2">{member.name}</p>
                  <div className="space-y-1.5">
                    {memberTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{task.priority}</span>
                          <span className="text-gray-800 truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-gray-400">{task.dueDate}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${taskStatusColors[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* COACHING NOTES */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" /> Coaching Notes
            <span className="text-xs text-gray-400 font-normal">(visible to manager & admin only)</span>
          </h2>
          <div className="space-y-2">
            {teamMembers.map(member => {
              const notes = coachingNotes.filter(n => n.memberId === member.id)
              const isOpen = expandedCoaching[member.id] ?? false
              return (
                <div key={member.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCoaching(member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700 text-sm">{member.name}</span>
                      {notes.length > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                          {notes.length} note{notes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                      {notes.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No coaching notes yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {notes
                            .slice()
                            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                            .map(note => (
                              <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                <p className="text-xs text-gray-700">{note.note}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-300 outline-none resize-none"
                          rows={2}
                          placeholder="Add a private coaching note..."
                          value={newNoteText[member.id] ?? ''}
                          onChange={e => setNewNoteText(prev => ({ ...prev, [member.id]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleAddNote(member.id)}
                          disabled={!newNoteText[member.id]?.trim()}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors self-end"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* TEAM WEEKLY SUMMARY TABLE */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Team Weekly Summary</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                  {DAY_LABELS.map(d => (
                    <th key={d} className="text-center px-3 py-3 font-semibold text-gray-600">{d}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600">Grade</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">vs Last Wk</th>
                </tr>
              </thead>
              <tbody>
                {memberData.map(({ member, dayScores, totalScore, grade, weekScore }) => {
                  const lastWeekScore = weekScores.find(
                    s => s.userId === member.id && s.weekId === prevWeekId
                  )
                  const delta = lastWeekScore ? totalScore - lastWeekScore.finalScore : null

                  return (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/scorecard/${member.id}`)}
                          className="hover:text-indigo-600 text-left"
                        >
                          {member.name}
                        </button>
                      </td>
                      {dayScores.map((score, idx) => (
                        <td key={idx} className="px-3 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cellBg(score)}`}>
                            {score !== undefined ? score : '-'}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-bold text-gray-800">{totalScore}</td>
                      <td className={`px-3 py-3 text-center font-bold text-lg ${gradeColor(String(grade))}`}>
                        {String(grade)}
                      </td>
                      <td className="px-3 py-3 text-center text-xs">
                        {delta === null ? (
                          <span className="text-gray-400">—</span>
                        ) : delta > 0 ? (
                          <span className="text-green-600 font-medium">+{delta}</span>
                        ) : delta < 0 ? (
                          <span className="text-red-600 font-medium">{delta}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No team members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
