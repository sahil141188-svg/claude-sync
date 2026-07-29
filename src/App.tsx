import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Login = lazy(() => import('./pages/Login'))
const Layout = lazy(() => import('./pages/Layout'))
const MyDashboard = lazy(() => import('./pages/MyDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const WeeklyPlan = lazy(() => import('./pages/WeeklyPlan'))
const MorningLaunch = lazy(() => import('./pages/MorningLaunch'))
const EveningLanding = lazy(() => import('./pages/EveningLanding'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const ScoreCard = lazy(() => import('./pages/ScoreCard'))
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'))
const LeadTracker = lazy(() => import('./pages/LeadTracker'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Warnings = lazy(() => import('./pages/Warnings'))
const Reports = lazy(() => import('./pages/Reports'))
const Playbook = lazy(() => import('./pages/Playbook'))
const Profile = lazy(() => import('./pages/Profile'))

const LoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0f0f0f',
      color: '#f97316',
      fontSize: '1.5rem',
      fontWeight: 'bold',
    }}
  >
    🚀 Loading...
  </div>
)

const user = localStorage.getItem('user')

const ProtectedLayout = () => {
  if (!localStorage.getItem('user')) {
    return <Navigate to="/login" replace />
  }
  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<MyDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="weekly-plan" element={<WeeklyPlan />} />
            <Route path="morning" element={<MorningLaunch />} />
            <Route path="evening" element={<EveningLanding />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="scorecard" element={<ScoreCard />} />
            <Route path="scorecard/:userId" element={<ScoreCard />} />
            <Route path="manager" element={<ManagerDashboard />} />
            <Route path="leads" element={<LeadTracker />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="warnings" element={<Warnings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="playbook" element={<Playbook />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
