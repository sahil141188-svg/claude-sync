import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, WeeklyPlan, DailyMorning, DailyEvening, WeekScore, Lead, FollowUp, AttendanceRecord, AssignedTask, Warning, CoachingNote, KPITarget, Grade, TaskStatus, DayScore } from '../types'

// Helper functions

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
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(monday), end: fmt(saturday) }
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
  return new Date().toISOString().split('T')[0]
}

// Badge type (not in types import but referenced in state)
interface Badge {
  id: string
  label: string
  awardedAt: string
}

// Demo users
const DEMO_USERS: User[] = [
  { id: uid(), name: 'Shiv Kumar',          team: 'OSR', role: 'sales_exec',  pin: '1234' },
  { id: uid(), name: 'Sourabh',             team: 'OSR', role: 'sales_exec',  pin: '1235' },
  { id: uid(), name: 'Uzefa',               team: 'CRR', role: 'sales_exec',  pin: '1236' },
  { id: uid(), name: 'Charanpreet',         team: 'CRR', role: 'sales_exec',  pin: '1237' },
  { id: uid(), name: 'Sadhna',              team: 'NBD', role: 'sales_exec',  pin: '1238' },
  { id: uid(), name: 'Alka',                team: 'NBD', role: 'sales_exec',  pin: '1239' },
  { id: uid(), name: 'Chandresh Tripathi',  team: 'FSR', role: 'sales_exec',  pin: '1240' },
  { id: uid(), name: 'Gopal Krishan',       team: 'FSR', role: 'sales_exec',  pin: '1241' },
  { id: uid(), name: 'Mgr OSR',             team: 'OSR', role: 'manager',     pin: '2001' },
  { id: uid(), name: 'Mgr CRR',             team: 'CRR', role: 'manager',     pin: '2002' },
  { id: uid(), name: 'Mgr NBD',             team: 'NBD', role: 'manager',     pin: '2003' },
  { id: uid(), name: 'Mgr FSR',             team: 'FSR', role: 'manager',     pin: '2004' },
  { id: uid(), name: 'Admin',               team: 'OSR', role: 'admin',       pin: '9999' },
  { id: uid(), name: 'CEO',                 team: 'OSR', role: 'super_admin', pin: '0000' },
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
  addCoachingNote(note: Omit<CoachingNote, 'id' | 'createdAt'>): void
  computeWeekScore(userId: string, weekId?: string): WeekScore
  getAllWeekScores(weekId?: string): WeekScore[]
  getLeaderboard(weekId?: string): (WeekScore & { user: User })[]
  getPendingItems(userId: string): { tasks: number; followUps: number; staleLeads: number }
  getDangerZone(): User[]
  getTeamMembers(managerId: string): User[]
  getWeekId(): string
  getWeekBounds(weekId: string): { start: string; end: string }
}

