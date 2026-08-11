export type TeamRole = 'OSR' | 'CRR' | 'NBD' | 'FSR'
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'sales_exec'
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'wfh' | 'meeting'
export type LeadStage = 'new' | 'contacted' | 'interested' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type LeadHealth = 'cold' | 'warm' | 'hot'
export type WarningLevel = 'yellow' | 'orange' | 'red'
export type TaskStatus = 'assigned' | 'accepted' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface User {
  id: string
  name: string
  team: TeamRole
  role: UserRole
  pin: string
  joinDate: string
  isActive: boolean
  managerId?: string
}

export interface KPITarget {
  calls?: number
  meetings?: number
  conversion?: number
  clients?: number
  avgSale?: number
  crrSales?: number
  qualifiedLeads?: number
  visits?: number
  ordersConversion?: number
  nonSellingOrders?: number
  activateNonSelling?: number
}

export interface Task {
  text: string
  priority: TaskPriority
  carryForward?: boolean
}

export interface TaskStatusRecord {
  taskIndex: number
  status: 'done' | 'partial' | 'not_done'
  reason?: string
}

export interface Lead {
  id: string
  userId: string
  name: string
  company: string
  phone: string
  email?: string
  source: string
  product?: string
  expectedValue: number
  stage: LeadStage
  nextFollowUp: string
  notes?: string
  health?: LeadHealth
  assignedSC?: string
  createdAt: string
  updatedAt: string
  score: number
}

export interface FollowUp {
  id: string
  userId: string
  leadId?: string
  subject: string
  contactName: string
  dueDate: string
  status: 'pending' | 'done' | 'rescheduled' | 'cancelled'
  createdAt: string
}

export interface WeeklyPlan {
  id: string
  userId: string
  weekId: string
  weekStart: string
  weekEnd: string
  kpiTargets: KPITarget
  focusCategory: string
  bigWin: string
  extraLearning: string
  carryForward: string[]
  submittedAt?: string
  lockedAt?: string
}

export interface DailyMorning {
  id: string
  userId: string
  date: string
  tasks: Task[]
  kpiCommitment: KPITarget
  nayaKaam: string
  businessAdd: string
  submittedAt: string
  submittedOnTime: boolean
}

export interface DailyEvening {
  id: string
  userId: string
  date: string
  kpiActual: KPITarget
  kpiGap: KPITarget
  taskStatus: TaskStatusRecord[]
  newLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score'>[]
  winOfDay: string
  kalKaPriority: string
  submittedAt: string
  submittedOnTime: boolean
  todayScore: number
}

export interface DayScore {
  date: string
  morningDone: boolean
  eveningDone: boolean
  kpiDeductions: number
  taskPenalties: number
  attendancePoints: number
  bonusPoints: number
  total: number
}

export interface WeekScore {
  userId: string
  weekId: string
  dailyScores: Record<string, DayScore>
  weeklyKpiActual: KPITarget
  weeklyKpiTarget: KPITarget
  achievementPct: number
  totalDeduction: number
  bonusPoints: number
  finalScore: number
  grade: Grade
  rank: number
}

export interface AttendanceRecord {
  id: string
  userId: string
  date: string
  status: AttendanceStatus
  markedBy: string
  markedAt: string
}

export interface AssignedTask {
  id: string
  assignedTo: string
  assignedBy: string
  title: string
  description: string
  dueDate: string
  priority: TaskPriority
  expectedOutcome: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  managerNote?: string
}

export interface Warning {
  id: string
  userId: string
  weekId: string
  level: WarningLevel
  triggeredBy: 'system' | 'admin'
  managerNote?: string
  actionPlan?: string
  resolvedAt?: string
  createdAt: string
}

export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  earnedAt: string
}

export interface CoachingNote {
  id: string
  memberId: string
  managerId: string
  note: string
  createdAt: string
}
