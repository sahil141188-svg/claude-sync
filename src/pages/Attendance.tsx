import { useState, useMemo } from 'react'
import { fmtLocalDate, todayLocal } from '../utils/dates'
import { useERPStore } from '../store/erpStore'
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Home,
  Radio,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Save,
  Users,
} from 'lucide-react'
import type { AttendanceStatus } from '../types'

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: string }[] = [
  { value: 'present', label: 'Present', icon: '✅' },
  { value: 'late', label: 'Late', icon: '🕐' },
  { value: 'absent', label: 'Absent', icon: '❌' },
  { value: 'wfh', label: 'WFH', icon: '🏠' },
  { value: 'meeting', label: 'Meeting', icon: '📡' },
]

function statusIcon(status: AttendanceStatus | undefined): string {
  if (!status) return '—'
  return STATUS_OPTIONS.find(s => s.value === status)?.icon ?? '—'
}

function statusShort(status: AttendanceStatus | undefined): string {
  if (!status) return '—'
  const map: Record<AttendanceStatus, string> = {
    present: 'P',
    late: 'L',
    absent: 'A',
    wfh: 'W',
    meeting: 'M',
  }
  return map[status] ?? '—'
}

function statusColor(status: AttendanceStatus | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-400'
  const map: Record<AttendanceStatus, string> = {
    present: 'bg-green-100 text-green-700',
    late: 'bg-yellow-100 text-yellow-700',
    absent: 'bg-red-100 text-red-700',
    wfh: 'bg-blue-100 text-blue-700',
    meeting: 'bg-purple-100 text-purple-700',
  }
  return map[status]
}

function getLast30Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(fmtLocalDate(d))
  }
  return days
}

function getLast7Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(fmtLocalDate(d))
  }
  return days
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
}

