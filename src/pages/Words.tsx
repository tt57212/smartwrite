import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import type { Stats } from '../lib/types';
import { Badge, Button, Card, Progress, Spinner } from '../components/ui';

export function Words() {
  const [words, setWords] = useState<Stats['mistakes'] | null>(null);

  useEffect(() => {
    get<{ words: Stats['mistakes'] }>('/weak-words').then((d) => setWords(d.words)).catch(() => setWords([]));
  }, []);

  if (!words) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Fehlerwörter</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Deine persönlichen Stolperfallen – gezielt trainierbar.</p>
        </div>
        {words.length > 0 && (
          <Link to="/train?weak=1"><Button>🎯 Diese Wörter üben</Button></Link>
        )}
      </div>

      {words.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-bold">Keine Fehlerwörter</p>
          <p className="text-sm text-slate-500">Du hast noch keine Fehler gesammelt – weiter so!</p>
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {words.map((w) => {
            const total = w.correct_count + w.wrong_count + w.phonetic_count + w.unclear_count;
            const acc = total ? Math.round((w.correct_count / total) * 100) : 0;
            return (
              <div key={w.word} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{w.display}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={w.correct_count} max={Math.max(total, 1)} className="max-w-40" />
                    <span className="text-xs text-slate-500">{acc}% richtig</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {w.wrong_count > 0 && <Badge tone="red">{w.wrong_count} falsch</Badge>}
                  {w.phonetic_count > 0 && <Badge tone="amber">{w.phonetic_count} phon.</Badge>}
                  {w.correct_count > 0 && <Badge tone="green">{w.correct_count} richtig</Badge>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
