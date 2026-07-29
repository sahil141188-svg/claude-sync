import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronDown, CheckSquare, Calendar, Clock, X } from 'lucide-react'
import { useERPStore } from '../store/erpStore'
import type { Lead, FollowUp, LeadStage } from '../types'

type StageFilter = 'all' | LeadStage

const STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-gray-200 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  interested: 'bg-cyan-100 text-cyan-800',
  demo: 'bg-purple-100 text-purple-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  demo: 'Demo',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const ALL_STAGES: LeadStage[] = ['new', 'contacted', 'interested', 'demo', 'proposal', 'negotiation', 'won', 'lost']

const SOURCES = ['Cold Call', 'Referral', 'Website', 'Social Media', 'Email Campaign', 'Walk-in', 'Partner', 'Other']

function formatINR(val: number): string {
  return '₹' + val.toLocaleString('en-IN')
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function followUpColor(dateStr: string): string {
  const today = todayStr()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  if (dateStr < today) return 'text-red-600 font-semibold'
  if (dateStr === today) return 'text-orange-500 font-semibold'
  if (dateStr <= tomorrowStr) return 'text-green-600'
  return 'text-gray-600'
}

function isStale(lead: Lead): boolean {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  return new Date(lead.updatedAt) < threeDaysAgo && lead.stage !== 'won' && lead.stage !== 'lost'
}

function urgencyLabel(dateStr: string): { icon: string; label: string; order: number } {
  const today = todayStr()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  if (dateStr < today) return { icon: '🔴', label: 'Overdue', order: 0 }
  if (dateStr === today) return { icon: '🟡', label: 'Today', order: 1 }
  return { icon: '🟢', label: 'Tomorrow+', order: 2 }
}

interface AddLeadModalProps {
  onClose: () => void
  userId: string
}

function AddLeadModal({ onClose, userId }: AddLeadModalProps) {
  const addLead = useERPStore(s => s.addLead)
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    source: 'Cold Call',
    product: '',
    expectedValue: '',
    stage: 'new' as LeadStage,
    nextFollowUp: todayStr(),
    notes: '',
  })

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSave() {
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim()) return
    addLead({
      userId,
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      source: form.source,
      product: form.product.trim() || undefined,
      expectedValue: parseFloat(form.expectedValue) || 0,
      stage: form.stage,
      nextFollowUp: form.nextFollowUp,
      notes: form.notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contact name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
                value={form.company}
                onChange={e => set('company', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source}
                onChange={e => set('source', e.target.value)}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Product / service"
                value={form.product}
                onChange={e => set('product', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Value (₹)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                value={form.expectedValue}
                onChange={e => set('expectedValue', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.stage}
                onChange={e => set('stage', e.target.value as LeadStage)}
              >
                {ALL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Follow-up Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.nextFollowUp}
                onChange={e => set('nextFollowUp', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional notes..."
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Save Lead
          </button>
        </div>
      </div>
    </div>
  )
}

interface FollowUpFormProps {
  lead: Lead
  userId: string
  onClose: () => void
}

function FollowUpForm({ lead, userId, onClose }: FollowUpFormProps) {
  const addFollowUp = useERPStore(s => s.addFollowUp)
  const [subject, setSubject] = useState('')
  const [dueDate, setDueDate] = useState(todayStr())

  function handleSave() {
    if (!subject.trim()) return
    addFollowUp({
      userId,
      leadId: lead.id,
      subject: subject.trim(),
      contactName: lead.name,
      dueDate,
      status: 'pending',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Add Follow-up for {lead.name}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Follow-up subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-colors"
          >
            Add Follow-up
          </button>
        </div>
      </div>
    </div>
  )
}

interface RescheduleModalProps {
  followUp: FollowUp
  onClose: () => void
}

function RescheduleModal({ followUp, onClose }: RescheduleModalProps) {
  const updateFollowUp = useERPStore(s => s.updateFollowUp)
  const [newDate, setNewDate] = useState(todayStr())

  function handleReschedule() {
    updateFollowUp(followUp.id, { dueDate: newDate, status: 'rescheduled' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Reschedule Follow-up</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{followUp.subject}</p>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">New Date</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
          />
        </div>
        <button
          onClick={handleReschedule}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-xl transition-colors"
        >
          Reschedule
        </button>
      </div>
    </div>
  )
}

interface LeadCardProps {
  lead: Lead
  userId: string
  onFollowUp: (lead: Lead) => void
}

function LeadCard({ lead, userId, onFollowUp }: LeadCardProps) {
  const updateLead = useERPStore(s => s.updateLead)
  const [stageOpen, setStageOpen] = useState(false)
  const stale = isStale(lead)

  function handleStageChange(stage: LeadStage) {
    updateLead(lead.id, { stage })
    setStageOpen(false)
  }

  return (
    <div
      className={[
        'bg-white rounded-xl p-4 shadow-sm border transition-all',
        stale ? 'border-orange-400 animate-pulse' : 'border-gray-100',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{lead.name}</p>
          <p className="text-sm text-gray-500 truncate">{lead.company}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${STAGE_COLORS[lead.stage]}`}>
          {STAGE_LABELS[lead.stage]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-gray-500">Expected Value</div>
        <div className="font-medium text-gray-800">{formatINR(lead.expectedValue)}</div>

        <div className="text-gray-500">Next Follow-up</div>
        <div className={followUpColor(lead.nextFollowUp)}>{lead.nextFollowUp}</div>

        <div className="text-gray-500">Score</div>
        <div className="font-medium text-gray-800">{lead.score} pts</div>

        {lead.source && (
          <>
            <div className="text-gray-500">Source</div>
            <div className="text-gray-700">{lead.source}</div>
          </>
        )}
      </div>

      {lead.notes && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{lead.notes}</p>
      )}

      <div className="mt-3 flex gap-2 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setStageOpen(o => !o)}
            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            Update Stage <ChevronDown className="w-3 h-3" />
          </button>
          {stageOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg z-20 min-w-[150px] py-1">
              {ALL_STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${lead.stage === s ? 'font-bold' : ''}`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded-full ${STAGE_COLORS[s]}`}>
                    {STAGE_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onFollowUp(lead)}
          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Follow-up
        </button>
      </div>
    </div>
  )
}

interface LeadRowProps {
  lead: Lead
  userId: string
  onFollowUp: (lead: Lead) => void
}

function LeadRow({ lead, userId, onFollowUp }: LeadRowProps) {
  const updateLead = useERPStore(s => s.updateLead)
  const [stageOpen, setStageOpen] = useState(false)
  const stale = isStale(lead)

  function handleStageChange(stage: LeadStage) {
    updateLead(lead.id, { stage })
    setStageOpen(false)
  }

  return (
    <tr className={stale ? 'bg-orange-50 animate-pulse' : 'hover:bg-gray-50'}>
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
        <p className="text-xs text-gray-500">{lead.company}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_COLORS[lead.stage]}`}>
          {STAGE_LABELS[lead.stage]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatINR(lead.expectedValue)}</td>
      <td className={`px-4 py-3 text-sm ${followUpColor(lead.nextFollowUp)}`}>{lead.nextFollowUp}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{lead.score} pts</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setStageOpen(o => !o)}
              className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Stage <ChevronDown className="w-3 h-3" />
            </button>
            {stageOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border rounded-xl shadow-lg z-20 min-w-[150px] py-1">
                {ALL_STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${lead.stage === s ? 'font-bold' : ''}`}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-full ${STAGE_COLORS[s]}`}>
                      {STAGE_LABELS[s]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onFollowUp(lead)}
            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3 h-3" /> Follow-up
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function LeadTracker() {
  const navigate = useNavigate()
  const currentUser = useERPStore(s => s.currentUser)
  const leads = useERPStore(s => s.leads)
  const followUps = useERPStore(s => s.followUps)
  const updateFollowUp = useERPStore(s => s.updateFollowUp)

  const [showAddModal, setShowAddModal] = useState(false)
  const [filterStage, setFilterStage] = useState<StageFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFollowUpForm, setShowFollowUpForm] = useState<Lead | null>(null)
  const [followUpsExpanded, setFollowUpsExpanded] = useState(true)
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null)

  const userId = currentUser?.id ?? ''

  const myLeads = useMemo(() =>
    leads.filter(l => l.userId === userId),
    [leads, userId]
  )

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: myLeads.length }
    ALL_STAGES.forEach(s => {
      counts[s] = myLeads.filter(l => l.stage === s).length
    })
    return counts
  }, [myLeads])

  const filteredLeads = useMemo(() => {
    let result = myLeads
    if (filterStage !== 'all') {
      result = result.filter(l => l.stage === filterStage)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)
      )
    }
    return result
  }, [myLeads, filterStage, searchQuery])

  const pendingFollowUps = useMemo(() =>
    followUps
      .filter(f => f.userId === userId && f.status === 'pending')
      .sort((a, b) => {
        const oa = urgencyLabel(a.dueDate).order
        const ob = urgencyLabel(b.dueDate).order
        if (oa !== ob) return oa - ob
        return a.dueDate.localeCompare(b.dueDate)
      }),
    [followUps, userId]
  )

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view leads.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">🎯 LEAD TRACKER</h1>
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
              {myLeads.length}
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Pipeline Funnel Chips */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-1">
            <button
              onClick={() => setFilterStage('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap ${
                filterStage === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              All
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStage === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
                {stageCounts.all}
              </span>
            </button>
            {ALL_STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setFilterStage(stage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap ${
                  filterStage === stage
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {STAGE_LABELS[stage]}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterStage === stage ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {stageCounts[stage]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Leads — cards on mobile, table on desktop */}
        {filteredLeads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} userId={userId} onFollowUp={setShowFollowUpForm} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Follow-up</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLeads.map(lead => (
                      <LeadRow key={lead.id} lead={lead} userId={userId} onFollowUp={setShowFollowUpForm} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Follow-up Engine */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setFollowUpsExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">📌 PENDING FOLLOW-UPS</span>
              {pendingFollowUps.length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingFollowUps.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${followUpsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {followUpsExpanded && (
            <div className="border-t">
              {pendingFollowUps.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No pending follow-ups</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingFollowUps.map(fu => {
                    const urg = urgencyLabel(fu.dueDate)
                    return (
                      <div key={fu.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-lg shrink-0">{urg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{fu.contactName}</p>
                          <p className="text-xs text-gray-500 truncate">{fu.subject}</p>
                          <p className={`text-xs mt-0.5 ${followUpColor(fu.dueDate)}`}>
                            {urg.label} — {fu.dueDate}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => updateFollowUp(fu.id, { status: 'done' })}
                            className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                            title="Mark done"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Done
                          </button>
                          <button
                            onClick={() => setRescheduleTarget(fu)}
                            className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                            title="Reschedule"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Reschedule
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddLeadModal userId={userId} onClose={() => setShowAddModal(false)} />
      )}
      {showFollowUpForm && (
        <FollowUpForm
          lead={showFollowUpForm}
          userId={userId}
          onClose={() => setShowFollowUpForm(null)}
        />
      )}
      {rescheduleTarget && (
        <RescheduleModal
          followUp={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  )
}
