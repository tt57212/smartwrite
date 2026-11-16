import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../context';
import { get, post } from '../lib/api';
import type { Stats } from '../lib/types';
import { Avatar, RewardIcon } from '../components/Avatar';
import { Badge, Button, Card, Progress, Spinner } from '../components/ui';

export function Dashboard() {
  const { me, meta, refresh } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiText, setAiText] = useState<{ summary: string; tips: string[]; recommendation: string; source: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    get<Stats>('/stats').then(setStats).catch(() => {});
  }, [me?.profile.id]);

  if (!me || !stats) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const goalPct = Math.min(100, Math.round((stats.todayXp / stats.dailyGoal) * 100));
  const maxDay = Math.max(...stats.weekly.map((w) => w.rounds), 1);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend';

  const runAI = async () => {
    setAiBusy(true);
    try { setAiText(await post('/ai/analyze')); } catch { /* ignore */ }
    finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-6">
      {/* Kopfbereich */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <Avatar name={me.profile.name} avatar={me.profile.avatar} color={me.profile.color} size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{greeting}, {me.profile.name}!</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">Level {me.level.level}</span>
              <span className="text-xs text-slate-500">{me.level.xpInto}/{me.level.xpNeeded} XP</span>
            </div>
          </div>
          {/* Mini XP-Ring */}
          <div className="relative ml-2 hidden h-14 w-14 sm:block" title={`Level ${me.level.level} · ${me.level.xpInto}/${me.level.xpNeeded} XP`}>
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-700" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" strokeLinecap="round"
                className="stroke-indigo-500" strokeDasharray="97.4"
                strokeDashoffset={97.4 * (1 - me.level.xpInto / Math.max(me.level.xpNeeded, 1))} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black">{me.level.level}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/train?mode=word&difficulty=leicht"><Button variant="secondary" className="px-4 py-2 text-xs">⚡ Wörter · Leicht</Button></Link>
          <Link to="/train?mode=dictation&difficulty=mittel"><Button variant="secondary" className="px-4 py-2 text-xs">🎧 Diktat · Mittel</Button></Link>
          <Link to="/train"><Button className="px-6 py-3 text-base">▶ Jetzt üben</Button></Link>
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heutiges Ziel</p>
          <p className="mt-1 text-2xl font-extrabold">{stats.todayXp}<span className="text-sm font-medium text-slate-400">/{stats.dailyGoal} XP</span></p>
          <Progress value={stats.todayXp} max={stats.dailyGoal} className="mt-3" />
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Serie</p>
          <p className="mt-1 text-2xl font-extrabold">🔥 {stats.profile.streak}<span className="text-sm font-medium text-slate-400"> Tage</span></p>
          <p className="mt-1 text-xs text-slate-500">Rekord: {stats.profile.best_streak}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ø Note</p>
          <p className="mt-1 text-2xl font-extrabold">{stats.avgGrade !== null ? stats.avgGrade.toFixed(1) : '–'}</p>
          <p className="mt-1 text-xs text-slate-500">{stats.profile.total_rounds} Runden gesamt</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Richtige Antworten</p>
          <p className="mt-1 text-2xl font-extrabold">{stats.profile.total_correct}<span className="text-sm font-medium text-slate-400">/{stats.profile.total_answers}</span></p>
          <p className="mt-1 text-xs text-slate-500">{stats.profile.total_answers ? Math.round((stats.profile.total_correct / stats.profile.total_answers) * 100) : 0}% Trefferquote</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Wochenaktivität */}
        <Card className="p-6 lg:col-span-3 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-4 font-bold">Aktivität – letzte 14 Tage</h2>
          <div className="flex h-36 items-end gap-2">
            {stats.weekly.map((w) => (
              <div key={w.day} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-400 opacity-0 transition group-hover:opacity-100">{w.rounds}×</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400 transition-all"
                  style={{ height: `${Math.max(4, (w.rounds / maxDay) * 100)}%` }}
                  title={`${w.day}: ${w.rounds} Runden, Ø ${w.avgPercent}%`}
                />
                <span className="text-[10px] text-slate-400">{w.day.slice(8)}.</span>
              </div>
            ))}
            {!stats.weekly.length && <p className="w-full text-center text-sm text-slate-400">Noch keine Daten – starte deine erste Runde!</p>}
          </div>
        </Card>

        {/* Fehlerwörter */}
        <Card className="p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Top-Fehlerwörter</h2>
            <Link to="/words" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Alle →</Link>
          </div>
          {stats.mistakes.length ? (
            <ul className="space-y-2">
              {stats.mistakes.slice(0, 5).map((m) => (
                <li key={m.word} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
                  <span className="font-medium">{m.display}</span>
                  <Badge tone={m.wrong_count > m.phonetic_count ? 'red' : 'amber'}>
                    {m.wrong_count + m.phonetic_count + m.unclear_count} Fehler
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Fehler – super!</p>
          )}
          {stats.mistakes.length > 0 && (
            <Link to="/train?weak=1" className="mt-4 block">
              <Button variant="secondary" className="w-full">🎯 Fehlerwörter wiederholen</Button>
            </Link>
          )}
        </Card>
      </div>

      {/* KI-Analyse */}
      <Card className="p-6 animate-fade-up" style={{ animationDelay: '240ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">🧠 KI-Lernanalyse</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Persönliche Auswertung deiner Fehler {meta?.aiConfigured ? 'mit KI' : '(eingebauter Modus)'}.</p>
          </div>
          <Button variant="secondary" onClick={runAI} disabled={aiBusy}>{aiBusy ? 'Analysiere…' : 'Analyse starten'}</Button>
        </div>
        {aiText && (
          <div className="mt-4 space-y-3 animate-fade-up">
            <p className="text-sm leading-relaxed">{aiText.summary}</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {aiText.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
            <p className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
              💡 {aiText.recommendation}
            </p>
          </div>
        )}
      </Card>

      {/* Letzte Runden */}
      {stats.recentRounds.length > 0 && (
        <Card className="p-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="mb-4 font-bold">Letzte Runden</h2>
          <div className="space-y-2">
            {stats.recentRounds.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <Badge tone="indigo">{r.mode === 'word' ? 'Wörter' : r.mode === 'sentence' ? 'Sätze' : r.mode === 'dictation' ? 'Diktat' : 'Text'}</Badge>
                  <span className="text-sm text-slate-500">{new Date(r.finished_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{r.percent}%</span>
                  <Badge tone={parseFloat(r.grade) <= 3 ? 'green' : parseFloat(r.grade) <= 4 ? 'amber' : 'red'}>Note {r.grade}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Schnellzugriff Belohnungen */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5 animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-bold">Belohnungen & Meilensteine</p>
            <p className="text-sm text-slate-500">Schalte Avatare, Designs und Titel frei.</p>
          </div>
        </div>
        <Link to="/rewards"><Button variant="secondary">Ansehen</Button></Link>
      </Card>
    </div>
  );
}
