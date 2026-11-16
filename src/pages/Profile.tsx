import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../context';
import { del, get, patch, post } from '../lib/api';
import type { Profile } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { VoicePicker } from '../components/VoicePicker';
import { Badge, Button, Card, ErrorBox, Input, Modal, Select, Spinner } from '../components/ui';

const AVATAR_OPTIONS = ['star', 'rocket', 'bot', 'wand', 'cat', 'dog', 'panda', 'alien'];
const AVATAR_ICONS: Record<string, string> = { star: '⭐', rocket: '🚀', bot: '🤖', wand: '🪄', cat: '🐱', dog: '🐶', panda: '🐼', alien: '👽' };
const COLOR_OPTIONS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet'];

export function ProfilePage() {
  const { me, meta, logout, switchProfile, refresh } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('star');
  const [color, setColor] = useState('indigo');
  const [goal, setGoal] = useState(100);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (me) {
      setName(me.profile.name);
      setAvatar(me.profile.avatar);
      setColor(me.profile.color);
      setGoal(me.profile.daily_goal_xp);
    }
    get<{ profiles: Profile[] }>('/profiles').then((d) => setProfiles(d.profiles)).catch(() => {});
  }, [me?.profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      await patch(`/profiles/${me.profile.id}`, { name, avatar, color, dailyGoalXp: goal });
      setMsg('Profil gespeichert.');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Fehler'); }
    finally { setBusy(false); }
  };

  const addProfile = async () => {
    if (!newName.trim()) return;
    await post('/profiles', { name: newName.trim() });
    setShowAdd(false); setNewName('');
    get<{ profiles: Profile[] }>('/profiles').then((d) => setProfiles(d.profiles));
  };

  const removeProfile = async (p: Profile) => {
    if (!confirm(`Profil „${p.name}“ und alle Daten löschen?`)) return;
    await del(`/profiles/${p.id}`);
    get<{ profiles: Profile[] }>('/profiles').then((d) => setProfiles(d.profiles));
    await refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Profil & Einstellungen</h1>

      {/* Profil bearbeiten */}
      <Card className="p-6">
        <form onSubmit={save} className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || '?'} avatar={avatar} color={color} size="xl" />
            <div>
              <p className="text-lg font-bold">{me.profile.name}</p>
              <p className="text-sm text-slate-500">{me.user.email} · Level {me.level.level}</p>
              <Badge tone={me.isAdmin ? 'amber' : 'slate'}>{me.isAdmin ? 'Admin' : 'Standard'}</Badge>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Anzeigename</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((a) => (
                <button type="button" key={a} onClick={() => setAvatar(a)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition ${avatar === a ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                  {AVATAR_ICONS[a]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Farbe</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button type="button" key={c} onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-xl bg-gradient-to-br ${colorClass(c)} transition ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''}`} />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Tägliches Lernziel: {goal} XP</label>
            <input type="range" min={10} max={500} step={10} value={goal} onChange={(e) => setGoal(parseInt(e.target.value))} className="w-full accent-indigo-600" />
          </div>

          {error && <ErrorBox message={error} />}
          {msg && <p className="text-sm font-medium text-emerald-600">{msg}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Speichern…' : 'Speichern'}</Button>
        </form>
      </Card>

      {/* Unteraccounts */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold">Profile / Unteraccounts</h2>
            <p className="text-sm text-slate-500">Jedes Profil hat einen eigenen Lernfortschritt – ideal für mehrere Kinder.</p>
          </div>
          <Button variant="secondary" onClick={() => setShowAdd(true)}>＋ Hinzufügen</Button>
        </div>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} avatar={p.avatar} color={p.color} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{p.name} {p.id === me.profile.id && <Badge tone="indigo">aktiv</Badge>}</p>
                  <p className="text-xs text-slate-500">Level {levelOf(p.xp)} · {p.xp} XP · 🔥 {p.streak}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {p.id !== me.profile.id && (
                  <>
                    <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void switchProfile(p.id).then(refresh)}>Wechseln</Button>
                    <Button variant="ghost" className="px-2 py-1.5 text-xs text-red-500" onClick={() => void removeProfile(p)}>🗑</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Audio & Stimme */}
      <Card className="p-6">
        <h2 className="mb-1 font-bold">Audio & Stimme</h2>
        <p className="mb-4 text-sm text-slate-500">Wähle eine deutsche Stimme und das Tempo für die Übungen.</p>
        <VoicePicker />
      </Card>

      {/* Konto */}
      <Card className="p-6">
        <h2 className="mb-3 font-bold">Konto</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Angemeldet als <strong>{me.user.email}</strong></p>
          <Button variant="danger" onClick={() => void logout()}>Abmelden</Button>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Neues Profil">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Name (z. B. Kind 1)</label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Abbrechen</Button>
            <Button className="flex-1" disabled={!newName.trim()} onClick={() => void addProfile()}>Erstellen</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function colorClass(c: string): string {
  return {
    indigo: 'from-indigo-500 to-violet-500', emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500', amber: 'from-amber-500 to-orange-500',
    sky: 'from-sky-500 to-cyan-500', violet: 'from-violet-500 to-purple-500',
  }[c] || 'from-indigo-500 to-violet-500';
}

function levelOf(xp: number): number {
  let level = 1;
  while (100 * (level + 1) * level <= xp) level++;
  return level;
}
