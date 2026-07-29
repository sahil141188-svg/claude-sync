import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  LogOut,
  ChevronDown,
  ChevronUp,
  Users,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  Calendar,
  Megaphone,
  FileText,
  UserPlus,
} from 'lucide-react'
import useERPStore from '../store/erpStore'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function gradeColor(grade: string): string {
  if (grade === 'S' || grade === 'A') return '#166534'
  if (grade === 'B') return '#854d0e'
  if (grade === 'C') return '#9a3412'
  return '#7f1d1d'
}

function gradeBg(grade: string): string {
  if (grade === 'S' || grade === 'A') return '#dcfce7'
  if (grade === 'B') return '#fef9c3'
  if (grade === 'C') return '#ffedd5'
  return '#fee2e2'
}

function rowBg(grade: string): string {
  if (grade === 'S' || grade === 'A') return '#f0fdf4'
  if (grade === 'B') return '#fefce8'
  if (grade === 'C') return '#fff7ed'
  return '#fef2f2'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const {
    currentUser,
    users,
    morningPlans,
    eveningActuals,
    attendance,
    leads,
    assignedTasks,
    getLeaderboard,
    getDangerZone,
    getAllWeekScores,
    logout,
  } = useERPStore()

  const [dangerOpen, setDangerOpen] = useState(true)

  const today = todayStr()
  const salesExecs = users.filter(u => u.role === 'sales_exec')
  const totalMembers = salesExecs.length

  // Zone 1 — Today Snapshot
  const plansToday = morningPlans.filter(p => p.date === today)
  const actualsToday = eveningActuals.filter(e => e.date === today)
  const presentToday = attendance.filter(a => a.date === today && (a.status === 'present' || a.status === 'late'))
  const dangerZone = getDangerZone()

  const plansPct = totalMembers > 0 ? plansToday.length / totalMembers : 0
  const actualsPct = totalMembers > 0 ? actualsToday.length / totalMembers : 0

  // Zone 2 — Week Health
  const weekScores = getAllWeekScores()
  const teamAvgScore = weekScores.length > 0
    ? Math.round(weekScores.reduce((s, w) => s + w.finalScore, 0) / weekScores.length)
    : 0
  const avgAchievement = weekScores.length > 0
    ? Math.round(weekScores.reduce((s, w) => s + w.achievementPct, 0) / weekScores.length)
    : 0

  // Plan compliance: count unique (userId, date) pairs with morning plan this week
  const now = new Date()
  const weekDays: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - now.getDay() + 1 + i)
    weekDays.push(d.toISOString().split('T')[0])
  }
  const possibleDays = totalMembers * weekDays.length
  const daysWithPlan = morningPlans.filter(p => weekDays.includes(p.date)).length
  const planCompliance = possibleDays > 0 ? Math.round((daysWithPlan / possibleDays) * 100) : 0

  // Zone 4 — Team Performance
  const leaderboard = getLeaderboard()
  const leaderboardMap = new Map(leaderboard.map(l => [l.userId, l]))

  // Zone 5 — Leaderboard preview top 5
  const top5 = leaderboard.slice(0, 5)

  // Zone 7 — Recent Activity Feed (last 10 combined)
  type ActivityItem = { time: string; label: string; key: string }
  const activities: ActivityItem[] = []

  morningPlans.forEach(p => {
    const user = users.find(u => u.id === p.userId)
    if (user) {
      activities.push({
        time: p.date + 'T09:00:00',
        label: `${user.name} submitted morning plan`,
        key: 'morning-' + p.id,
      })
    }
  })

  eveningActuals.forEach(e => {
    const user = users.find(u => u.id === e.userId)
    if (user) {
      activities.push({
        time: e.date + 'T18:00:00',
        label: `${user.name} submitted evening actuals`,
        key: 'evening-' + e.id,
      })
    }
  })

  leads.forEach(l => {
    const user = users.find(u => u.id === l.userId)
    if (user) {
      activities.push({
        time: l.createdAt,
        label: `${user.name} added a lead: ${l.companyName}`,
        key: 'lead-' + l.id,
      })
    }
  })

  activities.sort((a, b) => b.time.localeCompare(a.time))
  const recentActivities = activities.slice(0, 10)

  // Notifications count (pending tasks + danger zone)
  const pendingTasksCount = assignedTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length
  const notifCount = dangerZone.length + pendingTasksCount

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* TOPBAR */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: '#f8fafc' }}>
            🚀 ROCKET LAUNCH ERP
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{formatDate(new Date())}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>{currentUser?.name}</span>
          <div style={{ position: 'relative' }}>
            <Bell size={20} color="#94a3b8" />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#ef4444', color: '#fff',
                borderRadius: '50%', fontSize: 10, fontWeight: 700,
                width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{notifCount}</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#ef4444', color: '#fff',
              border: 'none', borderRadius: 6,
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1600, margin: '0 auto' }}>

        {/* ZONE 1 — TODAY SNAPSHOT */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Today's Snapshot — {today}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {/* Plans Submitted */}
            <MetricCard
              icon={<ClipboardList size={20} />}
              label="Plans Submitted"
              value={`${plansToday.length}/${totalMembers}`}
              sub="members"
              accent={plansPct >= 0.7 ? '#22c55e' : '#ef4444'}
              bg={plansPct >= 0.7 ? '#052e16' : '#450a0a'}
              pct={Math.round(plansPct * 100)}
            />
            {/* Actuals Submitted */}
            <MetricCard
              icon={<CheckSquare size={20} />}
              label="Actuals Submitted"
              value={`${actualsToday.length}/${totalMembers}`}
              sub="members"
              accent={actualsPct >= 0.7 ? '#22c55e' : '#ef4444'}
              bg={actualsPct >= 0.7 ? '#052e16' : '#450a0a'}
              pct={Math.round(actualsPct * 100)}
            />
            {/* Present Today */}
            <MetricCard
              icon={<Users size={20} />}
              label="Present Today"
              value={`${presentToday.length}/${totalMembers}`}
              sub="members"
              accent="#3b82f6"
              bg="#0c1a3a"
              pct={totalMembers > 0 ? Math.round((presentToday.length / totalMembers) * 100) : 0}
            />
            {/* Danger Zone */}
            <MetricCard
              icon={<AlertTriangle size={20} />}
              label="Danger Zone"
              value={`${dangerZone.length}`}
              sub="members at risk"
              accent={dangerZone.length === 0 ? '#22c55e' : '#f97316'}
              bg={dangerZone.length === 0 ? '#052e16' : '#431407'}
              pct={null}
            />
          </div>
        </div>

        {/* ZONE 2 — WEEK HEALTH */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Week Health
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <WeekCard icon={<TrendingUp size={18} />} label="Team Avg Score" value={teamAvgScore} unit="pts" />
            <WeekCard icon={<BarChart2 size={18} />} label="Avg Achievement %" value={avgAchievement} unit="%" />
            <WeekCard icon={<Calendar size={18} />} label="Plan Compliance Rate" value={planCompliance} unit="%" />
          </div>
        </div>

        {/* ZONE 3 — DANGER ZONE PANEL */}
        <div style={{
          marginBottom: 20,
          border: '1.5px solid #ef4444',
          borderRadius: 10,
          overflow: 'hidden',
          background: '#1e293b',
        }}>
          <div
            onClick={() => setDangerOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              cursor: 'pointer',
              background: '#2d0707',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontWeight: 700, color: '#fca5a5', fontSize: 14 }}>
                Danger Zone ({dangerZone.length} members)
              </span>
            </div>
            {dangerOpen ? <ChevronUp size={16} color="#fca5a5" /> : <ChevronDown size={16} color="#fca5a5" />}
          </div>
          {dangerOpen && (
            <div style={{ padding: 16 }}>
              {dangerZone.length === 0 ? (
                <div style={{ color: '#22c55e', fontSize: 14, textAlign: 'center', padding: 12 }}>
                  ✅ No danger zone members
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#94a3b8' }}>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Team</th>
                      <th style={thStyle}>Last Seen</th>
                      <th style={thStyle}>Days Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dangerZone.map(u => {
                      const lastPlan = morningPlans
                        .filter(p => p.userId === u.id)
                        .sort((a, b) => b.date.localeCompare(a.date))[0]
                      const lastSeen = lastPlan ? lastPlan.date : 'Never'
                      const daysMissing = lastPlan
                        ? Math.floor((Date.now() - new Date(lastPlan.date).getTime()) / 86400000)
                        : '—'
                      return (
                        <tr key={u.id} style={{ borderTop: '1px solid #374151' }}>
                          <td style={tdStyle}>{u.name}</td>
                          <td style={tdStyle}>
                            <span style={{ background: '#1e3a5f', color: '#93c5fd', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                              {u.team}
                            </span>
                          </td>
                          <td style={tdStyle}>{lastSeen}</td>
                          <td style={{ ...tdStyle, color: '#ef4444', fontWeight: 700 }}>{daysMissing}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ZONE 4 — TEAM PERFORMANCE TABLE */}
        <div style={{ marginBottom: 20, background: '#1e293b', borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Team Performance</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#64748b' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Team</th>
                  <th style={thStyle}>Today Plan</th>
                  <th style={thStyle}>Today Actual</th>
                  <th style={thStyle}>Week Score</th>
                  <th style={thStyle}>Achievement%</th>
                  <th style={thStyle}>Grade</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesExecs.map((exec, idx) => {
                  const ws = leaderboardMap.get(exec.id)
                  const grade = ws?.grade ?? '—'
                  const hasMorning = morningPlans.some(p => p.userId === exec.id && p.date === today)
                  const hasEvening = eveningActuals.some(e => e.userId === exec.id && e.date === today)
                  return (
                    <tr key={exec.id} style={{ background: grade !== '—' ? rowBg(grade) : '#1e293b', borderTop: '1px solid #e2e8f0', color: '#1e293b' }}>
                      <td style={{ ...tdStyle, color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#0f172a' }}>{exec.name}</td>
                      <td style={tdStyle}>
                        <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          {exec.team}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {hasMorning
                          ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✅</span>
                          : <span style={{ color: '#dc2626', fontWeight: 700 }}>❌</span>}
                      </td>
                      <td style={tdStyle}>
                        {hasEvening
                          ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✅</span>
                          : <span style={{ color: '#dc2626', fontWeight: 700 }}>❌</span>}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>
                        {ws ? ws.finalScore : '—'}
                      </td>
                      <td style={tdStyle}>
                        {ws ? `${Math.round(ws.achievementPct)}%` : '—'}
                      </td>
                      <td style={tdStyle}>
                        {grade !== '—' ? (
                          <span style={{
                            background: gradeBg(grade), color: gradeColor(grade),
                            padding: '2px 10px', borderRadius: 4, fontWeight: 800, fontSize: 13,
                          }}>{grade}</span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <Link
                          to={`/scorecard/${exec.id}`}
                          style={{
                            background: '#1d4ed8', color: '#fff',
                            padding: '4px 10px', borderRadius: 5,
                            textDecoration: 'none', fontSize: 12, fontWeight: 600,
                          }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ZONE 5 — LEADERBOARD PREVIEW */}
        <div style={{ marginBottom: 20, background: '#1e293b', borderRadius: 10, border: '1px solid #334155', padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>🏆 Leaderboard — Top 5</h2>
          {top5.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No scores yet this week</div>
          ) : (
            <>
              {/* Podium top 3 */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
                {[top5[1], top5[0], top5[2]].map((entry, i) => {
                  if (!entry) return <div key={i} style={{ width: 120 }} />
                  const podiumRank = i === 0 ? 2 : i === 1 ? 1 : 3
                  const heights = [100, 130, 80]
                  const medals = ['🥈', '🥇', '🥉']
                  return (
                    <div key={entry.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', marginBottom: 4 }}>{entry.user.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{entry.user.team}</div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{medals[i]}</div>
                      <div style={{
                        background: i === 1 ? '#854d0e' : i === 0 ? '#374151' : '#7c2d12',
                        width: '100%', height: heights[i],
                        borderRadius: '6px 6px 0 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column',
                      }}>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: 18 }}>{podiumRank}</div>
                        <div style={{ fontSize: 12, color: '#e2e8f0' }}>{entry.finalScore}pts</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* 4-5 list */}
              {top5.slice(3).map((entry, i) => (
                <div key={entry.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', background: '#0f172a', borderRadius: 6, marginBottom: 8,
                }}>
                  <span style={{ fontWeight: 800, color: '#64748b', width: 20 }}>{i + 4}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: '#f1f5f9', fontSize: 13 }}>{entry.user.name}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{entry.user.team}</span>
                  <div style={{ width: 120, background: '#334155', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(entry.achievementPct, 100)}%`,
                      height: '100%', background: '#3b82f6', borderRadius: 4,
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8', width: 40, textAlign: 'right' }}>
                    {Math.round(entry.achievementPct)}%
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ZONE 6 — QUICK ACTIONS */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <QuickBtn icon={<UserPlus size={16} />} label="Add Member" onClick={() => navigate('/admin/users')} color="#3b82f6" />
            <QuickBtn icon={<Megaphone size={16} />} label="Broadcast" onClick={() => navigate('/admin/broadcast')} color="#8b5cf6" />
            <QuickBtn icon={<Calendar size={16} />} label="Attendance" onClick={() => navigate('/admin/attendance')} color="#06b6d4" />
            <QuickBtn icon={<FileText size={16} />} label="Reports" onClick={() => navigate('/admin/reports')} color="#10b981" />
            <QuickBtn icon={<AlertTriangle size={16} />} label="Warnings" onClick={() => navigate('/admin/warnings')} color="#f97316" />
          </div>
        </div>

        {/* ZONE 7 — RECENT ACTIVITY FEED */}
        <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>Recent Activity</h2>
          {recentActivities.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No recent activity</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentActivities.map((item, idx) => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: idx < recentActivities.length - 1 ? '1px solid #334155' : 'none',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#cbd5e1' }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>
                    {formatTime(item.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// Sub-components

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: string
  bg: string
  pct: number | null
}

function MetricCard({ icon, label, value, sub, accent, bg, pct }: MetricCardProps) {
  return (
    <div style={{
      background: bg,
      border: `1.5px solid ${accent}33`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</div>
      {pct !== null && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
            <span>completion</span>
            <span>{pct}%</span>
          </div>
          <div style={{ background: '#334155', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
    </div>
  )
}

interface WeekCardProps {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
}

function WeekCard({ icon, label, value, unit }: WeekCardProps) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: '#60a5fa' }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>
        {value}<span style={{ fontSize: 16, color: '#64748b', fontWeight: 400 }}>{unit}</span>
      </div>
    </div>
  )
}

interface QuickBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}

function QuickBtn({ icon, label, onClick, color }: QuickBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: `${color}22`, border: `1.5px solid ${color}55`,
        color, borderRadius: 8, padding: '10px 18px',
        cursor: 'pointer', fontWeight: 700, fontSize: 13,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = `${color}44`)}
      onMouseLeave={e => (e.currentTarget.style.background = `${color}22`)}
    >
      {icon}
      {label}
    </button>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  whiteSpace: 'nowrap',
}