export default function Attendance() {
  const { currentUser, users, attendance, markAttendance } = useERPStore()
  const today = todayLocal()
  const [selectedDate, setSelectedDate] = useState(today)
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [myAttendanceOpen, setMyAttendanceOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!currentUser) return null

  const role = currentUser.role

  // Determine which users this viewer can manage
  const managedUsers = useMemo(() => {
    if (role === 'sales_exec') return []
    if (role === 'manager') {
      return users.filter(u => u.managerId === currentUser.id && u.isActive)
    }
    // admin / super_admin
    return users.filter(u => u.isActive && u.id !== currentUser.id)
  }, [role, users, currentUser.id])

  const last7Days = getLast7Days()
  const last30Days = getLast30Days()

  function getAttendance(userId: string, date: string): AttendanceStatus | undefined {
    return attendance.find(a => a.userId === userId && a.date === date)?.status
  }

  function getMarkedBy(userId: string, date: string): string {
    const rec = attendance.find(a => a.userId === userId && a.date === date)
    if (!rec) return '—'
    const marker = users.find(u => u.id === rec.markedBy)
    return marker ? marker.name : rec.markedBy
  }

  function getMarkedAt(userId: string, date: string): string {
    const rec = attendance.find(a => a.userId === userId && a.date === date)
    if (!rec) return '—'
    return rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
  }

  function handleStatusChange(userId: string, status: AttendanceStatus) {
    setPendingStatuses(prev => ({ ...prev, [userId]: status }))
  }

  function handleMarkAllPresent() {
    const updates: Record<string, AttendanceStatus> = {}
    managedUsers.forEach(u => { updates[u.id] = 'present' })
    setPendingStatuses(updates)
  }

  function handleSaveAll() {
    if (!currentUser) return
    managedUsers.forEach(u => {
      const status = pendingStatuses[u.id] ?? getAttendance(u.id, selectedDate)
      if (status) {
        markAttendance(u.id, selectedDate, status, currentUser.id)
      }
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setPendingStatuses({})
  }

  // Weekly summary stats per member
  function memberWeekStats(userId: string) {
    const stats = { present: 0, late: 0, absent: 0, wfh: 0, meeting: 0, total: 0 }
    last7Days.forEach(day => {
      const s = getAttendance(userId, day)
      if (s) {
        stats[s]++
        stats.total++
      }
    })
    return stats
  }

  // Members below 80% attendance (last 30 days)
  const atRiskMembers = useMemo(() => {
    const targetUsers = role === 'sales_exec' ? [] : managedUsers
    return targetUsers.filter(u => {
      let present = 0
      let total = 0
      last30Days.forEach(day => {
        const s = getAttendance(u.id, day)
        if (s) {
          total++
          if (s === 'present' || s === 'wfh' || s === 'meeting') present++
        }
      })
      if (total === 0) return false
      return (present / total) * 100 < 80
    })
  }, [managedUsers, attendance, last30Days, role])

  // My attendance last 30 days
  const myStats = useMemo(() => {
    let present = 0, late = 0, absent = 0
    last30Days.forEach(day => {
      const s = getAttendance(currentUser.id, day)
      if (s === 'present' || s === 'wfh' || s === 'meeting') present++
      else if (s === 'late') late++
      else if (s === 'absent') absent++
    })
    const total = present + late + absent
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    return { present, late, absent, total, pct }
  }, [attendance, currentUser.id, last30Days])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📅 ATTENDANCE</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(today)}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => { setSelectedDate(e.target.value); setPendingStatuses({}) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setSelectedDate(today)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Calendar size={16} />
            Mark Today
          </button>
        </div>
      </div>

      {/* STATUS LEGEND */}
      <div className="flex flex-wrap gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center mr-1">Legend:</span>
        {STATUS_OPTIONS.map(s => (
          <span key={s.value} className="flex items-center gap-1 text-sm text-gray-700">
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </span>
        ))}
      </div>

      {/* TODAY'S ATTENDANCE — for managers/admins */}
      {role !== 'sales_exec' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              Attendance for {selectedDate === today ? 'Today' : formatDate(selectedDate)}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="flex items-center gap-1 border border-green-500 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle size={15} />
                Mark All Present
              </button>
              <button
                onClick={handleSaveAll}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <Save size={15} />
                {saved ? 'Saved!' : 'Save All'}
              </button>
            </div>
          </div>

          {managedUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No team members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Team</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {managedUsers.map(member => {
                    const existing = getAttendance(member.id, selectedDate)
                    const current = pendingStatuses[member.id] ?? existing
                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{member.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{member.team}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={current ?? ''}
                            onChange={e => handleStatusChange(member.id, e.target.value as AttendanceStatus)}
                            className={`border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${current ? statusColor(current) : 'border-gray-300 text-gray-400'}`}
                          >
                            <option value="">— Select —</option>
                            {STATUS_OPTIONS.map(s => (
                              <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{getMarkedAt(member.id, selectedDate)}</td>
                        <td className="px-4 py-3 text-gray-500">{getMarkedBy(member.id, selectedDate)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* WEEKLY SUMMARY TABLE — for managers/admins */}
      {role !== 'sales_exec' && managedUsers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={20} className="text-purple-500" />
              Weekly Summary (Last 7 Days)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50">Member</th>
                  {last7Days.map(day => (
                    <th key={day} className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center min-w-[72px]">
                      {formatDayShort(day)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center min-w-[120px]">Totals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {managedUsers.map(member => {
                  const stats = memberWeekStats(member.id)
                  const effectivePresent = stats.present + stats.wfh + stats.meeting
                  const total = stats.total
                  const pct = total > 0 ? Math.round(((effectivePresent + stats.late) / total) * 100) : 0
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900 sticky left-0 bg-white">{member.name}</td>
                      {last7Days.map(day => {
                        const s = getAttendance(member.id, day)
                        return (
                          <td key={day} className="px-2 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${statusColor(s)}`}>
                              {s ? statusShort(s) : '—'}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5 text-xs">
                          <span className="text-green-700">P {effectivePresent}</span>
                          <span className="text-yellow-700">L {stats.late}</span>
                          <span className="text-red-700">A {stats.absent}</span>
                          <span className={`font-bold ${pct < 80 ? 'text-red-600' : 'text-gray-700'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AT-RISK MEMBERS */}
      {role !== 'sales_exec' && atRiskMembers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            Members Below 80% Attendance (Last 30 Days)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {atRiskMembers.map(member => {
              let present = 0, total = 0
              last30Days.forEach(day => {
                const s = getAttendance(member.id, day)
                if (s) {
                  total++
                  if (s === 'present' || s === 'wfh' || s === 'meeting' || s === 'late') present++
                }
              })
              const pct = total > 0 ? Math.round((present / total) * 100) : 0
              return (
                <div key={member.id} className="bg-white border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.team} · {member.role.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-600">{pct}%</span>
                    <p className="text-xs text-gray-400">{present}/{total} days</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MY ATTENDANCE SECTION */}
      {role === 'sales_exec' ? (
        // Full page for sales_exec
        <MyAttendancePanel
          currentUserId={currentUser.id}
          last30Days={last30Days}
          getAttendance={getAttendance}
          myStats={myStats}
          collapsible={false}
          open={true}
          onToggle={() => {}}
        />
      ) : (
        // Collapsible for other roles
        <MyAttendancePanel
          currentUserId={currentUser.id}
          last30Days={last30Days}
          getAttendance={getAttendance}
          myStats={myStats}
          collapsible={true}
          open={myAttendanceOpen}
          onToggle={() => setMyAttendanceOpen(o => !o)}
        />
      )}
    </div>
  )
}

interface MyAttendancePanelProps {
  currentUserId: string
  last30Days: string[]
  getAttendance: (userId: string, date: string) => AttendanceStatus | undefined
  myStats: { present: number; late: number; absent: number; total: number; pct: number }
  collapsible: boolean
  open: boolean
  onToggle: () => void
}

function MyAttendancePanel({ currentUserId, last30Days, getAttendance, myStats, collapsible, open, onToggle }: MyAttendancePanelProps) {
  const show = !collapsible || open

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <button
        className={`w-full flex items-center justify-between p-5 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} transition-colors`}
        onClick={collapsible ? onToggle : undefined}
        disabled={!collapsible}
      >
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={20} className="text-blue-500" />
          My Attendance — Last 30 Days
        </h2>
        {collapsible && (
          <span className="text-gray-400">{open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
        )}
      </button>

      {show && (
        <div className="px-5 pb-6 space-y-5">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{myStats.present}</p>
              <p className="text-xs text-green-600 mt-1">Present / WFH / Meeting</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{myStats.late}</p>
              <p className="text-xs text-yellow-600 mt-1">Late</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{myStats.absent}</p>
              <p className="text-xs text-red-600 mt-1">Absent</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${myStats.pct < 80 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-2xl font-bold ${myStats.pct < 80 ? 'text-red-700' : 'text-blue-700'}`}>{myStats.pct}%</p>
              <p className={`text-xs mt-1 ${myStats.pct < 80 ? 'text-red-600' : 'text-blue-600'}`}>Attendance Rate</p>
            </div>
          </div>

          {/* Calendar grid */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Day-by-Day</p>
            <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
              {last30Days.map(day => {
                const s = getAttendance(currentUserId, day)
                const d = new Date(day)
                const dayNum = d.getDate()
                const month = d.toLocaleDateString('en-IN', { month: 'short' })
                return (
                  <div
                    key={day}
                    title={`${formatDate(day)}: ${s ? STATUS_OPTIONS.find(o => o.value === s)?.label : 'No record'}`}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 border text-center min-h-[56px] ${s ? statusColor(s) : 'bg-gray-50 border-gray-100 text-gray-300'}`}
                  >
                    <span className="text-base leading-none">{statusIcon(s)}</span>
                    <span className="text-xs font-bold mt-1">{dayNum}</span>
                    <span className="text-[10px] opacity-70">{month}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mini legend */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {STATUS_OPTIONS.map(s => (
              <span key={s.value} className="flex items-center gap-1">
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200 inline-block" />
              <span>No Record</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
