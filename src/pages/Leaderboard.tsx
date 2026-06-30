import { useState, useEffect, useMemo } from 'react'
import useERPStore from '../store/erpStore'
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  Star,
  Flame,
  Rocket,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { WeekScore, User, Grade } from '../types'

type Tab = 'week' | 'daily' | 'alltime'
type TeamFilter = 'All' | 'OSR' | 'CRR' | 'NBD' | 'FSR'

function getWeekId(date = new Date()): string {
  const thursday = new Date(date)
  thursday.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
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

function getWeekDates(): string[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  const days: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(
      d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    )
  }
  return days
}

function gradeColor(grade: Grade): string {
  switch (grade) {
    case 'S': return 'bg-purple-500 text-white'
    case 'A': return 'bg-green-500 text-white'
    case 'B': return 'bg-blue-500 text-white'
    case 'C': return 'bg-yellow-500 text-white'
    case 'D': return 'bg-orange-500 text-white'
    case 'F': return 'bg-red-500 text-white'
    default:  return 'bg-gray-400 text-white'
  }
}

function gradeLabel(grade: Grade): string {
  switch (grade) {
    case 'S': return 'S — Superstar'
    case 'A': return 'A — Excellent'
    case 'B': return 'B — Good'
    case 'C': return 'C — Average'
    case 'D': return 'D — Below'
    case 'F': return 'F — Critical'
    default:  return grade
  }
}

const MOTIVATIONAL = [
  'Ek step aur — next rank ke liye!',
  'Zero hai target — zero tak paho!',
  'Aaj ka kaam, aaj karo!',
  'Har call ek mauka hai — mat chuko!',
  'Champion wahi jo kabhi nahi rukta!',
]

