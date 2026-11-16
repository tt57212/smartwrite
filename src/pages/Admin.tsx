import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../context';
import { del, get, patch, post, put } from '../lib/api';
import { Badge, Button, Card, ErrorBox, Input, Modal, Select, Spinner } from '../components/ui';

interface AdminUser { id: string; email: string; role: string; created_at: string; premium_until: string | null; profile_count: number; total_xp: number }
interface AdminProfile { id: string; name: string; email: string; xp: number; streak: number; total_rounds: number; grade_count: number; grade_sum: number }
interface ContentItem { id: number; type: string; text: string; difficulty: string; category: string }
interface DiffLevel { id: number; key: string; label: string; description: string; sort_order: number }
interface AdminStats { users: number; profiles: number; rounds: number; answers: number; content: number; totalXp: number }
interface PremiumRequest {
  id: string; user_id: string; email: string; plan: string; amount_cents: number;
  status: string; note: string; possible_duplicate: number; created_at: string; decided_at: string | null;
}

export function Admin() {
  const { me } = useApp();
  const [tab, setTab] = useState<'overview' | 'users' | 'profiles' | 'content' | 'difficulty' | 'premium'>('overview');

  if (!me?.isAdmin) {
    return (
      <Card className="p-10 text-center">
        <p className="text-4xl">🛡️</p>
        <p className="mt-2 font-bold">Kein Admin-Zugang</p>
        <p className="text-sm text-slate-500">Diese Seite ist nur für Administratoren.</p>
      </Card>
    );
  }

  const tabs = [
    ['overview', 'Übersicht'], ['users', 'Benutzer'], ['profiles', 'Profile'],
    ['content', 'Inhalte'], ['difficulty', 'Stufen'], ['premium', 'Premium'],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">🛡️ Admin-Bereich</h1>
        <p className="text-sm text-slate-500">Verwaltung von Benutzern, Inhalten und Statistiken.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'profiles' && <Profiles />}
      {tab === 'content' && <Content />}
      {tab === 'difficulty' && <Difficulty />}
      {tab === 'premium' && <PremiumAdmin />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rounds, setRounds] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    get<AdminStats>('/admin/stats').then(setStats).catch(() => {});
    get<{ rounds: Record<string, unknown>[] }>('/admin/rounds').then((d) => setRounds(d.rounds.slice(0, 15))).catch(() => {});
  }, []);
  if (!stats) return <Spinner className="h-8 w-8" />;
  const cards: [string, number, string, string][] = [
    ['Benutzer', stats.users, '👥', 'from-indigo-500 to-violet-500'],
    ['Profile', stats.profiles, '🧑‍🤝‍🧑', 'from-emerald-500 to-teal-500'],
    ['Runden', stats.rounds, '✏️', 'from-sky-500 to-cyan-500'],
    ['Antworten', stats.answers, '💬', 'from-amber-500 to-orange-500'],
    ['Inhalte', stats.content, '📚', 'from-rose-500 to-pink-500'],
    ['XP gesamt', stats.totalXp, '⭐', 'from-violet-500 to-purple-500'],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map(([l, v, icon, grad]) => (
          <Card key={l} className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-xl text-white shadow-md`}>{icon}</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p>
              <p className="text-2xl font-extrabold">{v}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h2 className="mb-4 font-bold">Letzte Runden (alle Nutzer)</h2>
        <div className="space-y-2">
          {rounds.map((r) => (
            <div key={r.id as string} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-800/60">
              <span>{r.profile_name as string} <span className="text-slate-400">({r.email as string})</span></span>
              <span className="flex items-center gap-2">
                <Badge tone="indigo">{r.mode as string}</Badge>
                <span className="font-bold">{r.percent as number}%</span>
                <span className="text-slate-400">Note {r.grade as string}</span>
              </span>
            </div>
          ))}
          {!rounds.length && <p className="text-sm text-slate-400">Noch keine Runden.</p>}
        </div>
      </Card>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const load = () => { get<{ users: AdminUser[] }>('/admin/users').then((d) => setUsers(d.users)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const filtered = users.filter((u) =>
    (!search || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const setRole = async (u: AdminUser) => {
    await patch(`/admin/users/${u.id}`, { role: u.role === 'admin' ? 'user' : 'admin' });
    load();
  };
  const resetPw = async (u: AdminUser) => {
    const pw = prompt(`Neues Passwort für ${u.email} (min. 8 Zeichen):`);
    if (pw && pw.length >= 8) { await patch(`/admin/users/${u.id}`, { password: pw }); alert('Passwort geändert.'); }
  };
  const remove = async (u: AdminUser) => {
    if (confirm(`Benutzer ${u.email} und alle Daten wirklich löschen?`)) { await del(`/admin/users/${u.id}`); load(); }
  };

  if (loading) return <Spinner className="h-8 w-8" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="🔍 E-Mail suchen …" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
          <option value="">Alle Rollen</option>
          <option value="admin">Admins</option>
          <option value="user">Benutzer</option>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setShowNew(true)}>＋ Benutzer erstellen</Button>
      </div>
      {error && <ErrorBox message={error} />}
      <Card className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {filtered.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white ${u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-violet-500'}`}>
                {u.email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{u.email} {u.role === 'admin' && <Badge tone="amber">Admin</Badge>} {u.premium_until && new Date(u.premium_until) > new Date() && <Badge tone="violet">⭐ Premium</Badge>}</p>
                <p className="text-xs text-slate-500">{u.profile_count} Profile · {u.total_xp} XP · seit {new Date(u.created_at).toLocaleDateString('de-DE')}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void setRole(u)}>{u.role === 'admin' ? 'Zum User' : 'Zum Admin'}</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void resetPw(u)}>Passwort</Button>
              <Button variant="ghost" className="px-2 py-1.5 text-xs text-red-500" onClick={() => void remove(u)}>🗑</Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="p-6 text-sm text-slate-400">Keine Benutzer gefunden.</p>}
      </Card>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  );
}

function NewUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try { await post('/admin/users', { email, password, name, role }); onClose(); onCreated(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Fehler'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Benutzer erstellen">
      <form onSubmit={submit} className="space-y-4">
        <Input placeholder="E-Mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Passwort (min. 8 Zeichen)" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Standard-Benutzer</option>
          <option value="admin">Administrator</option>
        </Select>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" className="flex-1">Erstellen</Button>
        </div>
      </form>
    </Modal>
  );
}

interface PlanConfig { label: string; days: number; cents: number; seats?: number; enabled?: boolean }

function PlanEditor() {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    get<{ plans: Record<string, PlanConfig> }>('/admin/premium-config')
      .then((d) => setPlans(d.plans)).finally(() => setLoading(false));
  }, []);

  const set = (key: string, field: keyof PlanConfig, value: string | number | boolean) =>
    setPlans((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await put('/admin/premium-config', { plans });
      setMsg('Tarife gespeichert.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Fehler'); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner className="h-6 w-6" />;
  const keys = Object.keys(plans);
  if (!keys.length) return null;

  return (
    <Card className="p-5">
      <h3 className="mb-1 font-bold">💰 Tarife & Preise</h3>
      <p className="mb-4 text-xs text-slate-500">Hier kannst du Preise, Laufzeiten, Team-Plätze und die Aktivierung der Tarife anpassen. Änderungen gelten sofort für neue Käufe.</p>
      <div className="space-y-3">
        {keys.map((key) => {
          const p = plans[key];
          return (
            <div key={key} className="grid grid-cols-2 items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60 sm:grid-cols-6">
              <span className="font-mono text-xs font-bold text-slate-500">{key}</span>
              <input className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900" value={p.label}
                onChange={(e) => set(key, 'label', e.target.value)} placeholder="Name" />
              <label className="flex items-center gap-1 text-xs text-slate-500">€<input type="number" step="0.01" className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                value={(p.cents / 100).toFixed(2)} onChange={(e) => set(key, 'cents', Math.round(parseFloat(e.target.value || '0') * 100))} /></label>
              <label className="flex items-center gap-1 text-xs text-slate-500">Tage<input type="number" className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                value={p.days} onChange={(e) => set(key, 'days', parseInt(e.target.value) || 30)} /></label>
              <label className="flex items-center gap-1 text-xs text-slate-500" title="0 = unbegrenzt">Plätze<input type="number" className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                value={p.seats ?? ''} onChange={(e) => set(key, 'seats', parseInt(e.target.value) || 0)} /></label>
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <input type="checkbox" checked={p.enabled !== false} onChange={(e) => set(key, 'enabled', e.target.checked)} className="accent-indigo-600" />
                aktiv
              </label>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={() => void save()} disabled={saving} className="px-5 py-2 text-sm">{saving ? 'Speichern…' : 'Tarife speichern'}</Button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
      </div>
    </Card>
  );
}

function PremiumAdmin() {
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const load = () => {
    get<{ requests: PremiumRequest[] }>(`/admin/premium?status=${filter}`).then((d) => setRequests(d.requests)).finally(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [filter]); // eslint-disable-line

  const decide = async (id: string, action: 'approve' | 'reject') => {
    await post(`/admin/premium/${id}/${action}`, action === 'approve' ? {} : undefined);
    load();
  };

  const planLabel = (p: string) => p === 'yearly' ? 'Premium Jahr' : p === 'business' ? 'Premium Firma' : 'Premium Monat';

  if (loading) return <Spinner className="h-8 w-8" />;
  return (
    <div className="space-y-4">
      <PlanEditor />
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${filter === f ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {f === 'pending' ? 'Offen' : f === 'approved' ? 'Freigeschaltet' : f === 'rejected' ? 'Abgelehnt' : 'Alle'}
          </button>
        ))}
      </div>
      <Card className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {requests.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{r.email} {r.possible_duplicate ? <Badge tone="red">⚠ möglicher Duplikat</Badge> : null}</p>
                <p className="text-xs text-slate-500">
                  {planLabel(r.plan)} · {(r.amount_cents / 100).toFixed(2).replace('.', ',')} € · {new Date(r.created_at).toLocaleString('de-DE')}
                </p>
                {r.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">„{r.note}"</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>
                  {r.status === 'pending' ? 'Offen' : r.status === 'approved' ? 'Freigeschaltet' : 'Abgelehnt'}
                </Badge>
                {r.status === 'pending' && (
                  <>
                    <Button className="px-3 py-1.5 text-xs" onClick={() => void decide(r.id, 'approve')}>✓ Freischalten</Button>
                    <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => void decide(r.id, 'reject')}>✕ Ablehnen</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {!requests.length && <p className="p-6 text-sm text-slate-400">Keine Anfragen in dieser Ansicht.</p>}
      </Card>
      <p className="text-xs text-slate-400">
        ℹ️ „Freischalten" setzt das Abo des Nutzers automatisch (Monat = 30 Tage, Jahr = 365 Tage ab heute).
      </p>
    </div>
  );
}

function Profiles() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { get<{ profiles: AdminProfile[] }>('/admin/profiles').then((d) => setProfiles(d.profiles)).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner className="h-8 w-8" />;
  return (
    <Card className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {profiles.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <div>
            <p className="font-semibold">{p.name} <span className="text-slate-400">· {p.email}</span></p>
            <p className="text-xs text-slate-500">{p.total_rounds} Runden · {p.xp} XP · Serie {p.streak} · Ø Note {p.grade_count ? (p.grade_sum / p.grade_count).toFixed(1) : '–'}</p>
          </div>
        </div>
      ))}
      {!profiles.length && <p className="p-6 text-sm text-slate-400">Keine Profile.</p>}
    </Card>
  );
}

function Content() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const load = () => {
    const q = new URLSearchParams(); if (filter) q.set('difficulty', filter); if (type) q.set('type', type);
    get<{ items: ContentItem[] }>(`/admin/content?${q}`).then((d) => setItems(d.items)).finally(() => setLoading(false));
  };
  useEffect(() => { setLoading(true); load(); }, [filter, type]); // eslint-disable-line

  const remove = async (i: ContentItem) => { if (confirm('Eintrag löschen?')) { await del(`/admin/content/${i.id}`); load(); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-40">
          <option value="">Alle Typen</option><option value="word">Wörter</option><option value="sentence">Sätze</option><option value="text">Texte</option>
        </Select>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
          <option value="">Alle Stufen</option>
          {['anfaenger', 'leicht', 'mittel', 'schwer', 'experte'].map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setShowNew(true)}>＋ Inhalt erstellen</Button>
      </div>
      {loading ? <Spinner className="h-8 w-8" /> : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <Badge tone={i.type === 'word' ? 'indigo' : i.type === 'sentence' ? 'violet' : 'amber'}>{i.type}</Badge>
                <Badge tone="slate">{i.difficulty}</Badge>
                <span className="truncate text-sm">{i.text}</span>
              </div>
              <button onClick={() => void remove(i)} className="shrink-0 text-slate-400 hover:text-red-500">🗑</button>
            </div>
          ))}
          {!items.length && <p className="p-6 text-sm text-slate-400">Keine Inhalte.</p>}
        </Card>
      )}
      <ContentModal open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  );
}

function ContentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState('word'); const [text, setText] = useState(''); const [difficulty, setDifficulty] = useState('mittel'); const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try { await post('/admin/content', { type, text, difficulty }); onClose(); onCreated(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Fehler'); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Inhalt erstellen">
      <form onSubmit={submit} className="space-y-4">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="word">Wort</option><option value="sentence">Satz</option><option value="text">Text</option>
        </Select>
        <textarea required rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Inhalt …"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100" />
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {['anfaenger', 'leicht', 'mittel', 'schwer', 'experte'].map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-3">
          <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" className="flex-1">Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

function Difficulty() {
  const [levels, setLevels] = useState<DiffLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { get<{ levels: DiffLevel[] }>('/admin/difficulty').then((d) => setLevels(d.levels)).finally(() => setLoading(false)); };
  useEffect(load, []);
  const save = async (l: DiffLevel, label: string, desc: string) => {
    await patch(`/admin/difficulty/${l.id}`, { label, description: desc }); load();
  };
  if (loading) return <Spinner className="h-8 w-8" />;
  return (
    <div className="space-y-3">
      {levels.map((l) => (
        <LevelRow key={l.id} level={l} onSave={save} onDelete={async () => { await del(`/admin/difficulty/${l.id}`); load(); }} />
      ))}
    </div>
  );
}

function LevelRow({ level, onSave, onDelete }: { level: DiffLevel; onSave: (l: DiffLevel, label: string, desc: string) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(level.label);
  const [desc, setDesc] = useState(level.description);
  const dirty = label !== level.label || desc !== level.description;
  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <Badge tone="indigo">{level.key}</Badge>
      <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-40" />
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="min-w-40 flex-1" placeholder="Beschreibung" />
      {dirty && <Button className="px-3 py-1.5 text-xs" onClick={() => onSave(level, label, desc)}>Speichern</Button>}
      <button onClick={onDelete} className="text-slate-400 hover:text-red-500" title="Löschen">🗑</button>
    </Card>
  );
}
