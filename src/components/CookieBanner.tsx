import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'sw_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  if (!visible) return null;
  const accept = () => { localStorage.setItem(KEY, 'accepted'); setVisible(false); };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/95">
        <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
          🍪 Wir verwenden nur ein essenzielles Cookie für die Anmeldung – kein Tracking.
          Details in der <Link to="/datenschutz" className="font-semibold text-indigo-600 underline dark:text-indigo-400">Datenschutzerklärung</Link>.
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
