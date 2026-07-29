import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, WeeklyPlan, DailyMorning, DailyEvening, WeekScore, Lead, FollowUp, AttendanceRecord, AssignedTask, Warning, CoachingNote, KPITarget, Grade, TaskStatus, DayScore, Badge } from '../types'

// Helper functions

// All calendar dates in the app are LOCAL dates formatted as YYYY-MM-DD.
// Never use toISOString() for calendar dates — it shifts to UTC and lands on
// the previous day for timezones east of UTC (IST = UTC+5:30).
function fmtLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
  return new Date(y, m - 1, d)
}

function getWeekId(date?: Date): string {
  const d = date ? new Date(date) : new Date()
  d.setHours(0, 0, 0, 0)
  // ISO week: Thursday of current week
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - (d.getDay() + 6) % 7 + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 4)
  const week = 1 + Math.round(((thursday.getTime() - yearStart.getTime()) / 86400000 - 3 + (yearStart.getDay() + 6) % 7) / 7)
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getWeekBounds(weekId: string): { start: string; end: string } {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  // Find Monday of that ISO week
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7 // 0=Mon
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  return { start: fmtLocalDate(monday), end: fmtLocalDate(saturday) }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function computeGrade(score: number): Grade {
  if (score >= 0) return 'S'
  if (score >= -20) return 'A'
  if (score >= -50) return 'B'
  if (score >= -100) return 'C'
  if (score >= -150) return 'D'
  return 'F'
}

function today(): string {
  return fmtLocalDate(new Date())
}

// Demo users — stable IDs so persisted data survives reloads consistently
const DEMO_USERS: User[] = [
  { id: 'u-shiv',       name: 'Shiv Kumar',         team: 'OSR', role: 'sales_exec',  pin: '1234', joinDate: '2024-04-01', isActive: true, managerId: 'u-mgr-osr' },
  { id: 'u-sourabh',    name: 'Sourabh',            team: 'OSR', role: 'sales_exec',  pin: '1235', joinDate: '2024-06-15', isActive: true, managerId: 'u-mgr-osr' },
  { id: 'u-uzefa',      name: 'Uzefa',              team: 'CRR', role: 'sales_exec',  pin: '1236', joinDate: '2024-08-01', isActive: true, managerId: 'u-mgr-crr' },
  { id: 'u-charanpreet', name: 'Charanpreet',       team: 'CRR', role: 'sales_exec',  pin: '1237', joinDate: '2025-01-10', isActive: true, managerId: 'u-mgr-crr' },
  { id: 'u-sadhna',     name: 'Sadhna',             team: 'NBD', role: 'sales_exec',  pin: '1238', joinDate: '2025-02-01', isActive: true, managerId: 'u-mgr-nbd' },
  { id: 'u-alka',       name: 'Alka',               team: 'NBD', role: 'sales_exec',  pin: '1239', joinDate: '2025-03-20', isActive: true, managerId: 'u-mgr-nbd' },
  { id: 'u-chandresh',  name: 'Chandresh Tripathi', team: 'FSR', role: 'sales_exec',  pin: '1240', joinDate: '2024-11-05', isActive: true, managerId: 'u-mgr-fsr' },
  { id: 'u-gopal',      name: 'Gopal Krishan',      team: 'FSR', role: 'sales_exec',  pin: '1241', joinDate: '2025-05-01', isActive: true, managerId: 'u-mgr-fsr' },
  { id: 'u-mgr-osr',    name: 'Mgr OSR',            team: 'OSR', role: 'manager',     pin: '2001', joinDate: '2023-01-01', isActive: true },
  { id: 'u-mgr-crr',    name: 'Mgr CRR',            team: 'CRR', role: 'manager',     pin: '2002', joinDate: '2023-01-01', isActive: true },
  { id: 'u-mgr-nbd',    name: 'Mgr NBD',            team: 'NBD', role: 'manager',     pin: '2003', joinDate: '2023-01-01', isActive: true },
  { id: 'u-mgr-fsr',    name: 'Mgr FSR',            team: 'FSR', role: 'manager',     pin: '2004', joinDate: '2023-01-01', isActive: true },
  { id: 'u-admin',      name: 'Admin',              team: 'OSR', role: 'admin',       pin: '9999', joinDate: '2022-01-01', isActive: true },
  { id: 'u-ceo',        name: 'CEO',                team: 'OSR', role: 'super_admin', pin: '0000', joinDate: '2020-01-01', isActive: true },
]

export const DEFAULT_KPI_TARGETS: Record<string, KPITarget> = {
  OSR: { calls: 500, meetings: 20, conversion: 15, clients: 10, avgSale: 5000, crrSales: 50000 },
  CRR: { calls: 300, meetings: 15, ordersConversion: 30, nonSellingOrders: 10, activateNonSelling: 5, crrSales: 40000 },
  NBD: { calls: 400, qualifiedLeads: 25, meetings: 12, conversion: 10, clients: 5 },
  FSR: { visits: 20, conversion: 20, clients: 15, avgSale: 6000 },
}

export const KPI_LABELS: Record<string, string> = {
  calls: 'Calls',
  meetings: 'Face Meetings',
  conversion: 'Conversion %',
  clients: 'Clients',
  avgSale: 'Avg Sale (₹)',
  crrSales: 'CRR Sales (₹)',
  qualifiedLeads: 'Qualified Leads',
  visits: 'Visits/Meetings',
  ordersConversion: 'Orders Conv %',
  nonSellingOrders: 'Non-Selling Orders',
  activateNonSelling: 'Activate Non-Selling',
}

// Store interface
interface ERPState {
  currentUser: User | null
  users: User[]
  weeklyPlans: WeeklyPlan[]
  morningPlans: DailyMorning[]
  eveningActuals: DailyEvening[]
  weekScores: WeekScore[]
  leads: Lead[]
  followUps: FollowUp[]
  attendance: AttendanceRecord[]
  assignedTasks: AssignedTask[]
  warnings: Warning[]
  badges: Record<string, Badge[]>
  coachingNotes: CoachingNote[]

  // Actions
  login(pin: string): User | null
  logout(): void
  getTodayMorning(userId: string): DailyMorning | null
  getTodayEvening(userId: string): DailyEvening | null
  getWeeklyPlan(userId: string, weekId?: string): WeeklyPlan | null
  getWeekScore(userId: string, weekId?: string): WeekScore | null
  submitMorningPlan(plan: Omit<DailyMorning, 'id'>): void
  submitEveningActual(actual: Omit<DailyEvening, 'id'>): void
  submitWeeklyPlan(plan: Omit<WeeklyPlan, 'id'>): void
  markAttendance(userId: string, date: string, status: AttendanceRecord['status'], markedBy: string): void
  addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score'>): void
  updateLead(id: string, updates: Partial<Lead>): void
  addFollowUp(fu: Omit<FollowUp, 'id' | 'createdAt'>): void
  updateFollowUp(id: string, updates: Partial<FollowUp>): void
  assignTask(task: Omit<AssignedTask, 'id' | 'createdAt' | 'updatedAt'>): void
  updateTaskStatus(taskId: string, status: TaskStatus, note?: string): void
  addWarning(warning: Omit<Warning, 'id' | 'createdAt'>): void
  updateWarning(id: string, updates: Partial<Warning>): void
  addCoachingNote(note: Omit<CoachingNote, 'id' | 'createdAt'>): void
  changePin(userId: string, newPin: string): { ok: boolean; error?: string }
  computeWeekScore(userId: string, weekId?: string): WeekScore
  getAllWeekScores(weekId?: string): WeekScore[]
  getLeaderboard(weekId?: string): (WeekScore & { user: User })[]
  getPendingItems(userId: string): { tasks: number; followUps: number; staleLeads: number }
  getDangerZone(): User[]
  getTeamMembers(managerId: string): User[]
  getWeekId(): string
  getWeekBounds(weekId: string): { start: string; end: string }
}

export const useERPStore = create<ERPState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: DEMO_USERS,
      weeklyPlans: [],
      morningPlans: [],
      eveningActuals: [],
      weekScores: [],
      leads: [],
      followUps: [],
      attendance: [],
      assignedTasks: [],
      warnings: [],
      badges: {},
      coachingNotes: [],

      login(pin: string): User | null {
        const user = get().users.find(u => u.pin === pin && u.isActive !== false) ?? null
        set({ currentUser: user })
        return user
      },

      logout(): void {
        set({ currentUser: null })
      },

      getTodayMorning(userId: string): DailyMorning | null {
        const t = today()
        return get().morningPlans.find(p => p.userId === userId && p.date === t) ?? null
      },

      getTodayEvening(userId: string): DailyEvening | null {
        const t = today()
        return get().eveningActuals.find(e => e.userId === userId && e.date === t) ?? null
      },

      getWeeklyPlan(userId: string, weekId?: string): WeeklyPlan | null {
        const wid = weekId ?? getWeekId()
        return get().weeklyPlans.find(p => p.userId === userId && p.weekId === wid) ?? null
      },

      getWeekScore(userId: string, weekId?: string): WeekScore | null {
        const wid = weekId ?? getWeekId()
        return get().weekScores.find(s => s.userId === userId && s.weekId === wid) ?? null
      },

      submitMorningPlan(plan: Omit<DailyMorning, 'id'>): void {
        const existing = get().morningPlans.find(p => p.userId === plan.userId && p.date === plan.date)
        if (existing) {
          set(state => ({
            morningPlans: state.morningPlans.map(p =>
              p.id === existing.id ? { ...p, ...plan } : p
            ),
          }))
        } else {
          set(state => ({
            morningPlans: [...state.morningPlans, { ...plan, id: uid() }],
          }))
        }
        get().computeWeekScore(plan.userId, getWeekId(parseLocalDate(plan.date)))
      },

      submitEveningActual(actual: Omit<DailyEvening, 'id'>): void {
        const existing = get().eveningActuals.find(e => e.userId === actual.userId && e.date === actual.date)
        if (existing) {
          set(state => ({
            eveningActuals: state.eveningActuals.map(e =>
              e.id === existing.id ? { ...e, ...actual } : e
            ),
          }))
        } else {
          set(state => ({
            eveningActuals: [...state.eveningActuals, { ...actual, id: uid() }],
          }))
        }
        get().computeWeekScore(actual.userId, getWeekId(parseLocalDate(actual.date)))
      },

      submitWeeklyPlan(plan: Omit<WeeklyPlan, 'id'>): void {
        const existing = get().weeklyPlans.find(p => p.userId === plan.userId && p.weekId === plan.weekId)
        if (existing) {
          set(state => ({
            weeklyPlans: state.weeklyPlans.map(p =>
              p.id === existing.id ? { ...p, ...plan } : p
            ),
          }))
        } else {
          set(state => ({
            weeklyPlans: [...state.weeklyPlans, { ...plan, id: uid() }],
          }))
        }
        get().computeWeekScore(plan.userId, plan.weekId)
      },

      markAttendance(userId: string, date: string, status: AttendanceRecord['status'], markedBy: string): void {
        const markedAt = new Date().toISOString()
        const existing = get().attendance.find(a => a.userId === userId && a.date === date)
        if (existing) {
          set(state => ({
            attendance: state.attendance.map(a =>
              a.id === existing.id ? { ...a, status, markedBy, markedAt } : a
            ),
          }))
        } else {
          set(state => ({
            attendance: [...state.attendance, { id: uid(), userId, date, status, markedBy, markedAt }],
          }))
        }
        get().computeWeekScore(userId, getWeekId(parseLocalDate(date)))
      },

      addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score'>): void {
        const now = new Date().toISOString()
        set(state => ({
          leads: [...state.leads, { ...lead, id: uid(), createdAt: now, updatedAt: now, score: 0 }],
        }))
      },

      updateLead(id: string, updates: Partial<Lead>): void {
        set(state => ({
          leads: state.leads.map(l =>
            l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
          ),
        }))
      },

      addFollowUp(fu: Omit<FollowUp, 'id' | 'createdAt'>): void {
        const now = new Date().toISOString()
        set(state => ({
          followUps: [...state.followUps, { ...fu, id: uid(), createdAt: now }],
        }))
      },

      updateFollowUp(id: string, updates: Partial<FollowUp>): void {
        set(state => ({
          followUps: state.followUps.map(f =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }))
      },

      assignTask(task: Omit<AssignedTask, 'id' | 'createdAt' | 'updatedAt'>): void {
        const now = new Date().toISOString()
        set(state => ({
          assignedTasks: [...state.assignedTasks, { ...task, id: uid(), createdAt: now, updatedAt: now }],
        }))
      },

      updateTaskStatus(taskId: string, status: TaskStatus, note?: string): void {
        set(state => ({
          assignedTasks: state.assignedTasks.map(t =>
            t.id === taskId
              ? { ...t, status, ...(note !== undefined ? { managerNote: note } : {}), updatedAt: new Date().toISOString() }
              : t
          ),
        }))
      },

      addWarning(warning: Omit<Warning, 'id' | 'createdAt'>): void {
        set(state => ({
          warnings: [...state.warnings, { ...warning, id: uid(), createdAt: new Date().toISOString() }],
        }))
      },

      updateWarning(id: string, updates: Partial<Warning>): void {
        set(state => ({
          warnings: state.warnings.map(w =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }))
      },

      addCoachingNote(note: Omit<CoachingNote, 'id' | 'createdAt'>): void {
        const now = new Date().toISOString()
        set(state => ({
          coachingNotes: [...state.coachingNotes, { ...note, id: uid(), createdAt: now }],
        }))
      },

      changePin(userId: string, newPin: string): { ok: boolean; error?: string } {
        if (!/^\d{4}$/.test(newPin)) return { ok: false, error: 'PIN must be exactly 4 digits' }
        const taken = get().users.some(u => u.id !== userId && u.pin === newPin)
        if (taken) return { ok: false, error: 'This PIN is already in use' }
        set(state => ({
          users: state.users.map(u => (u.id === userId ? { ...u, pin: newPin } : u)),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, pin: newPin } : state.currentUser,
        }))
        return { ok: true }
      },

      computeWeekScore(userId: string, weekId?: string): WeekScore {
        const wid = weekId ?? getWeekId()
        const { start, end } = getWeekBounds(wid)
        const state = get()

        // Build date range Mon–Sat, but only score days that have arrived
        const t = today()
        const dates: string[] = []
        const cursor = parseLocalDate(start)
        const endDate = parseLocalDate(end)
        while (cursor <= endDate) {
          dates.push(fmtLocalDate(cursor))
          cursor.setDate(cursor.getDate() + 1)
        }

        const weeklyPlan = state.weeklyPlans.find(p => p.userId === userId && p.weekId === wid)

        let totalDeduction = 0
        let totalBonus = 0
        const dailyScores: Record<string, DayScore> = {}
        const weeklyKpiActual: Record<string, number> = {}

        for (const date of dates) {
          const morning = state.morningPlans.find(p => p.userId === userId && p.date === date)
          const evening = state.eveningActuals.find(e => e.userId === userId && e.date === date)
          const att = state.attendance.find(a => a.userId === userId && a.date === date)

          // Accumulate weekly actuals regardless of scoring
          if (evening) {
            for (const [k, v] of Object.entries(evening.kpiActual)) {
              if (typeof v === 'number') weeklyKpiActual[k] = (weeklyKpiActual[k] ?? 0) + v
            }
          }

          if (date > t) {
            // Future day — nothing to score yet
            dailyScores[date] = { date, morningDone: false, eveningDone: false, kpiDeductions: 0, taskPenalties: 0, attendancePoints: 0, bonusPoints: 0, total: 0 }
            continue
          }

          let kpiDeductions = 0
          let taskPenalties = 0
          let attendancePoints = 0
          let bonusPoints = 0

          if (!morning) {
            kpiDeductions -= 10
          } else if (!evening) {
            kpiDeductions -= 5
          } else {
            // Compare committed KPIs vs actuals
            const committed = morning.kpiCommitment as Record<string, number | undefined>
            const actuals = evening.kpiActual as Record<string, number | undefined>

            for (const key of Object.keys(committed)) {
              const committedVal = committed[key] ?? 0
              if (committedVal <= 0) continue
              const actualVal = actuals[key] ?? 0
              const pct = (actualVal / committedVal) * 100
              if (pct >= 110) {
                bonusPoints += 5
              } else if (pct >= 100) {
                // no deduction
              } else if (pct >= 90) {
                kpiDeductions -= 5
              } else if (pct >= 70) {
                kpiDeductions -= 10
              } else if (pct >= 50) {
                kpiDeductions -= 15
              } else {
                kpiDeductions -= 20
              }
            }

            // Task follow-through penalties from the evening report
            for (const ts of evening.taskStatus) {
              if (ts.status === 'partial') taskPenalties -= 5
              else if (ts.status === 'not_done') taskPenalties -= 10
            }
          }

          // Attendance
          if (att?.status === 'absent') {
            attendancePoints -= 10
          } else if (att?.status === 'late') {
            attendancePoints -= 3
          }

          const dayTotal = kpiDeductions + taskPenalties + attendancePoints + bonusPoints
          totalDeduction += kpiDeductions + taskPenalties + attendancePoints
          totalBonus += bonusPoints
          dailyScores[date] = {
            date,
            morningDone: !!morning,
            eveningDone: !!evening,
            kpiDeductions,
            taskPenalties,
            attendancePoints,
            bonusPoints,
            total: dayTotal,
          }
        }

        const finalScore = totalDeduction + totalBonus

        // Achievement pct: weekly plan targets vs summed evening actuals
        let achievementPct = 0
        const weeklyKpiTarget: KPITarget = weeklyPlan?.kpiTargets ?? {}
        const targetEntries = Object.entries(weeklyKpiTarget).filter(([, v]) => typeof v === 'number' && v > 0) as [string, number][]
        if (targetEntries.length > 0) {
          const pcts = targetEntries.map(([k, v]) => Math.min(((weeklyKpiActual[k] ?? 0) / v) * 100, 100))
          achievementPct = pcts.reduce((a, b) => a + b, 0) / pcts.length
        }

        const weekScore: WeekScore = {
          userId,
          weekId: wid,
          dailyScores,
          weeklyKpiActual: weeklyKpiActual as KPITarget,
          weeklyKpiTarget,
          achievementPct,
          totalDeduction,
          bonusPoints: totalBonus,
          finalScore,
          grade: computeGrade(finalScore),
          rank: 0,
        }

        // Upsert, then recompute ranks for the whole week
        set(state => {
          const others = state.weekScores.filter(s => !(s.userId === userId && s.weekId === wid))
          const forWeek = [...others.filter(s => s.weekId === wid), weekScore]
            .sort((a, b) => b.finalScore - a.finalScore)
          const ranked = new Map(forWeek.map((s, i) => [s.userId, i + 1]))
          return {
            weekScores: [...others, weekScore].map(s =>
              s.weekId === wid ? { ...s, rank: ranked.get(s.userId) ?? 0 } : s
            ),
          }
        })

        return get().weekScores.find(s => s.userId === userId && s.weekId === wid) ?? weekScore
      },

      getAllWeekScores(weekId?: string): WeekScore[] {
        const wid = weekId ?? getWeekId()
        return get().weekScores.filter(s => s.weekId === wid)
      },

      getLeaderboard(weekId?: string): (WeekScore & { user: User })[] {
        const wid = weekId ?? getWeekId()
        const scores = get().weekScores.filter(s => s.weekId === wid)
        const users = get().users
        return scores
          .map(s => {
            const user = users.find(u => u.id === s.userId)
            if (!user) return null
            return { ...s, user }
          })
          .filter((s): s is WeekScore & { user: User } => s !== null)
          .sort((a, b) => b.finalScore - a.finalScore)
      },

      getPendingItems(userId: string): { tasks: number; followUps: number; staleLeads: number } {
        const state = get()
        const t = today()
        const tasks = state.assignedTasks.filter(
          task => task.assignedTo === userId && task.status !== 'approved' && task.status !== 'rejected'
        ).length

        const followUpsCount = state.followUps.filter(
          fu => fu.userId === userId && (fu.status === 'pending' || fu.status === 'rescheduled') && fu.dueDate <= t
        ).length

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const staleLeads = state.leads.filter(lead => {
          if (lead.userId !== userId) return false
          if (lead.stage === 'won' || lead.stage === 'lost') return false
          return new Date(lead.updatedAt) < sevenDaysAgo
        }).length

        return { tasks, followUps: followUpsCount, staleLeads }
      },

      getDangerZone(): User[] {
        const state = get()
        const d = new Date()
        const days: string[] = []
        // Last 2 working days (skip Sundays)
        const prev = new Date(d)
        while (days.length < 2) {
          prev.setDate(prev.getDate() - 1)
          if (prev.getDay() !== 0) days.push(fmtLocalDate(prev))
        }
        return state.users.filter(user => {
          if (user.role !== 'sales_exec' || user.isActive === false) return false
          const hasAny = days.some(date =>
            state.morningPlans.some(p => p.userId === user.id && p.date === date)
          )
          return !hasAny
        })
      },

      getTeamMembers(managerId: string): User[] {
        const state = get()
        const manager = state.users.find(u => u.id === managerId)
        if (!manager) return []
        return state.users.filter(u => u.team === manager.team && u.role === 'sales_exec' && u.isActive !== false)
      },

      getWeekId(): string {
        return getWeekId()
      },

      getWeekBounds(weekId: string): { start: string; end: string } {
        return getWeekBounds(weekId)
      },
    }),
    {
      name: 'rocket-launch-erp-v2',
    }
  )
)

export default useERPStore
