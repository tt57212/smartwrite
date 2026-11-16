import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../lib/api';
import { speak, stopSpeaking, isTTSSupported } from '../lib/tts';
import type { ItemResult, RoundResult, Verdict } from '../lib/types';
import { Badge, Button, Card, ErrorBox, Progress, Spinner, Textarea } from '../components/ui';
import { RewardIcon } from '../components/Avatar';
import { VoicePicker } from '../components/VoicePicker';

interface RoundData {
  round: { id: string; mode: string; config: string; status: string };
  items: { id: number; prompt: string; answer: string; sort_order: number }[];
  answers: Record<number, { given: string; verdict: string }>;
  result?: RoundResult | null;
}

const MODE_LABEL: Record<string, string> = {
  word: 'Wörter', sentence: 'Sätze', dictation: 'Diktat', text: 'Text',
};

const VERDICT_STYLE: Record<Verdict, { badge: 'green' | 'amber' | 'red' | 'slate'; icon: string }> = {
  correct: { badge: 'green', icon: '✅' },
  phonetic: { badge: 'amber', icon: '🟡' },
  wrong: { badge: 'red', icon: '❌' },
  unclear: { badge: 'slate', icon: '❔' },
};

export function Session() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RoundData | null>(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (!roundId) return;
    get<RoundData>(`/rounds/${roundId}`).then((d) => {
      setData(d);
      if (d.result) setResult(d.result);
    }).catch((e) => setError(e.message));
    return () => stopSpeaking();
  }, [roundId]);

  const item = data?.items[index];
  const total = data?.items.length || 0;

  const playPrompt = useCallback((text: string) => {
    speak(text, { rate: data?.round.mode === 'dictation' ? 0.85 : 0.92 });
  }, [data?.round.mode]);

  // Beim Wechsel der Aufgabe automatisch vorlesen
  useEffect(() => {
    if (item && !result) {
      const t = setTimeout(() => playPrompt(item.prompt), 400);
      setGiven(answers[item.id] ?? '');
      setTimeout(() => inputRef.current?.focus(), 500);
      return () => clearTimeout(t);
    }
  }, [index, item?.id, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAndNext = () => {
    if (!item) return;
    const next = { ...answers, [item.id]: given };
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
    } else {
      void submit(next);
    }
  };

  const submit = async (finalAnswers: Record<number, string>) => {
    if (!roundId || submitting) return;
    setSubmitting(true);
    try {
      const res = await post<RoundResult>(`/rounds/${roundId}/submit`, {
        answers: Object.entries(finalAnswers).map(([itemId, g]) => ({ itemId: Number(itemId), given: g })),
      });
      stopSpeaking();
      setResult(res);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Abgabe fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  const restartSimilar = async () => {
    if (!data) return;
    try {
      const cfg = JSON.parse(data.round.config || '{}');
      const round = await post<{ roundId: string }>('/rounds', {
        mode: cfg.mode || 'word', difficulty: cfg.difficulty, count: cfg.count || 10,
      });
      navigate(`/session/${round.roundId}`);
    } catch { navigate('/train'); }
  };

  if (error && !data) {
    return <div className="mx-auto max-w-lg py-20"><ErrorBox message={error} /><div className="mt-4"><Link to="/train"><Button variant="secondary">Zurück</Button></Link></div></div>;
  }
  if (!data) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  // ============ ERGEBNISSE ============
  if (result) return <Results result={result} onAgain={restartSimilar} onHome={() => navigate('/')} onNew={() => navigate('/train')} />;

  // ============ ÜBUNG ============
  const isLong = data.round.mode === 'text' || (data.round.mode === 'sentence' && (item?.prompt.length || 0) > 80);
  const modeLabel = MODE_LABEL[data.round.mode] || data.round.mode;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <Badge tone="indigo">{modeLabel}</Badge>
          <h1 className="mt-2 text-xl font-extrabold">Aufgabe {index + 1} von {total}</h1>
        </div>
        <div className="text-sm font-semibold text-slate-500">{Math.round(((index) / total) * 100)}%</div>
      </div>
      <Progress value={index} max={total} />

      <Card className="relative overflow-hidden p-6 sm:p-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
        <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {data.round.mode === 'dictation' ? '🎧 Hör zu und schreibe das Diktat.' :
           data.round.mode === 'text' ? '🎧 Höre dir den Text an und schreibe ihn auf.' :
           '🔊 Höre zu und schreibe nach, was du hörst.'}
        </p>

        {/* Audio-Steuerung */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            onClick={() => item && playPrompt(item.prompt)}
            className="group flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-4xl text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 active:scale-95"
            title="Nochmal anhören"
          >
            🔊
          </button>
          <p className="text-xs text-slate-400">{isTTSSupported() ? 'Klicken zum Wiederholen' : 'Audio wird nicht unterstützt'}</p>
        </div>

        {/* Eingabe */}
        {isLong ? (
          <Textarea
            ref={(el) => { inputRef.current = el; }}
            value={given}
            onChange={(e) => setGiven(e.target.value)}
            rows={data.round.mode === 'text' ? 8 : 4}
            placeholder="Schreibe hier …"
            className="text-base leading-relaxed"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveAndNext(); }}
          />
        ) : (
          <input
            ref={(el) => { inputRef.current = el; }}
            value={given}
            onChange={(e) => setGiven(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveAndNext(); }}
            placeholder="Deine Antwort …"
            autoFocus
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-center text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
          />
        )}

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/train')} disabled={submitting}>✕ Abbrechen</Button>
          <Button onClick={saveAndNext} disabled={submitting} className="px-8 py-3">
            {index + 1 === total ? '🏁 Abschließen' : 'Weiter →'}
          </Button>
        </div>
      </Card>

      <div className="space-y-3 pb-6 text-center">
        <p className="text-xs text-slate-400">
          Tipp: Wörter, die nur <em>klingen</em> wie das Original, werden als „phonetisch richtig" gewertet.
        </p>
        <details className="text-left">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400">🔊 Stimme & Tempo anpassen</summary>
          <div className="mt-3"><VoicePicker compact /></div>
        </details>
      </div>
    </div>
  );
}

