export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-12">
        <h1 className="text-3xl font-extrabold">Datenschutzerklärung</h1>
        <p className="mt-1 text-sm text-slate-500">SmartWrite · Stand: November 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-2 text-lg font-bold">1. Verantwortlicher</h2>
            <p>Verantwortlich für die Datenverarbeitung ist der Betreiber von SmartWrite (via industries). Kontakt: via.industries.support@gmail.com</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">2. Welche Daten gespeichert werden</h2>
            <ul className="list-inside list-disc space-y-1">
              <li><strong>Account-Daten:</strong> E-Mail-Adresse, gehashtes Passwort, Anzeigename</li>
              <li><strong>Lernfortschritt:</strong> Übungsergebnisse, XP, Level, Fehlerwörter, Lernserien</li>
              <li><strong>Profile:</strong> Name, Avatar, Farbe, tägliches/wöchentliches Lernziel</li>
              <li><strong>Technisch:</strong> Session-Cookie (Login), Spracheinstellungen (Stimme/Tempo) lokal im Browser</li>
            </ul>
            <p className="mt-2">Es werden <strong>keine</strong> Tracking-Cookies, Werbe-Tracker oder Analyse-Tools von Drittanbietern eingesetzt.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">3. Cookies</h2>
            <p>SmartWrite verwendet ausschließlich ein essenzielles Session-Cookie (<code>sw_session</code>), das für die Anmeldung erforderlich ist. Es ist HttpOnly, wird nach 30 Tagen automatisch gelöscht und enthält keine Tracking-Informationen. Sprach- und Theme-Einstellungen werden lokal im Browser (localStorage) gespeichert.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">4. Sprachsynthese</h2>
            <p>Das Vorlesen der Übungsinhalte erfolgt direkt im Browser über die integrierte Sprachausgabe (Web Speech API). Dabei werden <strong>keine Audiodaten an unsere Server</strong> übertragen.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">5. Hosting & Datenbank</h2>
            <p>Die Anwendung läuft auf Cloudflare Pages, die Datenbank ist Cloudflare D1 (SQLite). Daten werden auf Servern der Cloudflare Inc. (USA) gespeichert. Mit der Nutzung stimmst du dieser Verarbeitung zu.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">6. Premium & Zahlungen</h2>
            <p>Bei Kauf von Premium per Überweisung werden Zahlungsdaten ausschließlich von deiner Bank verarbeitet – SmartWrite erhält nur die Information über den Zahlungseingang. Bei Kartenzahlung (falls aktiviert) erfolgt die Verarbeitung durch Stripe Inc. gemäß deren Datenschutzbestimmungen.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">7. Deine Rechte</h2>
            <p>Du kannst jederzeit Auskunft, Berichtigung oder Löschung deiner Daten verlangen. Kontaktiere uns unter via.industries.support@gmail.com. Eine Löschung des Accounts entfernt alle zugehörigen Daten (Profile, Fortschritt, Listen).</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">8. Kinder</h2>
            <p>Unteraccounts (Profile) sind für die Nutzung durch Kinder gedacht. Es werden keine Daten von Kindern an Dritte weitergegeben. Eltern/Erziehungsberechtigte sind für die Nutzung der Unteraccounts verantwortlich.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
