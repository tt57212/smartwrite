export function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-12">
        <h1 className="text-3xl font-extrabold">Impressum</h1>
        <p className="mt-1 text-sm text-slate-500">Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-2 text-lg font-bold">Angaben gemäß § 5 DDG</h2>
            <p>
              <strong>Vincent Telsen</strong><br />
              via industries<br />
              {/* TODO: Straße und PLZ vom Betreiber eintragen */}
              [Straße und Hausnummer]<br />
              [PLZ Ort]<br />
              Deutschland
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">Kontakt</h2>
            <p>
              E-Mail: <a className="text-indigo-600 underline dark:text-indigo-400" href="mailto:via.industries.support@gmail.com">via.industries.support@gmail.com</a><br />
              Website: <a className="text-indigo-600 underline dark:text-indigo-400" href="https://smartwrite.pages.dev">https://smartwrite.pages.dev</a>
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            <p>Vincent Telsen, via industries – Kontakt wie oben.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold">Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a className="text-indigo-600 underline dark:text-indigo-400" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr</a>.
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
            <p className="mt-2">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
