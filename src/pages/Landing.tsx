import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { Button, ErrorBox, Input } from '../components/ui';

export function Landing() {
  const { me, login, register } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (me) { navigate('/', { replace: true }); return null; }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
        {/* Linke Seite: Marketing */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black backdrop-blur">S</div>
            <span className="text-xl font-extrabold">SmartWrite</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">Rechtschreibung üben,<br />die Spaß macht.</h1>
            <ul className="mt-6 space-y-3 text-sm text-indigo-100">
              <li>🔊 Wörter & Sätze anhören und nachschreiben</li>
              <li>🧠 Faire Bewertung: Auch „klingende" Schreibweisen zählen</li>
              <li>📈 XP, Level, Serien & Belohnungen</li>
              <li>👨‍👩‍👧‍👦 Unteraccounts für die ganze Familie</li>
            </ul>
          </div>
          <p className="text-xs text-indigo-200">Kostenlos · Sicher · Auf Deutsch</p>
        </div>

        {/* Rechte Seite: Formular */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 md:hidden">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">SmartWrite</h1>
            <p className="text-sm text-slate-500">Rechtschreibung & Schreiben üben</p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${mode === m ? 'bg-white text-indigo-700 shadow dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Lisa" autoComplete="name" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">E-Mail</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="du@beispiel.de" autoComplete="email" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Passwort</label>
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Mindestens 8 Zeichen' : '••••••••'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
            {error && <ErrorBox message={error} />}
            <Button type="submit" disabled={busy} className="w-full py-3">
              {busy ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">
            Mit der Registrierung stimmst du der Nutzung von SmartWrite zu.
          </p>
        </div>
      </div>
    </div>
  );
}
