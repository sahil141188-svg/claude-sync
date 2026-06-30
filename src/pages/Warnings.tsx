import { useState } from 'react'
import { useERPStore } from '../store/erpStore'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  CheckCircle2,
  TrendingUp,
  Trophy,
  UserX,
  ArrowUpCircle,
  ClipboardList,
} from 'lucide-react'

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
        7
    )
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getPrevWeekId(weekId: string): string {
  const [yearStr, weekStr] = weekId.split('-W')
  let year = parseInt(yearStr, 10)
  let week = parseInt(weekStr, 10) - 1
  if (week < 1) {
    year -= 1
    week = 52
  }
  return `${year}-W${String(week).padStart(2, '0')}`
}

export default function Warnings() {
  const { users, weekScores, getLeaderboard, warnings } = useERPStore()
  const currentWeek = getWeekId()
  const prevWeek = getPrevWeekId(currentWeek)
  const prevPrevWeek = getPrevWeekId(prevWeek)

  const [openSection, setOpenSection] = useState<'yellow' | 'orange' | 'red' | null>('yellow')
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({})
  const [sentNotices, setSentNotices] = useState<Set<string>>(new Set())
  const [markedImproving, setMarkedImproving] = useState<Set<string>>(new Set())
  const [escalated, setEscalated] = useState<Set<string>>(new Set())

  const leaderboard = getLeaderboard(currentWeek)
  const prevLeaderboard = getLeaderboard(prevWeek)
  const prevPrevLeaderboard = getLeaderboard(prevPrevWeek)

  const salesExecs = users.filter((u) => u.role === 'sales_exec')

  // Helper: get score entry for a user in a given leaderboard
  const getEntry = (userId: string, board: typeof leaderboard) =>
    board.find((e) => e.userId === userId) ?? null

  // Yellow: Grade D or F this week, or <60% achievement
  const yellowMembers = salesExecs.filter((u) => {
    const entry = getEntry(u.id, leaderboard)
    if (!entry) return false
    return (
      entry.grade === 'D' ||
      entry.grade === 'F' ||
      entry.achievementPct < 60
    )
  })

  // Orange: poor (D/F or <60%) for 2 consecutive weeks (current + prev)
  const orangeMembers = salesExecs.filter((u) => {
    const cur = getEntry(u.id, leaderboard)
    const prev = getEntry(u.id, prevLeaderboard)
    if (!cur || !prev) return false
    const poorCur = cur.grade === 'D' || cur.grade === 'F' || cur.achievementPct < 60
    const poorPrev = prev.grade === 'D' || prev.grade === 'F' || prev.achievementPct < 60
    return poorCur && poorPrev
  })

  // Red: 3+ consecutive poor weeks
  const redMembers = salesExecs.filter((u) => {
    const cur = getEntry(u.id, leaderboard)
    const prev = getEntry(u.id, prevLeaderboard)
    const pp = getEntry(u.id, prevPrevLeaderboard)
    if (!cur || !prev || !pp) return false
    const poor = (e: typeof cur) =>
      e.grade === 'D' || e.grade === 'F' || e.achievementPct < 60
    return poor(cur) && poor(prev) && poor(pp)
  })

  // At-risk: Grade C this week, not already yellow/orange/red
  const atRiskMembers = salesExecs.filter((u) => {
    const entry = getEntry(u.id, leaderboard)
    if (!entry) return false
    const isAlreadyFlagged =
      yellowMembers.some((m) => m.id === u.id) ||
      orangeMembers.some((m) => m.id === u.id) ||
      redMembers.some((m) => m.id === u.id)
    return !isAlreadyFlagged && entry.grade === 'C'
  })

  // Hardcoded recovery story for demo
  const recoveryStories = [
    {
      id: 'demo-recovery-1',
      name: 'Charanpreet',
      team: 'CRR',
      from: 'Orange Warning',
      to: 'Grade A',
      weeks: 2,
    },
  ]

  const toggleSection = (section: 'yellow' | 'orange' | 'red') => {
    setOpenSection((prev) => (prev === section ? null : section))
  }

  const triggerReason = (userId: string): string => {
    const entry = getEntry(userId, leaderboard)
    if (!entry) return 'Insufficient data'
    const reasons: string[] = []
    if (entry.grade === 'D' || entry.grade === 'F')
      reasons.push(`Grade ${entry.grade} this week`)
    if (entry.achievementPct < 60)
      reasons.push(`Only ${entry.achievementPct.toFixed(0)}% plan achievement`)
    return reasons.join(' · ') || 'Performance below threshold'
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={28} />
            PERFORMANCE WARNINGS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Week: {currentWeek}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-sm">
            🟡 Yellow: {yellowMembers.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 font-semibold text-sm">
            🟠 Orange: {orangeMembers.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-800 font-semibold text-sm">
            🔴 Red: {redMembers.length}
          </span>
        </div>
      </div>

      {/* Yellow Section */}
      <div className="border border-yellow-300 rounded-xl overflow-hidden shadow-sm">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          onClick={() => toggleSection('yellow')}
        >
          <div className="flex items-center gap-2 font-semibold text-yellow-800 text-lg">
            <AlertTriangle size={20} className="text-yellow-500" />
            🟡 YELLOW CARDS
            <span className="ml-2 text-sm font-normal text-yellow-600">
              ({yellowMembers.length} member{yellowMembers.length !== 1 ? 's' : ''})
            </span>
          </div>
          {openSection === 'yellow' ? (
            <ChevronDown size={20} className="text-yellow-600" />
          ) : (
            <ChevronRight size={20} className="text-yellow-600" />
          )}
        </button>

        {openSection === 'yellow' && (
          <div className="divide-y divide-yellow-100">
            {yellowMembers.length === 0 ? (
              <div className="px-5 py-8 text-center text-green-700 font-medium flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-green-400" />
                No yellow cards this week
              </div>
            ) : (
              yellowMembers.map((member) => {
                const entry = getEntry(member.id, leaderboard)
                const sent = sentNotices.has(member.id)
                return (
                  <div key={member.id} className="px-5 py-4 bg-white hover:bg-yellow-50/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-base">{member.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {member.team}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                            System Auto-Detection
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span>
                            Grade:{' '}
                            <span
                              className={`font-bold ${
                                entry?.grade === 'F'
                                  ? 'text-red-600'
                                  : entry?.grade === 'D'
                                  ? 'text-orange-600'
                                  : 'text-yellow-700'
                              }`}
                            >
                              {entry?.grade ?? 'N/A'}
                            </span>
                          </span>
                          <span>
                            Score:{' '}
                            <span className="font-medium text-gray-800">
                              {entry?.finalScore?.toFixed(0) ?? '—'}
                            </span>
                          </span>
                          <span>
                            Achievement:{' '}
                            <span className="font-medium text-gray-800">
                              {entry?.achievementPct?.toFixed(0) ?? '—'}%
                            </span>
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 font-medium">
                          Trigger: {triggerReason(member.id)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSentNotices((prev) => new Set([...prev, member.id]))}
                        disabled={sent}
                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sent
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        }`}
                      >
                        {sent ? (
                          <>
                            <CheckCircle2 size={15} />
                            Notice Sent
                          </>
                        ) : (
                          <>
                            <FileText size={15} />
                            Send Warning Notice
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Orange Section */}
      <div className="border border-orange-300 rounded-xl overflow-hidden shadow-sm">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-orange-50 hover:bg-orange-100 transition-colors"
          onClick={() => toggleSection('orange')}
        >
          <div className="flex items-center gap-2 font-semibold text-orange-800 text-lg">
            <ClipboardList size={20} className="text-orange-500" />
            🟠 ORANGE WARNINGS (PIP)
            <span className="ml-2 text-sm font-normal text-orange-600">
              ({orangeMembers.length} member{orangeMembers.length !== 1 ? 's' : ''})
            </span>
          </div>
          {openSection === 'orange' ? (
            <ChevronDown size={20} className="text-orange-600" />
          ) : (
            <ChevronRight size={20} className="text-orange-600" />
          )}
        </button>

        {openSection === 'orange' && (
          <div className="divide-y divide-orange-100">
            {orangeMembers.length === 0 ? (
              <div className="px-5 py-8 text-center text-green-700 font-medium flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-green-400" />
                No members on PIP this week
              </div>
            ) : (
              orangeMembers.map((member) => {
                const entry = getEntry(member.id, leaderboard)
                const prevEntry = getEntry(member.id, prevLeaderboard)
                const noteKey = `orange-${member.id}`
                const improving = markedImproving.has(member.id)
                const esc = escalated.has(member.id)
                return (
                  <div key={member.id} className="px-5 py-5 bg-white space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-base">{member.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {member.team}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                        2 Consecutive Poor Weeks
                      </span>
                    </div>

                    {/* PIP Template */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                      <p className="font-bold text-orange-800 text-sm uppercase tracking-wide">
                        Performance Improvement Plan
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 mb-0.5">Current Week Goals</p>
                          <p className="font-medium text-gray-800">
                            Achievement: 100% plan · Grade B or above
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-0.5">Actual Progress</p>
                          <p className="font-medium text-gray-800">
                            Week {currentWeek}: Grade {entry?.grade ?? 'N/A'} ·{' '}
                            {entry?.achievementPct?.toFixed(0) ?? '—'}%
                          </p>
                          <p className="text-gray-600 text-xs">
                            Prev week: Grade {prevEntry?.grade ?? 'N/A'} ·{' '}
                            {prevEntry?.achievementPct?.toFixed(0) ?? '—'}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Manager note */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager Note
                      </label>
                      <textarea
                        rows={2}
                        value={managerNotes[noteKey] ?? ''}
                        onChange={(e) =>
                          setManagerNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))
                        }
                        placeholder="Add coaching notes, action items, or observations..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          setMarkedImproving((prev) => new Set([...prev, member.id]))
                        }
                        disabled={improving}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          improving
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <TrendingUp size={15} />
                        {improving ? 'Marked as Improving' : 'Mark as Improving'}
                      </button>
                      <button
                        onClick={() => setEscalated((prev) => new Set([...prev, member.id]))}
                        disabled={esc}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          esc
                            ? 'bg-red-100 text-red-700 cursor-default'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <ArrowUpCircle size={15} />
                        {esc ? 'Escalated to Red' : 'Escalate to Red'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Red Section */}
      <div className="border border-red-300 rounded-xl overflow-hidden shadow-sm">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-red-50 hover:bg-red-100 transition-colors"
          onClick={() => toggleSection('red')}
        >
          <div className="flex items-center gap-2 font-semibold text-red-800 text-lg">
            <UserX size={20} className="text-red-500" />
            🔴 RED CARDS — CRITICAL
            <span className="ml-2 text-sm font-normal text-red-600">
              ({redMembers.length} member{redMembers.length !== 1 ? 's' : ''})
            </span>
          </div>
          {openSection === 'red' ? (
            <ChevronDown size={20} className="text-red-600" />
          ) : (
            <ChevronRight size={20} className="text-red-600" />
          )}
        </button>

        {openSection === 'red' && (
          <div className="divide-y divide-red-100">
            {redMembers.length === 0 ? (
              <div className="px-5 py-8 text-center text-green-700 font-medium flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-green-400" />
                No red cards this week
              </div>
            ) : (
              redMembers.map((member) => {
                const entry = getEntry(member.id, leaderboard)
                const noteKey = `red-${member.id}`
                return (
                  <div key={member.id} className="px-5 py-5 bg-white space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-base">{member.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {member.team}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        3+ Consecutive Poor Weeks
                      </span>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-1">
                      <p>
                        <span className="font-semibold">Current Grade:</span>{' '}
                        {entry?.grade ?? 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Achievement:</span>{' '}
                        {entry?.achievementPct?.toFixed(0) ?? '—'}%
                      </p>
                      <p>
                        <span className="font-semibold">Final Score:</span>{' '}
                        {entry?.finalScore?.toFixed(0) ?? '—'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HR / Manager Notes
                      </label>
                      <textarea
                        rows={2}
                        value={managerNotes[noteKey] ?? ''}
                        onChange={(e) =>
                          setManagerNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))
                        }
                        placeholder="Document HR observations or action plan..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-900 text-white transition-colors"
                      >
                        <Printer size={15} />
                        Download Performance PDF
                      </button>
                      <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                        <ClipboardList size={15} />
                        Extend PIP
                      </button>
                      <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">
                        <UserX size={15} />
                        HR Review
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* At-Risk Preview */}
      {atRiskMembers.length > 0 && (
        <div className="border border-yellow-200 bg-yellow-50/50 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-yellow-800 flex items-center gap-2 text-base">
            <AlertTriangle size={18} className="text-yellow-500" />
            AT-RISK PREVIEW — Next Week
          </h2>
          <ul className="space-y-2">
            {atRiskMembers.map((member) => {
              const entry = getEntry(member.id, leaderboard)
              return (
                <li
                  key={member.id}
                  className="text-sm text-yellow-900 bg-white border border-yellow-200 rounded-lg px-4 py-2.5"
                >
                  <span className="font-semibold">{member.name}</span> — currently Grade{' '}
                  <span className="font-bold">{entry?.grade ?? 'C'}</span> (
                  {entry?.achievementPct?.toFixed(0) ?? '—'}% achievement). If this continues,{' '}
                  <span className="font-semibold text-yellow-700">
                    Yellow Card triggers next week.
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recovery Stories */}
      <div className="border border-green-200 bg-green-50/50 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-green-800 flex items-center gap-2 text-base">
          <Trophy size={18} className="text-green-500" />
          RECOVERY STORIES
        </h2>
        <ul className="space-y-2">
          {recoveryStories.map((story) => (
            <li
              key={story.id}
              className="text-sm text-green-900 bg-white border border-green-200 rounded-lg px-4 py-2.5 flex items-start gap-2"
            >
              <span className="text-lg">🏆</span>
              <span>
                <span className="font-semibold">Comeback:</span>{' '}
                <span className="font-semibold">{story.name}</span> ({story.team}) was{' '}
                <span className="text-orange-700 font-medium">{story.from}</span> → now{' '}
                <span className="text-green-700 font-medium">{story.to}</span> for{' '}
                {story.weeks} weeks straight. Keep it up!
              </span>
            </li>
          ))}
          {recoveryStories.length === 0 && (
            <li className="text-sm text-gray-500 italic">
              No recovery stories yet — they will appear here when members turn things around.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
