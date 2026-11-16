import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, post } from '../lib/api';
import type { PremiumStatus } from '../lib/types';
import { useApp } from '../context';
import { Badge, Button, Card, ErrorBox, Spinner, Textarea } from '../components/ui';

export function Premium() {
  const { me, refresh } = useApp();
  const [data, setData] = useState<PremiumStatus | null>(null);
  const [plan, setPlan] = useState('monthly');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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

  const pending = data.requests.find((r) => r.status === 'pending');
  const selected = data.plans.find((p) => p.key === plan);

  const copyIban = () => {
    void navigator.clipboard?.writeText(data.iban.replace(/\s/g, ''));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const request = async () => {
    setBusy(true); setError('');
    try {
      await post('/premium/request', { plan, note });
      await load(); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler'); }
    finally { setBusy(false); }
  };

  const checkout = async () => {
    setCheckoutBusy(true); setError('');
    try {
      const res = await post<{ url: string }>('/premium/checkout', { plan });
      if (res.url) window.location.href = res.url;
    } catch (e) { setError(e instanceof Error ? e.message : 'Fehler'); setCheckoutBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">⭐ SmartWrite Premium</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Unbegrenzte Runden, jeden Tag. Keine Limits, kein Stress.</p>
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
        </Card>
      ) : (
        <>
          {/* Preise */}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.plans.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlan(p.key)}
                className={`rounded-2xl border-2 p-6 text-left transition-all active:scale-[0.99] ${
                  plan === p.key
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">{p.label}</p>
                  {p.days === 365 && <Badge tone="violet"> Sparen </Badge>}
                </div>
                <p className="mt-2 text-3xl font-black">{p.price}</p>
                <p className="mt-1 text-xs text-slate-500">{p.days === 365 ? '≈ 4,17 € pro Monat' : 'Jederzeit kündbar'}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <li>✓ Unbegrenzte Runden pro Tag</li>
                  <li>✓ Alle Modi & Stufen</li>
                  <li>✓ KI-Übungen & Analysen</li>
                </ul>
              </button>
            ))}
          </div>

          {/* Sofort-Kauf per Karte (Stripe) */}
          {data.cardPayment && (
            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-violet-500/10">
              <h2 className="mb-1 font-bold">⚡ Sofort bezahlen</h2>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Kartenzahlung über Stripe – Premium wird <strong>automatisch sofort</strong> freigeschaltet.
              </p>
              <Button onClick={checkout} disabled={checkoutBusy || !!pending} className="w-full py-3">
                {checkoutBusy ? 'Weiterleitung…' : `💳 Jetzt ${selected?.price} bezahlen`}
              </Button>
            </Card>
          )}

          {/* Zahlung per Überweisung */}
          <Card className="p-6">
            <h2 className="mb-3 font-bold">Zahlung per Überweisung</h2>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">An dieses Konto überweisen:</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold dark:bg-slate-800">{data.iban}</code>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={copyIban}>{copied ? '✓ Kopiert' : 'Kopieren'}</Button>
              </div>
              <p className="mt-3 text-sm">
                Betrag: <strong>{selected?.price}</strong> · Verwendungszweck:{' '}
                <strong>SmartWrite Premium – {me?.user.email}</strong>
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Nach Eingang der Überweisung wird dein Account manuell freigeschaltet (in der Regel innerhalb von 24 Stunden).
            </p>

            {pending ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⏳ Anfrage offen</p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80">
                  Tarif: {data.plans.find((p) => p.key === pending.plan)?.label} · {new Date(pending.created_at).toLocaleDateString('de-DE')}.
                  Wir prüfen den Zahlungseingang und schalten dich frei.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional: Verwendungszweck / Bemerkung (z. B. Überweisungsdatum)" />
                {error && <ErrorBox message={error} />}
                <Button onClick={request} disabled={busy} className="w-full py-3">
                  {busy ? 'Wird gesendet…' : '✓ Ich habe überwiesen'}
                </Button>
              </div>
            )}
          </Card>

          {/* Bisherige Anfragen */}
          {data.requests.filter((r) => r.status !== 'pending').length > 0 && (
            <Card className="p-6">
              <h2 className="mb-3 font-bold">Anfragen-Verlauf</h2>
              <div className="space-y-2">
                {data.requests.filter((r) => r.status !== 'pending').map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
                    <span>{data.plans.find((p) => p.key === r.plan)?.label || r.plan}</span>
                    <Badge tone={r.status === 'approved' ? 'green' : 'red'}>
                      {r.status === 'approved' ? 'Freigeschaltet' : 'Abgelehnt'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
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
