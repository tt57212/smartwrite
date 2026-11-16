import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const KEY = 'sw_tour_v1';

interface Step {
  title: string;
  text: string;
  target?: string; // CSS-Selektor
  emoji: string;
}

const STEPS: Step[] = [
  { emoji: '👋', title: 'Willkommen bei SmartWrite!', text: 'In 30 Sekunden zeigen wir dir alles Wichtige. Du kannst die Tour jederzeit unten rechts neu starten.' },
  { emoji: '📊', title: 'Dashboard', text: 'Hier siehst du dein Tagesziel, deine Serie, Level und Fortschritt auf einen Blick.', target: 'a[href="/"]' },
  { emoji: '✏️', title: 'Üben', text: 'Starte hier deine Trainingsrunden: Wörter, Sätze, Diktate oder Texte – in 5 Schwierigkeitsstufen.', target: 'a[href="/train"]' },
  { emoji: '📋', title: 'Meine Listen', text: 'Erstelle eigene Übungslisten mit Wörtern, Sätzen und Texten – perfekt zum Thematisieren.', target: 'a[href="/lists"]' },
  { emoji: '🎯', title: 'Fehlerwörter', text: 'Alle Wörter, bei denen du geschwächelt hast, gesammelt an einem Ort – zum gezielten Nachüben.', target: 'a[href="/words"]' },
  { emoji: '🏆', title: 'Belohnungen', text: 'Sammle XP, steig im Level auf und schalte coole Belohnungen frei.', target: 'a[href="/rewards"]' },
  { emoji: '⭐', title: 'Premium', text: 'Kostenlos sind 10 Runden pro Tag drin. Premium schaltet unbegrenzte Runden frei – auch als Firmen-Tarif mit Team-Plätzen.', target: 'a[href="/premium"]' },
  { emoji: '👤', title: 'Profil', text: 'Stimme & Tempo einstellen, Unteraccounts für Kinder anlegen, tägliche & wöchentliche Lernziele setzen.', target: 'a[href="/profile"]' },
  { emoji: '🎉', title: 'Fertig!', text: 'Viel Spaß beim Üben! Deine Fortschritte werden automatisch gespeichert. Die Tour kannst du im Profil-Bereich jederzeit wiederholen.' },
];

export function Tour() {
  const [step, setStep] = useState(-1); // -1 = nicht gestartet
  const [rect, setRect] = useState<DOMRect | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setStep(0), 800);
    return () => clearTimeout(t);
  }, []);

  // Tour kann von überall neu gestartet werden
  useEffect(() => {
    const restart = () => { localStorage.removeItem(KEY); setStep(0); };
    window.addEventListener('sw-restart-tour', restart);
    return () => window.removeEventListener('sw-restart-tour', restart);
  }, []);

  // Bei Seitenwechsel Steps mit Targets neu positionieren
  useEffect(() => {
    if (step < 0) return;
    const s = STEPS[step];
    if (!s.target) { setRect(null); return; }
    const el = document.querySelector(s.target);
    const r = el?.getBoundingClientRect();
    setRect(r && r.width > 0 ? r : null);
  }, [step, location.pathname]);

  if (step < 0) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = () => { localStorage.setItem(KEY, '1'); setStep(-1); };
  const next = () => { if (last) finish(); else setStep(step + 1); };
  const skip = () => { localStorage.setItem(KEY, '1'); setStep(-1); };

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Abdunklung mit Aussparung für das Target */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-all"
        onClick={skip}
        style={rect ? {
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.left - 8}px ${rect.top - 8}px, ${rect.left - 8}px ${rect.bottom + 8}px, ${rect.right + 8}px ${rect.bottom + 8}px, ${rect.right + 8}px ${rect.top - 8}px, ${rect.left - 8}px ${rect.top - 8}px)`,
        } : undefined}
      />

      {/* Highlight-Rahmen */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all"
          style={{ left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      )}

      {/* Tooltip-Karte */}
      <div
        className="absolute w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        style={rect
          ? { left: '50%', top: Math.min(rect.bottom + 20, window.innerHeight - 260), transform: 'translateX(-50%)' }
          : { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl">{s.emoji}</span>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500">Schritt {step + 1} / {STEPS.length}</p>
            <h3 className="mt-0.5 text-lg font-extrabold">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.text}</p>
          </div>
        </div>
        {/* Fortschrittsbalken */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={skip} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Überspringen</button>
          <button onClick={next} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-500">
            {last ? 'Los geht\'s! 🎉' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
