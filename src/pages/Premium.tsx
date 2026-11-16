import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, post, del } from '../lib/api';
import type { PremiumStatus } from '../lib/types';
import { useApp } from '../context';
import { Badge, Button, Card, ErrorBox, Spinner } from '../components/ui';

const PRO_FEATURES = [
  '♾️ Unbegrenzte Runden pro Tag',
  '🧠 Alle Modi, Stufen & Listen',
  '🤖 KI-Übungen & Fehleranalyse',
  '🎨 Exklusive Profilfarben & Rahmen',
  '⚡ Prioritäts-Support per E-Mail',
];

export function Premium() {
  const { me, refresh } = useApp();
  const [data, setData] = useState<PremiumStatus | null>(null);
  const [plan, setPlan] = useState('monthly');
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [seatEmail, setSeatEmail] = useState('');
  const [seatBusy, setSeatBusy] = useState(false);
  const [seatMsg, setSeatMsg] = useState('');

  const [params, setParams] = useSearchParams();
  const [paidMsg, setPaidMsg] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    if (params.get('paid') === '1') {
      setPaidMsg('Zahlung erhalten! Premium wird in wenigen Sekunden freigeschaltet.');
      setParams({}, { replace: true });
      setTimeout(() => void load(), 3000);
      setTimeout(() => void refresh(), 4000);
    } else if (params.get('canceled') === '1') {
      setPaidMsg('Zahlung abgebrochen.');
      setParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = () => get<PremiumStatus>('/premium').then(setData).catch(() => {});
  useEffect(() => { void load(); }, [me?.user.id]); // eslint-disable-line

  if (!data) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const selected = data.plans.find((p) => p.key === plan);

  const checkout = async () => {
    setCheckoutBusy(true); setError('');
    try {
      const res = await post<{ url: string }>('/premium/checkout', { plan });
      if (res.url) window.location.href = res.url;
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler'); setCheckoutBusy(false); }
  };

  const addSeat = async () => {
    setSeatBusy(true); setSeatMsg('');
    try {
      await post('/premium/seats', { email: seatEmail.trim() });
      setSeatEmail(''); setSeatMsg('Team-Mitglied hinzugefügt!');
      await load();
    } catch (e) { setSeatMsg(e instanceof Error ? e.message : 'Fehler'); }
    finally { setSeatBusy(false); }
  };

  const removeSeat = async (id: string) => {
    await del(`/premium/seats/${id}`);
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg shadow-amber-500/30">👑</div>
        <h1 className="text-3xl font-extrabold">SmartWrite Premium</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Unbegrenztes Lernen, jeden Tag. Keine Limits, kein Stress.</p>
      </div>

      {paidMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {paidMsg}
        </div>
      )}

      {data.isPremium ? (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-teal-500/10">
          <p className="text-5xl">👑</p>
          <h2 className="mt-3 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">Du bist Premium!</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Unbegrenzte Runden{data.premiumUntil ? ` · gültig bis ${new Date(data.premiumUntil).toLocaleDateString('de-DE')}` : ''}
          </p>
          <div className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm text-emerald-900 dark:text-emerald-200">
            {PRO_FEATURES.map((f) => <p key={f}>✓ {f}</p>)}
          </div>
        </Card>
      ) : (
        <>
          {/* Preise – bei deaktiviertem Verkauf ausgegraut, aber sichtbar */}
          <div className="grid gap-4 sm:grid-cols-3">
            {data.plans.map((p) => {
              const salesOff = data.salesEnabled === false;
              return (
                <button
                  key={p.key}
                  onClick={() => { if (!salesOff) setPlan(p.key); }}
                  disabled={salesOff}
                  className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                    salesOff
                      ? 'cursor-not-allowed border-slate-200 opacity-50 grayscale dark:border-slate-700'
                      : plan === p.key
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60'
                  }`}
                >
                  {salesOff && <div className="absolute -top-3 right-4"><Badge tone="slate">Demnächst</Badge></div>}
                  {!salesOff && p.seats !== undefined && p.seats > 0 && <div className="absolute -top-3 left-4"><Badge tone="violet">Team</Badge></div>}
                  {!salesOff && p.seats === 0 && <div className="absolute -top-3 left-4"><Badge tone="violet">Team · ∞</Badge></div>}
                <p className="font-bold">{p.label}</p>
                <p className="mt-2 text-3xl font-black">{p.price}<span className="text-sm font-medium text-slate-400"> inkl. MwSt.</span></p>
                <p className="mt-1 text-xs text-slate-500">
                  {p.seats ? (p.seats > 0 ? `Für dich + ${p.seats} Team-Plätze` : 'Unbegrenzte Team-Plätze') : p.days === 365 ? '≈ 4,17 € pro Monat' : 'Jederzeit kündbar'}
                </p>
                </button>
              );
            })}
          </div>

          {/* Pro-Features */}
          <Card className="p-6">
            <h2 className="mb-3 font-bold">✨ Alle Premium-Vorteile</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRO_FEATURES.map((f) => <p key={f} className="text-sm text-slate-600 dark:text-slate-300">{f}</p>)}
            </div>
            {selected?.seats ? (
              <p className="mt-3 rounded-xl bg-violet-50 px-4 py-2.5 text-sm text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
                👥 <strong>Firmen-Tarif:</strong> Nach dem Kauf kannst du <strong>unbegrenzt</strong> viele Accounts per E-Mail hinzufügen – alle erhalten Premium.
              </p>
            ) : null}
          </Card>

          {/* Widerruf-Einwilligung (rechtlich erforderlich für digitale Inhalte) – nur wenn Kauf möglich */}
          {data.salesEnabled !== false && (
          <Card className="p-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
              <span>
                Ich stimme zu, dass der digitale Inhalt (Premium) <strong>sofort bereitgestellt</strong> wird, und bestätige, dass mein{' '}
                <Link to="/agb" className="text-indigo-600 underline dark:text-indigo-400">Widerrufsrecht</Link> mit Beginn der Bereitstellung erlischt (§ 356 Abs. 5 BGB).
                Ich habe die <Link to="/agb" className="text-indigo-600 underline dark:text-indigo-400">AGB</Link> und{' '}
                <Link to="/datenschutz" className="text-indigo-600 underline dark:text-indigo-400">Datenschutzerklärung</Link> gelesen.
              </span>
            </label>
          </Card>
          )}

          {/* Kauf nur wenn Verkauf aktiviert */}
          {data.salesEnabled === false ? (
            <Card className="border-amber-200 bg-amber-50/60 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-2xl">🚧</p>
              <p className="mt-2 font-bold">Kauf vorübergehend deaktiviert</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Der Premium-Kauf ist aktuell nicht verfügbar. Schau später wieder vorbei!</p>
            </Card>
          ) : data.cardPayment ? (
            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-violet-500/10">
              <h2 className="mb-1 font-bold">⚡ Sicher bezahlen</h2>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Kartenzahlung über Stripe (Visa, Mastercard, PayPal, Apple Pay) – Premium wird <strong>automatisch sofort</strong> freigeschaltet.
              </p>
              {error && <div className="mb-3"><ErrorBox message={error} /></div>}
              <Button onClick={checkout} disabled={checkoutBusy || !agreed} className="w-full py-3.5 text-base">
                {checkoutBusy ? 'Weiterleitung zum Bezahlen…' : `💳 Jetzt ${selected?.price} bezahlen`}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                🔒 SSL-verschlüsselt · Keine Speicherung der Kartendaten
              </p>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-slate-500">Online-Zahlung ist gerade nicht verfügbar. Bitte später erneut versuchen.</p>
            </Card>
          )}
        </>
      )}

      {/* Firmen-Team-Verwaltung */}
      {data.isBusiness && (
        <Card className="p-6">
          <h2 className="mb-1 font-bold">👥 Firmen-Team</h2>
          <p className="mb-4 text-sm text-slate-500">
            Dein Firmen-Premium gilt für dich und <strong>{(data.seatLimit ?? 0) > 0 ? `bis zu ${data.seatLimit} Team-Mitglieder` : 'unbegrenzt viele Team-Mitglieder'}</strong>.
            Füge Accounts per E-Mail hinzu – sie erhalten automatisch Premium.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={seatEmail}
              onChange={(e) => setSeatEmail(e.target.value)}
              placeholder="E-Mail des Team-Mitglieds"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900/60"
            />
            <Button onClick={addSeat} disabled={seatBusy || !seatEmail.includes('@')} className="px-5 py-2.5 text-sm">
              {seatBusy ? '…' : 'Hinzufügen'}
            </Button>
          </div>
          {seatMsg && <p className={`mt-2 text-sm font-medium ${seatMsg.includes('Fehler') || seatMsg.includes('nicht') || seatMsg.includes('Maximal') || seatMsg.includes('bereits') || seatMsg.includes('Kein') ? 'text-red-500' : 'text-emerald-600'}`}>{seatMsg}</p>}
          {(data.seats?.length ?? 0) > 0 && (
            <div className="mt-4 space-y-2">
              {data.seats!.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <div>
                    <p className="text-sm font-semibold">{s.member_name || s.member_email}</p>
                    <p className="text-xs text-slate-500">{s.member_email} · seit {new Date(s.created_at).toLocaleDateString('de-DE')}</p>
                  </div>
                  <button onClick={() => void removeSeat(s.id)} className="text-xs font-semibold text-red-500 hover:underline">Entfernen</button>
                </div>
              ))}
            </div>
          )}
          {(data.seats?.length ?? 0) === 0 && (
            <p className="mt-3 text-xs text-slate-400">Noch keine Team-Mitglieder. Das Team-Mitglied muss sich zuerst kostenlos registrieren.</p>
          )}
        </Card>
      )}

      {/* Tageslimit-Info */}
      {!data.isPremium && (
        <Card className="border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <p className="text-sm text-indigo-900 dark:text-indigo-200">
            📊 Heute: <strong>{data.dailyUsed} / {data.dailyLimit}</strong> Runden genutzt.
            Mit Premium gibt es <strong>kein Tageslimit</strong>.
          </p>
        </Card>
      )}
    </div>
  );
}
