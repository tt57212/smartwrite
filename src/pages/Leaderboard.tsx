import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Card, Spinner } from '../components/ui';

interface Entry {
  id: string; name: string; avatar: string; color: string;
  xp: number; streak: number; rank: number; level: number; me: boolean;
}
interface Board { entries: Entry[]; myRank: number; totalProfiles: number }

const MEDAL = ['🥇', '🥈', '🥉'];

export function Leaderboard() {
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => { get<Board>('/leaderboard').then(setBoard).catch(() => {}); }, []);

  if (!board) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center animate-fade-up">
        <h1 className="text-3xl font-extrabold">🏅 Rangliste</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Die besten Lerner im Vergleich · {board.totalProfiles} Profile insgesamt
        </p>
      </div>

      {/* Dein Rang */}
      <Card className="flex items-center justify-between border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-violet-500/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Dein Rang</p>
          <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300">#{board.myRank}</p>
        </div>
        <p className="text-right text-sm text-slate-500 dark:text-slate-400">
          Weiter üben und XP sammeln,<br />um aufzusteigen!
        </p>
      </Card>

      {/* Liste */}
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-700/50">
        {board.entries.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center gap-4 px-5 py-3.5 transition ${e.me ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
          >
            <span className={`w-8 text-center text-lg font-black ${i < 3 ? '' : 'text-slate-400'}`}>
              {MEDAL[i] || `#${e.rank}`}
            </span>
            <Avatar name={e.name} avatar={e.avatar} color={e.color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {e.name} {e.me && <span className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">DU</span>}
              </p>
              <p className="text-xs text-slate-500">🔥 {e.streak} Tage Serie</p>
            </div>
            <div className="text-right">
              <p className="rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">Lv {e.level}</p>
              <p className="mt-0.5 text-sm font-extrabold">{e.xp.toLocaleString('de-DE')} XP</p>
            </div>
          </div>
        ))}
        {!board.entries.length && <p className="p-8 text-center text-sm text-slate-400">Noch keine Einträge.</p>}
      </Card>

      <p className="text-center text-xs text-slate-400">
        💡 XP sammelst du mit jeder abgeschlossenen Runde – je besser die Note, desto mehr XP.
      </p>
    </div>
  );
}
