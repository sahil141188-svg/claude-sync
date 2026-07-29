import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import {
  Lock,
  LogOut,
  Moon,
  Sun,
  Bell,
  BellOff,
  Globe,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import useERPStore from '../store/erpStore'

interface BadgeDef {
  id: string
  emoji: string
  name: string
  description: string
  earned: boolean
  earnedDate?: string
}

const SAMPLE_BADGES: BadgeDef[] = [
  {
    id: 'streak5',
    emoji: '🔥',
    name: '5-Day Streak',
    description: 'Submitted morning plans 5 days in a row',
    earned: true,
    earnedDate: '2026-06-15',
  },
  {
    id: 'target',
    emoji: '🎯',
    name: 'Target Hitter',
    description: 'Hit weekly KPI targets 3 weeks in a row',
    earned: true,
    earnedDate: '2026-06-22',
  },
  {
    id: 'early',
    emoji: '⏰',
    name: 'Early Bird',
    description: 'Submitted morning plan before 9 AM for 5 days',
    earned: true,
    earnedDate: '2026-06-10',
  },
  {
    id: 'champ',
    emoji: '🏆',
    name: 'Week Champ',
    description: 'Topped the leaderboard for a full week',
    earned: false,
  },
  {
    id: 'streak30',
    emoji: '💎',
    name: '30-Day Legend',
    description: 'Maintained a 30-day streak',
    earned: false,
  },
  {
    id: 'perfect',
    emoji: '✨',
    name: 'Perfect Week',
    description: 'Score of S grade for an entire week',
    earned: false,
  },
]

const STREAK_DAYS = [
  true, true, true, false, true, true, true,
  false, true, true, false, true, true, true,
]

const PERF_DATA = [
  { week: 'W19', score: -60, grade: 'C' },
  { week: 'W20', score: -40, grade: 'B' },
  { week: 'W21', score: -25, grade: 'B' },
  { week: 'W22', score: -5, grade: 'A' },
  { week: 'W23', score: 0, grade: 'S' },
  { week: 'W24', score: -15, grade: 'A' },
  { week: 'W25', score: -10, grade: 'A' },
  { week: 'W26', score: -30, grade: 'B' },
]

export default function Profile() {
  const navigate = useNavigate()
  const { currentUser, logout, users } = useERPStore()

  const [showPinChange, setShowPinChange] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [notifMorning, setNotifMorning] = useState(true)
  const [notifEvening, setNotifEvening] = useState(true)
  const [notifLeads, setNotifLeads] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const joinDate = new Date(currentUser.joinDate)
  const today = new Date()
  const daysInTeam = Math.floor(
    (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    sales_exec: 'Sales Exec',
  }

  function handleSavePin() {
    setPinError('')
    setPinSuccess(false)

    if (currentUser!.pin !== oldPin) {
      setPinError('Old PIN is incorrect')
      return
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and Confirm PIN do not match')
      return
    }

    const result = useERPStore.getState().changePin(currentUser!.id, newPin)
    if (!result.ok) {
      setPinError(result.error ?? 'Could not change PIN')
      return
    }

    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinSuccess(true)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* MY INFO */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest">
            My Info
          </h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {currentUser.name}
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {roleLabel[currentUser.role] ?? currentUser.role}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  Team {currentUser.team}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {joinDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Join Date</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <p className="text-lg font-bold text-orange-500">{daysInTeam}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Days in Team</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <p className="text-xs font-mono font-bold text-gray-900 dark:text-white break-all">
                {currentUser.id}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Member ID</p>
            </div>
          </div>
        </div>

        {/* PIN CHANGE */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Security PIN</h2>
            </div>
            <button
              onClick={() => { setShowPinChange((p) => !p); setPinError(''); setPinSuccess(false) }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 transition"
            >
              <Lock size={14} />
              Change PIN
              {showPinChange ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showPinChange && (
            <div className="mt-4 space-y-3">
              {(['Old PIN', 'New PIN (4 digits)', 'Confirm PIN'] as const).map((label, idx) => {
                const vals = [oldPin, newPin, confirmPin]
                const setters = [setOldPin, setNewPin, setConfirmPin]
                return (
                  <div key={label}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={vals[idx]}
                      onChange={(e) => setters[idx](e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="••••"
                    />
                  </div>
                )
              })}
              {pinError && (
                <p className="text-xs text-red-500 font-medium">{pinError}</p>
              )}
              {pinSuccess && (
                <p className="text-xs text-green-600 font-medium">PIN updated successfully!</p>
              )}
              <button
                onClick={handleSavePin}
                className="w-full py-2 rounded-lg bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition"
              >
                Save PIN
              </button>
            </div>
          )}
        </div>

        {/* BADGES */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest">
            Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SAMPLE_BADGES.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl p-3 flex flex-col items-center text-center gap-1 border ${
                  badge.earned
                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700'
                    : 'bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600 opacity-60'
                }`}
              >
                {badge.earned ? (
                  <span className="text-3xl">{badge.emoji}</span>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <Lock size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <p className={`text-xs font-bold ${badge.earned ? 'text-orange-700 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {badge.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{badge.description}</p>
                {badge.earned && badge.earnedDate && (
                  <p className="text-xs text-orange-500 font-medium mt-0.5">
                    {new Date(badge.earnedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                )}
                {!badge.earned && (
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Locked</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STREAK TRACKER */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-widest">
            Streak Tracker
          </h2>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🔥</span>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              Current Streak: <span className="text-orange-500">5 days</span> of morning plans
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Best streak: 12 days</p>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Last 14 days</p>
            <div className="flex gap-1.5 flex-wrap">
              {STREAK_DAYS.map((submitted, i) => (
                <div
                  key={i}
                  title={submitted ? 'Plan submitted' : 'Missed'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    submitted ? 'bg-green-500' : 'bg-red-400'
                  }`}
                >
                  {14 - i}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Plan submitted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Missed</span>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE HISTORY */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-4 tracking-widest">
            Performance History (Last 8 Weeks)
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {PERF_DATA.map((d) => (
              <span
                key={d.week}
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  d.grade === 'S'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : d.grade === 'A'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : d.grade === 'B'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {d.week}: {d.grade}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={PERF_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(val: number) => [`${val}`, 'Score']}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SETTINGS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
            Settings
          </h2>

          {/* Dark mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-yellow-500" />}
              <span className="text-sm font-medium text-gray-800 dark:text-white">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-white">Language</span>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-semibold transition ${
                  language === 'en'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 text-xs font-semibold transition ${
                  language === 'hi'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                हिन्दी
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Notifications
            </p>
            {[
              { label: 'Morning Plan Reminder', value: notifMorning, setter: setNotifMorning },
              { label: 'Evening Report Reminder', value: notifEvening, setter: setNotifEvening },
              { label: 'Lead Follow-up Alerts', value: notifLeads, setter: setNotifLeads },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {value ? (
                    <Bell size={16} className="text-orange-400" />
                  ) : (
                    <BellOff size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
                <button
                  onClick={() => setter((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    value ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95 transition shadow"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  )
}
