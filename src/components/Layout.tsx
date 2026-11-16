import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Avatar } from './Avatar';
import { Tour } from './Tour';
import { get } from '../lib/api';
import type { Profile } from '../lib/types';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/train', label: 'Üben', icon: '✏️' },
  { to: '/lists', label: 'Meine Listen', icon: '📋' },
  { to: '/words', label: 'Fehlerwörter', icon: '🎯' },
  { to: '/history', label: 'Verlauf', icon: '🕘' },
  { to: '/rewards', label: 'Belohnungen', icon: '🏆' },
  { to: '/premium', label: 'Premium', icon: '⭐' },
  { to: '/profile', label: 'Profil', icon: '👤' },
];

export function Layout() {
  const { me, logout, dark, toggleDark, switchProfile } = useApp();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  if (!me) return null;

  const onLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 max-lg:hidden">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.svg" alt="via" className="h-10 w-10 rounded-2xl shadow-md" />
          <div>
            <p className="text-base font-extrabold tracking-tight">SmartWrite</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">by via industries</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  n.to === '/premium' && !me.isPremium
                    ? isActive
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 dark:from-amber-500/10 dark:to-orange-500/10 dark:text-amber-300'
                    : isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <span className="flex items-center gap-3"><span>{n.icon}</span> {n.label}</span>
              {n.to === '/premium' && !me.isPremium && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">PRO</span>}
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
          <div className="mt-2 space-y-0.5 text-center">
            <NavLink to="/datenschutz" className="block rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Datenschutz
            </NavLink>
            <NavLink to="/impressum" className="block rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              Impressum
            </NavLink>
            <NavLink to="/agb" className="block rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              AGB
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <span className="flex items-center gap-2 text-base font-extrabold"><img src="/logo.svg" alt="via" className="h-7 w-7 rounded-lg" />SmartWrite</span>
        <div className="flex items-center gap-2">
          <ProfileSwitcher compact />
          <button
            onClick={() => { localStorage.removeItem('sw_tour_v1'); window.dispatchEvent(new Event('sw-restart-tour')); }}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Hilfe / Tour"
          >❓</button>
          <ThemeToggle dark={dark} toggle={toggleDark} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-20 sm:px-8 lg:ml-60 lg:pb-10 lg:pt-8">
        <div className="page-enter mx-auto max-w-5xl">
          <div className="mb-4 flex items-center justify-end gap-2 max-lg:hidden">
            <ThemeToggle dark={dark} toggle={toggleDark} />
            <button
              onClick={() => { localStorage.removeItem('sw_tour_v1'); window.dispatchEvent(new Event('sw-restart-tour')); }}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Einführungstour starten"
            >❓ Hilfe</button>
            <button onClick={onLogout} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Abmelden
            </button>
          </div>
          <Outlet />
        </div>
      </main>
      <Tour />

      {/* Mobile Bottom-Nav: 4 Hauptbereiche + Mehr-Menü */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {NAV.slice(0, 4).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMoreOpen(false)}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <span className="text-lg leading-none">{n.icon}</span>{n.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition ${moreOpen ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <span className="text-lg leading-none">☰</span>Mehr
        </button>
      </nav>

      {/* Mobile „Mehr" Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 animate-fade-up rounded-t-3xl border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="grid grid-cols-3 gap-2">
              {[...NAV.slice(4), ...(me.isAdmin ? [{ to: '/admin', label: 'Admin', icon: '🛡️', end: false }] : [])].map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => `flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-xs font-semibold transition ${isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
                  <span className="text-2xl">{n.icon}</span>{n.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
              <NavLink to="/datenschutz" onClick={() => setMoreOpen(false)} className="hover:text-slate-600 dark:hover:text-slate-300">Datenschutz</NavLink>
              <NavLink to="/impressum" onClick={() => setMoreOpen(false)} className="hover:text-slate-600 dark:hover:text-slate-300">Impressum</NavLink>
              <NavLink to="/agb" onClick={() => setMoreOpen(false)} className="hover:text-slate-600 dark:hover:text-slate-300">AGB</NavLink>
            </div>
          </div>
        </div>
      )}
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
