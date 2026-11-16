import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context';
import { post, get } from '../lib/api';
import type { RoundStart, WordList } from '../lib/types';
import { Button, Card, ErrorBox, Input, Select, Spinner } from '../components/ui';

export function Train() {
  const { meta } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') || 'word');
  const [difficulty, setDifficulty] = useState(params.get('difficulty') || 'gemischt');
  const [count, setCount] = useState(params.get('mode') === 'text' ? 1 : 10);
  const [weakOnly, setWeakOnly] = useState(params.get('weak') === '1');
  const [listId, setListId] = useState(params.get('listId') || '');
  const [lists, setLists] = useState<WordList[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<{ lists: WordList[] }>('/lists').then((d) => setLists(d.lists)).catch(() => {});
  }, []);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const round = await post<RoundStart>('/rounds', {
        mode, difficulty: listId ? undefined : difficulty, count,
        listId: listId || undefined, weakOnly: weakOnly && !listId,
      });
      navigate(`/session/${round.roundId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Runde konnte nicht gestartet werden.');
      setBusy(false);
    }
  };

  const generateAI = async () => {
    setAiBusy(true); setError('');
    try {
      await post('/ai/generate', { difficulty: difficulty === 'gemischt' ? 'mittel' : difficulty, count: 8 });
      // Nach Generierung normal starten – neue Inhalte sind in der Datenbank
    } catch (e) {
      setError(e instanceof Error ? e.message : 'KI-Generierung fehlgeschlagen.');
    } finally { setAiBusy(false); }
  };

  if (!meta) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const maxCount = mode === 'text' ? 3 : 30;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold">Neue Runde</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Wähle Modus, Niveau und Umfang.</p>
      </div>

      {/* Modus */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        {meta.modes.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setCount(m.key === 'text' ? 1 : 10); }}
            className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
              mode === m.key
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600'
            }`}
          >
            <p className="font-bold">{m.label}</p>
            <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">{m.desc}</p>
          </button>
        ))}
      </div>

      <Card className="space-y-5 p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
        {/* Schwierigkeitsstufe */}
        <div>
          <label className="mb-2 block text-sm font-semibold">Schwierigkeitsstufe</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button
              onClick={() => setDifficulty('gemischt')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${difficulty === 'gemischt' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}
            >
              Gemischt
            </button>
            {meta.difficulties.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                title={d.description}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${difficulty === d.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Anzahl */}
        <div>
          <label className="mb-2 flex items-center justify-between text-sm font-semibold">
            Anzahl Aufgaben
            <span className="rounded-lg bg-indigo-100 px-2.5 py-0.5 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{count}</span>
          </label>
          <input
            type="range" min={mode === 'text' ? 1 : 3} max={maxCount} value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-slate-400"><span>3</span><span>{maxCount}</span></div>
        </div>

        {/* Optionen */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-300 dark:border-slate-700">
            <input type="checkbox" checked={weakOnly} onChange={(e) => setWeakOnly(e.target.checked)} disabled={!!listId} className="h-4 w-4 accent-indigo-600" />
            <div>
              <p className="text-sm font-semibold">🎯 Nur Fehlerwörter wiederholen</p>
              <p className="text-xs text-slate-500">Übt gezielt die Wörter, bei denen du zuletzt Fehler gemacht hast.</p>
            </div>
          </label>

          {lists.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">… oder eigene Liste</label>
              <Select value={listId} onChange={(e) => setListId(e.target.value)}>
                <option value="">— Keine eigene Liste —</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.item_count} Einträge)</option>)}
              </Select>
            </div>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={start} disabled={busy} className="flex-1 py-3.5 text-base">
            {busy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : '▶ Runde starten'}
          </Button>
          {!listId && (
            <Button variant="secondary" onClick={generateAI} disabled={aiBusy} title="Generiert zusätzliche Übungsinhalte">
              {aiBusy ? 'Generiere…' : '✨ KI-Übungen generieren'}
            </Button>
          )}
        </div>
      </Card>

      {/* Info-Kasten */}
      <Card className="border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
        <h3 className="mb-2 font-bold text-indigo-900 dark:text-indigo-200">So funktioniert die Bewertung</h3>
        <p className="text-sm leading-relaxed text-indigo-800/80 dark:text-indigo-200/80">
          Du hörst ein Wort oder einen Satz und schreibst, was du gehört hast. Wenn deine Schreibweise
          <strong> klingt wie das gesuchte Wort</strong>, gilt sie als „phonetisch richtig" – du bekommst
          Teilpunkte und eine Erklärung zur korrekten Rechtschreibung.
        </p>
      </Card>
    </div>
  );
}