const TEAM_COLORS: Record<string, string> = {
  OSR: 'bg-blue-100 text-blue-700',
  CRR: 'bg-purple-100 text-purple-700',
  NBD: 'bg-green-100 text-green-700',
  FSR: 'bg-orange-100 text-orange-700',
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<Tab>('week')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('All')
  const [msgIdx, setMsgIdx] = useState(0)

  const currentUser = useERPStore(s => s.currentUser)
  const users = useERPStore(s => s.users)
  const morningPlans = useERPStore(s => s.morningPlans)
  const eveningActuals = useERPStore(s => s.eveningActuals)
  const weekScoresAll = useERPStore(s => s.weekScores)
  const getLeaderboard = useERPStore(s => s.getLeaderboard)
  const computeWeekScore = useERPStore(s => s.computeWeekScore)

  const weekId = getWeekId()
  const weekNumber = parseInt(weekId.split('-W')[1], 10)
  const weekDates = getWeekDates()

  // Ensure scores exist for all sales exec users
  useEffect(() => {
    const salesUsers = users.filter(u => u.role === 'sales_exec' && u.isActive)
    salesUsers.forEach(u => computeWeekScore(u.id))
  }, [users, computeWeekScore])

  // Rotate motivational message every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MOTIVATIONAL.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const leaderboard = useMemo(() => {
    const lb = getLeaderboard(weekId)
    // Only sales execs
    return lb.filter(e => e.user.role === 'sales_exec' && e.user.isActive)
  }, [getLeaderboard, weekId])

  const filtered = useMemo(() => {
    if (teamFilter === 'All') return leaderboard
    return leaderboard.filter(e => e.user.team === teamFilter)
  }, [leaderboard, teamFilter])

  const today = new Date().toISOString().split('T')[0]

  const dailyData = useMemo(() => {
    const salesUsers = users.filter(u => u.role === 'sales_exec' && u.isActive)
    return salesUsers
      .map(u => {
        const morning = morningPlans.find(p => p.userId === u.id && p.date === today)
        const evening = eveningActuals.find(e => e.userId === u.id && e.date === today)
        const morningDone = !!morning
        const eveningDone = !!evening
        const score = (morningDone ? 10 : 0) + (eveningDone ? evening!.todayScore : 0)
        return { user: u, morningDone, eveningDone, score, todayScore: evening?.todayScore ?? null }
      })
      .filter(d => teamFilter === 'All' || d.user.team === teamFilter)
      .sort((a, b) => b.score - a.score)
  }, [users, morningPlans, eveningActuals, today, teamFilter])

  const myEntry = leaderboard.find(e => e.userId === currentUser?.id)
  const myRank = filtered.findIndex(e => e.userId === currentUser?.id) + 1

  const top3 = filtered.slice(0, 3)
  const podium = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]  // #2, #1, #3
    : top3.length === 2
    ? [top3[1], top3[0]]
    : top3

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'week',    label: 'This Week',    icon: <Trophy size={14} /> },
    { id: 'daily',   label: 'Daily Flash',  icon: <Zap size={14} /> },
    { id: 'alltime', label: 'All Time',     icon: <Star size={14} /> },
  ]

  const teams: TeamFilter[] = ['All', 'OSR', 'CRR', 'NBD', 'FSR']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy size={28} className="text-slate-900" />
            LEADERBOARD
          </h1>
          <p className="text-slate-800 text-sm font-semibold mt-0.5">
            Sabse aage kaun hai? Dekho, seekho, aage badho!
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Team Filter */}
        <div className="flex gap-2 flex-wrap">
          {teams.map(tm => (
            <button
              key={tm}
              onClick={() => setTeamFilter(tm)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                teamFilter === tm
                  ? 'bg-amber-400 text-slate-900 border-amber-400'
                  : 'border-slate-600 text-slate-400 hover:border-amber-400 hover:text-amber-400'
              }`}
            >
              {tm}
            </button>
          ))}
        </div>

        {/* ===== WEEK TAB ===== */}
        {activeTab === 'week' && (
          <>
            {/* Week Header */}
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-amber-400 font-black text-lg">
                  WEEK {weekNumber} LEADERBOARD
                </span>
                <span className="text-slate-400 text-xs">
                  {weekDates[0]} — {weekDates[5]}
                </span>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {weekDates.map((d, i) => (
                  <span key={i} className="text-xs bg-slate-700 rounded px-2 py-0.5 text-slate-300">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Podium */}
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Trophy size={40} className="mx-auto mb-2 opacity-30" />
                <p>Abhi tak koi score nahi. Plans bharo!</p>
              </div>
            ) : (
              <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700">
                <p className="text-center text-slate-400 text-xs uppercase tracking-widest mb-4">
                  Top Performers
                </p>
                <div className="flex items-end justify-center gap-3">
                  {podium.map((entry, podiumIdx) => {
                    const actualRank = filtered.indexOf(entry) + 1
                    const isFirst = actualRank === 1
                    const isSecond = actualRank === 2
                    const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉'
                    const heightClass = isFirst
                      ? 'h-32'
                      : isSecond
                      ? 'h-24'
                      : 'h-20'
                    const bgClass = isFirst
                      ? 'bg-gradient-to-t from-yellow-600 to-amber-400'
                      : isSecond
                      ? 'bg-gradient-to-t from-slate-500 to-slate-300'
                      : 'bg-gradient-to-t from-amber-800 to-amber-600'
                    return (
                      <div key={entry.userId} className="flex flex-col items-center gap-1 flex-1">
                        <div className="text-center">
                          <div className="text-2xl">{medal}</div>
                          <p className="font-bold text-white text-sm leading-tight text-center">
                            {entry.user.name.split(' ')[0]}
                          </p>
                          <p className={`text-xs font-black ${isFirst ? 'text-amber-300' : 'text-slate-300'}`}>
                            {entry.finalScore > 0 ? '+' : ''}{entry.finalScore} pts
                          </p>
                          <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${gradeColor(entry.grade)} mt-0.5`}>
                            {entry.grade}
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {entry.achievementPct.toFixed(0)}%
                          </p>
                        </div>
                        <div className={`w-full rounded-t-lg ${heightClass} ${bgClass} flex items-end justify-center pb-1`}>
                          <span className="text-white font-black text-lg">#{actualRank}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full Ranked List */}
            {filtered.length > 0 && (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs uppercase tracking-widest px-1">Full Rankings</p>
                {filtered.map((entry, idx) => {
                  const rank = idx + 1
                  const isMe = entry.userId === currentUser?.id
                  const deficit = entry.finalScore < 0 ? entry.finalScore : 0
                  const pct = Math.min(100, Math.max(0, entry.achievementPct))
                  // Simulate change: random up/down/same based on userId hash
                  const hash = entry.userId.charCodeAt(0) % 3
                  const change = hash === 0 ? 'up' : hash === 1 ? 'down' : 'same'

                  return (
                    <div
                      key={entry.userId}
                      className={`rounded-xl p-3 border transition-all ${
                        isMe
                          ? 'border-blue-500 bg-blue-950/50 shadow-lg shadow-blue-900/30'
                          : 'border-slate-700 bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          rank === 1 ? 'bg-amber-400 text-slate-900' :
                          rank === 2 ? 'bg-slate-300 text-slate-900' :
                          rank === 3 ? 'bg-amber-700 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {rank}
                        </div>

                        {/* Name + Team */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                              {entry.user.name}
                              {isMe && <span className="ml-1 text-blue-400 text-xs">(You)</span>}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TEAM_COLORS[entry.user.team] ?? 'bg-slate-600 text-white'}`}>
                              {entry.user.team}
                            </span>
                          </div>

                          {/* Achievement bar */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-green-400 text-xs font-bold shrink-0">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <div className={`font-black text-base ${entry.finalScore >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                            {entry.finalScore > 0 ? '+' : ''}{entry.finalScore}
                          </div>
                          {deficit < 0 && (
                            <div className="text-orange-500 text-xs">({deficit})</div>
                          )}
                        </div>

                        {/* Grade */}
                        <span className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${gradeColor(entry.grade)}`}>
                          {entry.grade}
                        </span>

                        {/* Change indicator */}
                        <div className="shrink-0 w-5 flex justify-center">
                          {change === 'up' && <ChevronUp size={16} className="text-green-400" />}
                          {change === 'down' && <ChevronDown size={16} className="text-red-400" />}
                          {change === 'same' && <Minus size={14} className="text-slate-500" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* My Position (if not in filtered) */}
            {currentUser && myEntry && myRank === 0 && teamFilter !== 'All' && (
              <div className="rounded-xl p-3 border-2 border-blue-500 bg-blue-950/50 mt-2">
                <p className="text-blue-300 text-xs mb-1 font-bold uppercase tracking-wide">Your Position (All Teams)</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-black text-sm text-white">
                    #{leaderboard.findIndex(e => e.userId === currentUser.id) + 1}
                  </div>
                  <span className="font-bold text-white">{currentUser.name}</span>
                  <span className="ml-auto font-black text-base text-orange-400">
                    {myEntry.finalScore > 0 ? '+' : ''}{myEntry.finalScore}
                  </span>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${gradeColor(myEntry.grade)}`}>
                    {myEntry.grade}
                  </span>
                </div>
              </div>
            )}

            {/* Score Explanation Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-amber-400" />
                <span className="font-bold text-amber-400 text-sm uppercase tracking-wide">
                  How Scoring Works
                </span>
              </div>
              <ul className="space-y-1.5 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span>Week starts at <strong className="text-white">0</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>KPI achieved <strong className="text-green-400">100%+</strong> = 0 (no deduction)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>KPI missed = <strong className="text-red-400">negative points</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>KPI exceeded = <strong className="text-amber-400">bonus points</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span>Goal: Stay as close to <strong className="text-white">0 as possible!</strong></span>
                </li>
              </ul>
              <div className="mt-3 grid grid-cols-6 gap-1 text-center text-xs">
                {(['S','A','B','C','D','F'] as Grade[]).map(g => (
                  <div key={g} className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-0.5 rounded font-bold ${gradeColor(g)}`}>{g}</span>
                    <span className="text-slate-500 text-xs leading-tight">{
                      g === 'S' ? '≥0' :
                      g === 'A' ? '≥-20' :
                      g === 'B' ? '≥-50' :
                      g === 'C' ? '≥-100' :
                      g === 'D' ? '≥-150' : '<-150'
                    }</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== DAILY FLASH TAB ===== */}
        {activeTab === 'daily' && (
          <>
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-3 flex items-center gap-3">
              <Flame size={28} className="text-white shrink-0" />
              <div>
                <p className="font-black text-white text-base">Daily Flash</p>
                <p className="text-orange-100 text-xs">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            {dailyData.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Zap size={40} className="mx-auto mb-2 opacity-30" />
                <p>Aaj kisi ne abhi plans submit nahi kiye.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyData.map((d, idx) => {
                  const isTop = idx === 0
                  const isMe = d.user.id === currentUser?.id
                  return (
                    <div
                      key={d.user.id}
                      className={`rounded-xl p-3 border transition-all ${
                        isMe
                          ? 'border-blue-500 bg-blue-950/50'
                          : isTop
                          ? 'border-amber-500 bg-amber-950/40'
                          : 'border-slate-700 bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          isTop ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{d.user.name}</span>
                            {isTop && (
                              <span className="flex items-center gap-1 text-xs bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full font-black">
                                <Rocket size={10} /> Today's Rocket
                              </span>
                            )}
                            {isMe && <span className="text-blue-400 text-xs font-bold">(You)</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TEAM_COLORS[d.user.team] ?? 'bg-slate-600 text-white'}`}>
                              {d.user.team}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs flex items-center gap-1 ${d.morningDone ? 'text-green-400' : 'text-slate-500'}`}>
                              {d.morningDone ? '✓' : '○'} Morning Plan
                            </span>
                            <span className={`text-xs flex items-center gap-1 ${d.eveningDone ? 'text-green-400' : 'text-slate-500'}`}>
                              {d.eveningDone ? '✓' : '○'} Evening Actual
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-black text-base ${d.score >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                            {d.score > 0 ? '+' : ''}{d.score}
                          </div>
                          <div className="text-slate-500 text-xs">pts today</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">Daily Score = </p>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Morning plan submitted on time: <strong className="text-green-400">+10 pts</strong></li>
                <li>• Evening actual submitted: <strong className="text-green-400">+today's score</strong></li>
                <li>• Missing either: <strong className="text-red-400">penalties apply</strong></li>
              </ul>
            </div>
          </>
        )}

        {/* ===== ALL TIME TAB ===== */}
        {activeTab === 'alltime' && (
          <>
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 rounded-xl p-3 flex items-center gap-3">
              <Star size={28} className="text-yellow-300 shrink-0" />
              <div>
                <p className="font-black text-white text-base">All Time Rankings</p>
                <p className="text-purple-200 text-xs">Cumulative performance across all weeks</p>
              </div>
            </div>

            <div className="space-y-2">
              {(() => {
                const salesUsers = users
                  .filter(u => u.role === 'sales_exec' && u.isActive)
                  .filter(u => teamFilter === 'All' || u.team === teamFilter)

                // Aggregate: sum finalScore across all weekScores
                const ranked = salesUsers
                  .map(u => {
                    const scores = weekScoresAll.filter(s => s.userId === u.id)
                    const totalScore = scores.reduce((acc, s) => acc + s.finalScore, 0)
                    const avgAchievement = scores.length
                      ? scores.reduce((acc, s) => acc + s.achievementPct, 0) / scores.length
                      : 0
                    const weeksPlayed = scores.length
                    return { user: u, totalScore, avgAchievement, weeksPlayed }
                  })
                  .sort((a, b) => b.totalScore - a.totalScore)

                if (ranked.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-500">
                      <Star size={40} className="mx-auto mb-2 opacity-30" />
                      <p>Koi data nahi mila abhi tak.</p>
                    </div>
                  )
                }

                return ranked.map((r, idx) => {
                  const rank = idx + 1
                  const isMe = r.user.id === currentUser?.id
                  return (
                    <div
                      key={r.user.id}
                      className={`rounded-xl p-3 border ${
                        isMe
                          ? 'border-blue-500 bg-blue-950/50'
                          : 'border-slate-700 bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          rank === 1 ? 'bg-amber-400 text-slate-900' :
                          rank === 2 ? 'bg-slate-300 text-slate-900' :
                          rank === 3 ? 'bg-amber-700 text-white' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{r.user.name}</span>
                            {isMe && <span className="text-blue-400 text-xs font-bold">(You)</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TEAM_COLORS[r.user.team] ?? 'bg-slate-600 text-white'}`}>
                              {r.user.team}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-slate-400">{r.weeksPlayed} weeks</span>
                            <span className="text-xs text-green-400">{r.avgAchievement.toFixed(0)}% avg</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-black text-base ${r.totalScore >= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                            {r.totalScore > 0 ? '+' : ''}{r.totalScore}
                          </div>
                          <div className="text-slate-500 text-xs">total pts</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </>
        )}

        {/* Motivational Banner */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl shrink-0 animate-bounce">🚀</div>
          <p
            key={msgIdx}
            className="text-white font-bold text-sm flex-1 transition-all"
            style={{ animation: 'fadeIn 0.5s ease-in' }}
          >
            {MOTIVATIONAL[msgIdx]}
          </p>
          <TrendingUp size={18} className="text-amber-400 shrink-0" />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
