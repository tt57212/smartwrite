export function AGBPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-12">
        <h1 className="text-3xl font-extrabold">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="mt-1 text-sm text-slate-500">SmartWrite Premium · Stand: November 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 1 Geltungsbereich</h2>
            <p>Diese AGB gelten für die Nutzung von SmartWrite (https://smartwrite.pages.dev) sowie für alle Verträge über das Premium-Abo zwischen dir (Kunde) und via industries (Anbieter).</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 2 Leistungsumfang</h2>
            <p>SmartWrite ist eine Lernplattform zum Üben von Rechtschreibung und Schreiben. Das kostenlose Angebot umfasst 10 Übungsrunden pro Tag. SmartWrite Premium schaltet unbegrenzte Runden frei.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 3 Premium-Abo & Preise</h2>
            <ul className="list-inside list-disc space-y-1">
              <li>Monatstarif: 4,99 € pro Monat</li>
              <li>Jahrestarif: 49,99 € pro Jahr</li>
              <li>Alle Preise verstehen sich <strong>inklusive der gesetzlichen MwSt.</strong></li>
              <li>Das Abo verlängert sich nicht automatisch – es handelt sich um eine feste Laufzeit, die nach Ablauf endet.</li>
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 4 Vertragsschluss</h2>
            <p>Der Vertrag über das Premium-Abo kommt zustande, sobald deine Zahlung (Karte oder Überweisung) bei uns eingegangen und freigeschaltet ist. Bei Zahlung per Überweisung ist der Vertrag wirksam, sobald der Betrag auf unserem Konto verbucht wurde.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 5 Widerrufsrecht</h2>
            <p>
              Verbrauchern steht ein <strong>14-tägiges Widerrufsrecht</strong> zu. Da es sich bei SmartWrite Premium um die Bereitstellung digitaler Inhalte handelt,
              erlischt dein Widerrufsrecht vorzeitig, wenn du <strong>ausdrücklich zustimmst, dass der digitale Inhalt sofort bereitgestellt wird</strong>, und du mit deiner
              Bestellung bestätigst, dass du dein Widerrufsrecht mit Beginn der Bereitstellung verlierst (§ 356 Abs. 5 BGB).
            </p>
            <p className="mt-2">Widerrufserklärung an: via.industries.support@gmail.com</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 6 Zahlung</h2>
            <p>
              Zahlung per Kreditkarte (Stripe) oder per Überweisung. Bei Kartenzahlung wird der Betrag bei Vertragsbeginn belastet.
              Bei Überweisung ist die Zahlung mit Vertragsabschluss fällig.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 7 Verfügbarkeit & Änderungen</h2>
            <p>Wir bemühen uns um eine hohe Verfügbarkeit, übernehmen jedoch keine Garantie für eine unterbrechungsfreie Nutzung. Wir können Inhalte und Funktionen im Rahmen der Weiterentwicklung anpassen.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 8 Haftung</h2>
            <p>Die Haftung für Schäden ist auf die Höhe des von dir gezahlten Entgelts beschränkt, soweit gesetzlich zulässig. Für Schäden aus der Nutzung der Plattform haftet der Nutzer selbst.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 9 Kündigung</h2>
            <p>Da es sich um eine feste Laufzeit handelt, ist eine vorzeitige Kündigung nicht vorgesehen. Nach Ablauf des Zeitraums endet der Premium-Status automatisch. Eine Rückerstattung erfolgt nur, soweit gesetzlich vorgeschrieben oder im Einzelfall vereinbart.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">§ 10 Schlussbestimmungen</h2>
            <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit zulässig, der Wohnsitz des Anbieters.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
