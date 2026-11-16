import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Avatar } from './Avatar';
import { get } from '../lib/api';
import type { Profile } from '../lib/types';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/train', label: 'Üben', icon: '✏️' },
  { to: '/lists', label: 'Meine Listen', icon: '📋' },
  { to: '/words', label: 'Fehlerwörter', icon: '🎯' },
  { to: '/history', label: 'Verlauf', icon: '🕘' },
  { to: '/rewards', label: 'Belohnungen', icon: '🏆' },
  { to: '/profile', label: 'Profil', icon: '👤' },
];

export function Layout() {
  const { me, logout, dark, toggleDark, switchProfile } = useApp();
  const navigate = useNavigate();
  if (!me) return null;

  const onLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-lg:hidden">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white">S</div>
          <div>
            <p className="text-base font-extrabold tracking-tight">SmartWrite</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Schreibtraining</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <span className="text-base">{n.icon}</span> {n.label}
            </NavLink>
          ))}
          {me.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <span className="text-base">🛡️</span> Admin
            </NavLink>
          )}
        </nav>

        {/* Profil-Umschalter */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <ProfileSwitcher />
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <span className="text-base font-extrabold">SmartWrite</span>
        <div className="flex items-center gap-2">
          <ProfileSwitcher compact />
          <ThemeToggle dark={dark} toggle={toggleDark} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-20 sm:px-8 lg:ml-60 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-end gap-2 max-lg:hidden">
            <ThemeToggle dark={dark} toggle={toggleDark} />
            <button onClick={onLogout} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Abmelden
            </button>
          </div>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom-Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {NAV.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <span className="text-lg">{n.icon}</span>{n.label}
          </NavLink>
        ))}
        <NavLink to="/profile"
          className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
          <span className="text-lg">👤</span>Profil
        </NavLink>
      </nav>
    </div>
  );
}

function ProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const { me, switchProfile } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    get<{ profiles: Profile[] }>('/profiles').then((d) => setProfiles(d.profiles)).catch(() => {});
  }, [me?.profile.id]);
  if (!me || profiles.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-1">
        <Avatar name={me?.profile.name || '?'} avatar={me?.profile.avatar} color={me?.profile.color} size="sm" />
        {!compact && <div className="min-w-0"><p className="truncate text-sm font-semibold">{me?.profile.name}</p><p className="text-xs text-slate-500">Level {me?.level.level}</p></div>}
      </div>
    );
  }
  return (
    <select
      value={me.profile.id}
      onChange={(e) => void switchProfile(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800"
      title="Profil wechseln"
    >
      {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Farbschema wechseln">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
