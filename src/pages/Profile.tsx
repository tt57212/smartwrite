import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { del, get, patch, post } from '../lib/api';
import type { Profile } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { VoicePicker } from '../components/VoicePicker';
import { Badge, Button, Card, ErrorBox, Input, Modal, Select, Spinner, Textarea } from '../components/ui';

const AVATAR_OPTIONS = ['star', 'rocket', 'bot', 'wand', 'cat', 'dog', 'panda', 'alien'];
const AVATAR_ICONS: Record<string, string> = { star: '⭐', rocket: '🚀', bot: '🤖', wand: '🪄', cat: '🐱', dog: '🐶', panda: '🐼', alien: '👽' };
const COLOR_OPTIONS = ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet', 'gold', 'ocean', 'royal'];
const PREMIUM_COLOR_SET = new Set(['gold', 'ocean', 'royal']);

export function ProfilePage() {
  const { me, meta, logout, switchProfile, refresh } = useApp();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('star');
  const [color, setColor] = useState('indigo');
  const [goal, setGoal] = useState(100);
  const [weeklyGoal, setWeeklyGoal] = useState(500);
  const [wordGoal, setWordGoal] = useState(20);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiMsg, setAiMsg] = useState('');
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
      setWeeklyGoal(me.profile.weekly_goal_xp ?? 500);
      setWordGoal(me.profile.daily_goal_words ?? 20);
      setAiInstructions(typeof me.user.settings?.ai_instructions === 'string' ? me.user.settings.ai_instructions : '');
    }
    get<{ profiles: Profile[] }>('/profiles').then((d) => setProfiles(d.profiles)).catch(() => {});
  }, [me?.profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      await patch(`/profiles/${me.profile.id}`, { name, avatar, color, dailyGoalXp: goal, weeklyGoalXp: weeklyGoal, dailyGoalWords: wordGoal });
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
            <label className="mb-1.5 block text-sm font-medium">Farbe {PREMIUM_COLOR_SET.has(color) && '⭐ Premium-Farbe'}</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => {
                const locked = PREMIUM_COLOR_SET.has(c) && !me.isPremium;
                return (
                  <button type="button" key={c}
                    onClick={() => { if (locked) { navigate('/premium'); return; } setColor(c); }}
                    title={locked ? 'Premium-Farbe – hier upgraden' : c}
                    className={`relative h-9 w-9 rounded-xl bg-gradient-to-br ${colorClass(c)} transition ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''} ${locked ? 'opacity-50 saturate-50' : ''}`}>
                    {locked && <span className="absolute -right-1 -top-1 text-[10px]">🔒</span>}
                  </button>
                );
              })}
            </div>
            {!me.isPremium && <p className="mt-1.5 text-xs text-slate-400">Gold, Ocean & Royal sind Premium-Farben.</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Tägliches Lernziel: {goal} XP</label>
            <input type="range" min={10} max={500} step={10} value={goal} onChange={(e) => setGoal(parseInt(e.target.value))} className="w-full accent-indigo-600" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Wöchentliches Lernziel: {weeklyGoal} XP</label>
            <input type="range" min={50} max={5000} step={50} value={weeklyGoal} onChange={(e) => setWeeklyGoal(parseInt(e.target.value))} className="w-full accent-indigo-600" />
            <p className="mt-1 text-xs text-slate-500">Der Fortschritt dazu siehst du auf dem Dashboard.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Wörter pro Tag: {wordGoal}</label>
            <input type="range" min={0} max={200} step={5} value={wordGoal} onChange={(e) => setWordGoal(parseInt(e.target.value))} className="w-full accent-emerald-600" />
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">👁 Vorschau deines Ziels</p>
              {wordGoal === 0 ? (
                <p className="mt-1 text-slate-600 dark:text-slate-300">Kein Wortziel – du übst frei ohne Tagesvorgabe.</p>
              ) : (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Mit <strong>{wordGoal} Wörtern/Tag</strong> ≈ <strong>{Math.max(1, Math.round(wordGoal / 10))} kurze Runde{wordGoal > 10 ? 'n' : ''}</strong> oder <strong>{Math.max(1, Math.round(wordGoal * 10 / 60))} Min.</strong> Üben.
                  <br />Beispiel: <em>„{sampleWords(wordGoal)}"</em> – so viele Wörter wie in einem Wörterbuch-Eintrag pro Tag.
                </p>
              )}
            </div>
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
        <p className="mb-4 text-sm text-slate-500">Wähle eine deutsche Stimme und passe Tempo, Stimmlage und Lautstärke an.</p>
        <VoicePicker />
      </Card>

      {/* KI-Anweisungen */}
      <Card className="p-6">
        <h2 className="mb-1 font-bold">🤖 KI-Anweisungen</h2>
        <p className="mb-4 text-sm text-slate-500">
          Gib der KI eigene Anweisungen – z. B. Themen, Altersgruppe oder besondere Regeln. Wird bei „KI-Übungen generieren" und der Fehleranalyse berücksichtigt.
        </p>
        <Textarea
          value={aiInstructions}
          onChange={(e) => setAiInstructions(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="z. B.: Generiere Übungen nur zu Tieren und zaubere. Verwende einfache Sätze für 8-Jährige."
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">{aiInstructions.length}/1000 Zeichen</span>
          <Button
            variant="secondary"
            className="px-4 py-2 text-sm"
            onClick={async () => {
              setAiMsg('');
              try {
                await patch('/me', { settings: { ai_instructions: aiInstructions.trim() } });
                setAiMsg('Gespeichert.');
                await refresh();
              } catch (e) { setAiMsg(e instanceof Error ? e.message : 'Fehler'); }
            }}
          >Speichern</Button>
        </div>
        {aiMsg && <p className="mt-2 text-sm font-medium text-emerald-600">{aiMsg}</p>}
      </Card>

      {/* Premium-Status */}
      <Card className={`p-6 ${me.isPremium ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-teal-500/10' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{me.isPremium ? '👑' : '⭐'}</span>
            <div>
              <p className="font-bold">{me.isPremium ? 'Premium aktiv' : 'SmartWrite Premium'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {me.isPremium
                  ? `Unbegrenzte Runden${me.premiumUntil ? ` · bis ${new Date(me.premiumUntil).toLocaleDateString('de-DE')}` : ''}`
                  : '10 Runden/Tag gratis · Unlimited für 4,99 €/Monat'}
              </p>
            </div>
          </div>
          <Link to="/premium"><Button variant={me.isPremium ? 'secondary' : 'primary'}>{me.isPremium ? 'Details' : 'Jetzt upgraden'}</Button></Link>
        </div>
      </Card>

      {/* Konto */}
      <Card className="p-6">
        <h2 className="mb-3 font-bold">Konto</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Angemeldet als <strong>{me.user.email}</strong></p>
          <Button variant="danger" onClick={() => void logout()}>Abmelden</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            variant="secondary"
            className="px-4 py-2 text-sm"
            onClick={() => { localStorage.removeItem('sw_tour_v1'); window.dispatchEvent(new Event('sw-restart-tour')); }}
          >🧭 Einführungstour wiederholen</Button>
          <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
          <Link to="/datenschutz" className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">Datenschutz</Link>
          <Link to="/impressum" className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">Impressum</Link>
          <Link to="/agb" className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">AGB</Link>
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

function sampleWords(n: number): string {
  const pool = ['Haus', 'Baum', 'Auto', 'Buch', 'Hund', 'Katze', 'Schule', 'Garten', 'Wasser', 'Brot', 'Tisch', 'Stuhl', 'Blume', 'Vogel', 'Mond', 'Stern', 'Regen', 'Wind', 'Straße', 'Brücke'];
  const out: string[] = [];
  for (let i = 0; i < Math.min(n, 10); i++) out.push(pool[i % pool.length]);
  return out.join(', ') + (n > 10 ? ` … (+${n - 10} weitere)` : '');
}

function colorClass(c: string): string {
  return {
    indigo: 'from-indigo-500 to-violet-500', emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500', amber: 'from-amber-500 to-orange-500',
    sky: 'from-sky-500 to-cyan-500', violet: 'from-violet-500 to-purple-500',
    gold: 'from-yellow-400 to-amber-600', ocean: 'from-cyan-500 to-blue-700', royal: 'from-fuchsia-500 to-purple-800',
  }[c] || 'from-indigo-500 to-violet-500';
}

function levelOf(xp: number): number {
  let level = 1;
  while (100 * (level + 1) * level <= xp) level++;
  return level;
}