const useERPStore = create<ERPState>()(
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
        const user = get().users.find(u => u.pin === pin) ?? null
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
        // Recompute week score
        const weekId = getWeekId(new Date(actual.date))
        get().computeWeekScore(actual.userId, weekId)
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
      },

      markAttendance(userId: string, date: string, status: AttendanceRecord['status'], markedBy: string): void {
        const existing = get().attendance.find(a => a.userId === userId && a.date === date)
        if (existing) {
          set(state => ({
            attendance: state.attendance.map(a =>
              a.id === existing.id ? { ...a, status, markedBy } : a
            ),
          }))
        } else {
          set(state => ({
            attendance: [...state.attendance, { id: uid(), userId, date, status, markedBy }],
          }))
        }
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
              ? { ...t, status, ...(note !== undefined ? { note } : {}), updatedAt: new Date().toISOString() }
              : t
          ),
        }))
      },

      addCoachingNote(note: Omit<CoachingNote, 'id' | 'createdAt'>): void {
        const now = new Date().toISOString()
        set(state => ({
          coachingNotes: [...state.coachingNotes, { ...note, id: uid(), createdAt: now }],
        }))
      },

      computeWeekScore(userId: string, weekId?: string): WeekScore {
        const wid = weekId ?? getWeekId()
        const { start, end } = getWeekBounds(wid)
        const state = get()
        const user = state.users.find(u => u.id === userId)
        const team = user?.team ?? 'OSR'
        const targets = DEFAULT_KPI_TARGETS[team] ?? {}

        // Build date range Mon-Sat
        const dates: string[] = []
        const cursor = new Date(start)
        const endDate = new Date(end)
        while (cursor <= endDate) {
          dates.push(cursor.toISOString().split('T')[0])
          cursor.setDate(cursor.getDate() + 1)
        }

        let totalScore = 0
        const dayScores: DayScore[] = []

        for (const date of dates) {
          let dayPoints = 0
          const issues: string[] = []

          const morning = state.morningPlans.find(p => p.userId === userId && p.date === date)
          const evening = state.eveningActuals.find(e => e.userId === userId && e.date === date)
          const att = state.attendance.find(a => a.userId === userId && a.date === date)

          if (!morning) {
            dayPoints -= 10
            issues.push('No morning plan')
          } else if (!evening) {
            dayPoints -= 5
            issues.push('Morning plan but no evening actual')
          } else {
            // Compare committed KPIs vs actuals
            const committed: Record<string, number> = (morning as any).kpis ?? {}
            const actuals: Record<string, number> = (evening as any).kpis ?? {}

            for (const key of Object.keys(targets)) {
              const target = (targets as Record<string, number>)[key]
              if (!target) continue
              const committedVal = committed[key] ?? 0
              const actualVal = actuals[key] ?? 0
              if (committedVal === 0) continue
              const pct = (actualVal / committedVal) * 100
              if (pct >= 110) {
                dayPoints += 5
              } else if (pct >= 100) {
                // no deduction
              } else if (pct >= 90) {
                dayPoints -= 5
                issues.push(`${KPI_LABELS[key] ?? key}: ${Math.round(pct)}% achieved`)
              } else if (pct >= 70) {
                dayPoints -= 10
                issues.push(`${KPI_LABELS[key] ?? key}: ${Math.round(pct)}% achieved`)
              } else if (pct >= 50) {
                dayPoints -= 15
                issues.push(`${KPI_LABELS[key] ?? key}: ${Math.round(pct)}% achieved`)
              } else {
                dayPoints -= 20
                issues.push(`${KPI_LABELS[key] ?? key}: ${Math.round(pct)}% achieved`)
              }
            }
          }

          // Attendance
          if (att?.status === 'absent') {
            dayPoints -= 10
            issues.push('Absent')
          } else if (att?.status === 'late') {
            dayPoints -= 3
            issues.push('Late')
          }

          totalScore += dayPoints
          dayScores.push({ date, score: dayPoints, issues })
        }

        // Compute achievement pct from weekly plan vs evening actuals
        const weeklyPlan = state.weeklyPlans.find(p => p.userId === userId && p.weekId === wid)
        let achievementPct = 0
        if (weeklyPlan) {
          const planKpis: Record<string, number> = (weeklyPlan as any).kpis ?? {}
          const actualKpis: Record<string, number> = {}
          for (const date of dates) {
            const ev = state.eveningActuals.find(e => e.userId === userId && e.date === date)
            if (!ev) continue
            const kpis: Record<string, number> = (ev as any).kpis ?? {}
            for (const k of Object.keys(kpis)) {
              actualKpis[k] = (actualKpis[k] ?? 0) + kpis[k]
            }
          }
          const keys = Object.keys(planKpis).filter(k => planKpis[k] > 0)
          if (keys.length > 0) {
            const pcts = keys.map(k => Math.min(((actualKpis[k] ?? 0) / planKpis[k]) * 100, 100))
            achievementPct = pcts.reduce((a, b) => a + b, 0) / pcts.length
          }
        }

        const grade = computeGrade(totalScore)
        const weekScore: WeekScore = {
          id: uid(),
          userId,
          weekId: wid,
          finalScore: totalScore,
          grade,
          achievementPct,
          dayScores,
        }

        // Upsert into store
        set(state => {
          const existing = state.weekScores.find(s => s.userId === userId && s.weekId === wid)
          if (existing) {
            return {
              weekScores: state.weekScores.map(s =>
                s.userId === userId && s.weekId === wid ? { ...weekScore, id: existing.id } : s
              ),
            }
          }
          return { weekScores: [...state.weekScores, weekScore] }
        })

        return weekScore
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
          task => task.assignedTo === userId && task.status !== 'completed' && task.status !== 'cancelled'
        ).length

        const followUpsCount = state.followUps.filter(
          fu => fu.userId === userId && !fu.done && fu.dueDate <= t
        ).length

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const staleLeads = state.leads.filter(lead => {
          if (lead.userId !== userId) return false
          if (lead.status === 'closed_won' || lead.status === 'closed_lost') return false
          return new Date(lead.updatedAt) < sevenDaysAgo
        }).length

        return { tasks, followUps: followUpsCount, staleLeads }
      },

      getDangerZone(): User[] {
        const state = get()
        const d = new Date()
        const days: string[] = []
        for (let i = 1; i <= 2; i++) {
          const prev = new Date(d)
          prev.setDate(d.getDate() - i)
          days.push(prev.toISOString().split('T')[0])
        }
        return state.users.filter(user => {
          if (user.role !== 'sales_exec') return false
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
        return state.users.filter(u => u.team === manager.team && u.role === 'sales_exec')
      },

      getWeekId(): string {
        return getWeekId()
      },

      getWeekBounds(weekId: string): { start: string; end: string } {
        return getWeekBounds(weekId)
      },
    }),
    {
      name: 'rocket-launch-erp-v1',
    }
  )
)

export default useERPStore

export { useERPStore }
