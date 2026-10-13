import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Zap, BarChart3, AlertTriangle, Settings, LogOut, Activity, Radio, Wrench
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Overview' },
  { to: '/dashboard/faults',       icon: AlertTriangle,   label: 'Faults & Alerts' },
  { to: '/dashboard/analytics',    icon: BarChart3,       label: 'Analytics' },
  { to: '/dashboard/sensors',      icon: Radio,           label: 'Sensors' },
  { to: '/dashboard/maintenance',  icon: Wrench,          label: 'Maintenance' },
  { to: '/dashboard/settings',     icon: Settings,        label: 'Settings', adminOnly: true },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-navy-800 border-r border-white/10 py-6 px-3">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-10">
        <div className="w-9 h-9 rounded-lg bg-electric-500/20 border border-electric-500/40 flex items-center justify-center">
          <Zap className="w-5 h-5 text-electric-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm tracking-widest">TESLA PULSE</p>
          <p className="text-gray-500 text-[10px] tracking-wider uppercase">Pole Monitor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {nav.map(({ to, icon: Icon, label, adminOnly }) => {
          if (adminOnly && user?.role !== 'admin') return null;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  isActive
                    ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-electric-400" />
            <div>
              <p className="text-xs text-white font-medium truncate">{user?.displayName}</p>
              <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
