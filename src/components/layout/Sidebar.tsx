import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  CheckSquare,
  Shield,
  CalendarDays,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { useState } from 'react';
import { useLeaveStore } from '../../store/useLeaveStore';
import { useThemeContext } from '../../hooks/ThemeContext';
import type { User } from '../../types';

const ROLE_COLOR: Record<string, string> = {
  Employee: 'bg-blue-500',
  Manager: 'bg-purple-500',
  'HR Admin': 'bg-emerald-500',
};

export function Sidebar() {
  const { currentUser, users, setCurrentUser } = useLeaveStore();
  const { isDark, toggle } = useThemeContext();
  const [showUserPicker, setShowUserPicker] = useState(false);

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Employee', 'Manager', 'HR Admin'],
    },
    {
      to: '/new-request',
      label: 'New Request',
      icon: PlusCircle,
      roles: ['Employee', 'Manager'],
    },
    {
      to: '/approvals',
      label: 'Approval Queue',
      icon: CheckSquare,
      roles: ['Manager'],
    },
    {
      to: '/admin',
      label: 'Admin View',
      icon: Shield,
      roles: ['HR Admin'],
    },
  ].filter((item) => item.roles.includes(currentUser.role));

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Leave Request</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">App</p>
            </div>
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/30'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Switcher (demo only) */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-800">
        <p className="text-xs text-gray-300 dark:text-slate-600 uppercase tracking-wider px-2 mb-2">Demo: Switch User</p>
        <div className="relative">
          <button
            onClick={() => setShowUserPicker(!showUserPicker)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${ROLE_COLOR[currentUser.role]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {currentUser.avatar}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{currentUser.role}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0 transition-transform ${showUserPicker ? 'rotate-180' : ''}`} />
          </button>

          {showUserPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
              {users.map((user: User) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setCurrentUser(user);
                    setShowUserPicker(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left ${
                    currentUser.id === user.id ? 'bg-gray-50 dark:bg-slate-700' : ''
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full ${ROLE_COLOR[user.role]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {user.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-slate-200 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
