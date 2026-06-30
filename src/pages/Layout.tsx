import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart2,
  Trophy,
  Target,
  BookOpen,
  Users,
  CheckSquare,
  Shield,
  AlertTriangle,
  FileText,
  Calendar,
  Bell,
  LogOut,
} from 'lucide-react';
import { useERPStore } from '../store/erpStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  minRole?: string;
}

const ROLE_RANK: Record<string, number> = {
  sales_exec: 0,
  manager: 1,
  admin: 2,
  super_admin: 3,
};

function hasRole(userRole: string, minRole: string): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useERPStore((s) => s.currentUser);
  const logout = useERPStore((s) => s.logout);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const navItems: NavItem[] = [
    { label: 'Home', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'My Stats', path: '/scorecard', icon: <BarChart2 size={20} /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
    { label: 'Leads', path: '/leads', icon: <Target size={20} /> },
    { label: 'Playbook', path: '/playbook', icon: <BookOpen size={20} /> },
    { label: 'Team', path: '/manager', icon: <Users size={20} />, minRole: 'manager' },
    { label: 'Tasks', path: '/attendance', icon: <CheckSquare size={20} />, minRole: 'manager' },
    { label: 'Admin', path: '/dashboard', icon: <Shield size={20} />, minRole: 'admin' },
    { label: 'Warnings', path: '/warnings', icon: <AlertTriangle size={20} />, minRole: 'admin' },
    { label: 'Reports', path: '/reports', icon: <FileText size={20} />, minRole: 'admin' },
    { label: 'Attendance', path: '/attendance', icon: <Calendar size={20} />, minRole: 'admin' },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.minRole || hasRole(currentUser.role, item.minRole)
  );

  function isActive(path: string): boolean {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarWidth = sidebarHovered ? 'w-56' : 'w-16';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full ${sidebarWidth} bg-gray-900 border-r border-gray-800 flex-col z-50 transition-all duration-200 overflow-hidden`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-gray-800 shrink-0">
          <span className="text-2xl">🚀</span>
          {sidebarHovered && (
            <span className="ml-2 font-bold text-orange-400 tracking-widest text-sm whitespace-nowrap">
              ROCKET
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <Link
              key={item.label + item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-1 transition-colors whitespace-nowrap ${
                isActive(item.path)
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {sidebarHovered && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom: avatar + logout */}
        <div className="border-t border-gray-800 p-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {getInitials(currentUser.name)}
            </div>
            {sidebarHovered && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors`}
          >
            <LogOut size={16} className="shrink-0" />
            {sidebarHovered && <span className="text-xs">Logout</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-50">
        <span className="font-bold text-orange-400 tracking-widest text-sm">🚀 ROCKET</span>
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-white">
            <Bell size={20} />
          </button>
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
            {getInitials(currentUser.name)}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="md:ml-16 pt-12 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-50">
        {[
          { emoji: '🏠', label: 'Home', path: '/' },
          { emoji: '📊', label: 'Score', path: '/scorecard' },
          { emoji: '🏆', label: 'Board', path: '/leaderboard' },
          { emoji: '🎯', label: 'Leads', path: '/leads' },
          { emoji: '👤', label: 'Profile', path: '/profile' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'text-orange-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-lg leading-none">{item.emoji}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
