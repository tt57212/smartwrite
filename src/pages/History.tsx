import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { Badge, Card, Spinner } from '../components/ui';

interface HistoryRound {
  id: string; mode: string; percent: number; grade: string;
  score: number; max_score: number; created_at: string; finished_at: string;
  mistakes: { expected: string; given: string; verdict: string }[];
}

const MODE_LABEL: Record<string, string> = { word: 'Wörter', sentence: 'Sätze', dictation: 'Diktat', text: 'Text' };

export function History() {
  const [rounds, setRounds] = useState<HistoryRound[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    get<{ rounds: HistoryRound[] }>('/history').then((d) => setRounds(d.rounds)).catch(() => setRounds([]));
  }, []);

  if (!rounds) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Lernverlauf</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Deine abgeschlossenen Runden und Fehler im Überblick.</p>
      </div>

      {rounds.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">Noch keine Runden absolviert.</Card>
      ) : (
        <div className="space-y-3">
          {rounds.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3">
                  <Badge tone="indigo">{MODE_LABEL[r.mode] || r.mode}</Badge>
                  <span className="text-sm text-slate-500">
                    {new Date(r.finished_at).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {r.mistakes.length > 0 && <Badge tone="red">{r.mistakes.length} Fehler</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{r.percent}%</span>
                  <Badge tone={parseFloat(r.grade) <= 3 ? 'green' : parseFloat(r.grade) <= 4 ? 'amber' : 'red'}>Note {r.grade}</Badge>
                  <span className={`transition-transform ${open === r.id ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>
              {open === r.id && (
                <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700/50">
                  {r.mistakes.length === 0 ? (
                    <p className="py-2 text-sm text-emerald-600">Keine Fehler in dieser Runde. 🎉</p>
                  ) : (
                    <div className="space-y-1.5">
                      {r.mistakes.map((m, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                          <Badge tone={m.verdict === 'phonetic' ? 'amber' : 'red'}>
                            {m.verdict === 'phonetic' ? 'phonetisch' : 'falsch'}
                          </Badge>
                          <span className="text-slate-500">„{m.given || '—'}“</span>
                          <span>→</span>
                          <strong>{m.expected}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