// ================= ERGEBNISSE =================

function ScoreRing({ percent, grade, gradeColor }: { percent: number; grade: string; gradeColor: string }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(100, percent) / 100);
  return (
    <div className="relative mx-auto mt-4 h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="white" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black drop-shadow ${gradeColor}`}>{grade}</span>
        <span className="text-sm font-bold text-white/90">{percent}%</span>
      </div>
    </div>
  );
}

function Results({ result, onAgain, onHome, onNew }: {
  result: RoundResult;
  onAgain: () => void;
  onHome: () => void;
  onNew: () => void;
}) {
  const pct = result.percent;
  const gradeColor = parseFloat(result.grade) <= 2 ? 'text-emerald-500' : parseFloat(result.grade) <= 4 ? 'text-amber-500' : 'text-red-500';
  const mistakes = result.results.filter((r) => r.verdict !== 'correct');
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Ergebnis-Karte */}
      <Card className="overflow-hidden animate-pop">
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-8 text-center text-white">
          <p className="text-sm font-medium text-indigo-200">Runde abgeschlossen!</p>
          <ScoreRing percent={pct} grade={result.grade} gradeColor={gradeColor} />
          <p className="mt-1 text-sm text-indigo-200">{result.score} / {result.maxScore} Punkte</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
          <div className="p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{result.correctCount}</p>
            <p className="text-xs text-slate-500">Richtig</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-600">+{result.xpGained}</p>
            <p className="text-xs text-slate-500">XP erhalten</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-extrabold">🔥 {result.streak}</p>
            <p className="text-xs text-slate-500">Tage-Serie</p>
          </div>
        </div>
      </Card>

      {/* Level / Belohnungen */}
      {(result.level.level > 1 || result.unlockedRewards.length > 0) && (
        <Card className="space-y-3 p-5 animate-fade-up">
          {result.unlockedRewards.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
              <RewardIcon icon={r.icon} />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Belohnung freigeschaltet: {r.name}</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/70">{r.description}</p>
              </div>
            </div>
          ))}
          <p className="text-sm text-slate-500">Neues Level: <strong>{result.level.level}</strong> · {result.level.xp} XP gesamt</p>
        </Card>
      )}

      {/* Fehler-Übersicht */}
      {mistakes.length > 0 && (
        <Card className="p-6 animate-fade-up">
          <h2 className="mb-4 font-bold">Deine Fehler ({mistakes.length})</h2>
          <div className="space-y-2">
            {(showAll ? mistakes : mistakes.slice(0, 8)).map((r) => {
              const s = VERDICT_STYLE[r.verdict];
              return (
                <div key={r.itemId} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <Badge tone={s.badge}>{r.verdictLabel}</Badge>
                    <span className="ml-auto text-sm font-bold text-slate-500">{r.points}/{r.maxPoints}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-500">Dein Versuch: <strong className="text-slate-800 dark:text-slate-200">„{r.given || '—'}“</strong></span>
                    <span className="text-emerald-700 dark:text-emerald-400">Richtig: <strong>{r.expected}</strong></span>
                  </div>
                  {r.verdict !== 'unclear' && (
                    <p className="mt-1.5 text-xs text-slate-500">{r.feedback}</p>
                  )}
                </div>
              );
            })}
          </div>
          {mistakes.length > 8 && (
            <button onClick={() => setShowAll(!showAll)} className="mt-3 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              {showAll ? 'Weniger anzeigen' : `Alle ${mistakes.length} Fehler anzeigen`}
            </button>
          )}
        </Card>
      )}

      {mistakes.length === 0 && (
        <Card className="p-8 text-center animate-fade-up">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-bold">Perfekte Runde!</p>
          <p className="text-sm text-slate-500">Alles richtig – starke Leistung!</p>
        </Card>
      )}

      {/* Aktionen */}
      <div className="flex flex-col gap-3 pb-8 sm:flex-row">
        <Button onClick={onAgain} className="flex-1 py-3.5">🔁 Ähnliche Runde</Button>
        <Button variant="secondary" onClick={onNew} className="flex-1 py-3.5">⚙️ Neue Einstellungen</Button>
        <Button variant="ghost" onClick={onHome} className="flex-1 py-3.5">🏠 Dashboard</Button>
      </div>
    </div>
  );
}

// Für TypeScript: ItemResult wird in Results über result.results genutzt
export type { ItemResult };
