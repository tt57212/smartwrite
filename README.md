# SmartWrite – KI-gestützte Rechtschreib- und Schreiblernplattform

Eine moderne Web-App zum Üben von Rechtschreibung und Schreiben – auf Deutsch, mit dunklem/hellem Design,
XP/Level-System, Belohnungen, Unteraccounts für Familien und einem Admin-Bereich.

## Features

- **Training:** Wörter, Sätze, Diktate und längere Texte – mit deutscher Text-to-Speech-Stimme.
- **Faire KI-Bewertung:** Phonetisch richtige Schreibweisen (z. B. „Fater" statt „Vater") werden erkannt
  und als „phonetisch richtig, aber falsch geschrieben" gewertet – mit Teilpunkten und Erklärung.
- **Schwierigkeitsstufen:** Anfänger, Leicht, Mittel, Schwer, Experte (im Admin-Bereich erweiterbar).
- **Personalisierung:** Eigene Wortlisten, Fehlerwort-Training, KI-generierte Übungen (OpenAI-kompatibel
  oder eingebauter Generator ohne API-Key).
- **Motivation:** XP, Level, tägliche Ziele, Serien, Belohnungen (Avatare, Designs).
- **Statistiken:** Dashboard mit Fortschritt, Wochenaktivität, Fehleranalyse, Lernverlauf.
- **Accounts:** Registrierung per E-Mail/Passwort, mehrere Profile (Unteraccounts) pro Login,
  Dark-/Light-Mode, responsive Design.
- **Admin-Bereich:** Benutzer/Profile verwalten, Inhalte & Stufen pflegen, Statistiken einsehen.
  Admin-Erkennung serverseitig über `ADMIN_EMAILS` (nie nur im Frontend).

## Architektur

```
src/                React-Frontend (Vite + TypeScript + Tailwind CSS v4)
functions/api/      Cloudflare Pages Functions (Hono) – REST-API
functions/_lib/     Auth (PBKDF2 + Sessions), Phonetik-Bewertung, KI-Interface
migrations/         D1-Datenbankschema + Seed (SQLite)
```

- **Frontend:** Statische SPA, gebaut mit Vite → `dist/`.
- **Backend:** Cloudflare Pages Functions (Serverless Worker), Hono-Routing.
- **Datenbank:** Cloudflare D1 (SQLite) mit Migrationen via Wrangler.
- **Auth:** Session-Cookies (HttpOnly), PBKDF2-Passwort-Hashing, serverseitige Rollenprüfung.
- **KI:** austauschbares Interface (`functions/_lib/ai.ts`) für OpenAI-kompatible APIs;
  ohne Key wird ein eingebauter heuristischer Generator genutzt.

## Lokale Entwicklung

Voraussetzung: Node.js 20+ und ein Cloudflare-Konto (kostenlos).

```bash
npm install
npm run build
npm run db:migrate:local   # Datenbankschema + Inhalte lokal anlegen
npm run dev:full           # App + API auf http://localhost:8788
```

> Hinweis: `wrangler pages dev` simuliert die D1-Datenbank lokal. Nach dem ersten Start einmal
> `npm run db:migrate:local` ausführen.

Optional: `.dev.vars.example` nach `.dev.vars` kopieren, um eine KI-API zu konfigurieren.

## Ersteinrichtung & Deployment (Schritt für Schritt)

### 1. GitHub-Konto & Repository

1. Gehe auf <https://github.com> und erstelle ein kostenloses Konto (falls noch nicht vorhanden).
2. Klicke oben rechts auf **„+" → „New repository"**.
3. Name z. B. `smartwrite`, auf **Public** oder **Private** stellen, **NICHT** „Add README"
   anhaken (die Datei existiert schon lokal), dann **„Create repository"**.

### 2. Projekt auf GitHub laden

Im Projektordner (`smartwrite`) in der PowerShell/Git-Bash:

```bash
git init
git add .
git commit -m "SmartWrite: Initial version"
git branch -M main
git remote add origin https://github.com/DEIN-BENUTZERNAME/smartwrite.git
git push -u origin main
```

> Beim Push fragt GitHub nach deinem Login. Empfohlen: einen **Personal Access Token**
> (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) →
> „repo"-Scope) als Passwort verwenden.

### 3. Cloudflare Pages (kostenlos, HTTPS inklusive)

1. Gehe auf <https://dash.cloudflare.com> und melde dich an (kostenloser Account).
2. Links im Menü: **„Workers & Pages" → „Create application" → „Pages" → „Upload assets"**
   (oder „Connect to Git" für Auto-Deploys – siehe Schritt 4).
3. Projektname z. B. `smartwrite` → du erhältst `https://smartwrite.pages.dev` mit HTTPS.

### 4. Mit GitHub verbinden (Auto-Deploy bei jedem Push)

1. In Cloudflare Pages: **„Connect to Git"** → GitHub autorisieren → Repository `smartwrite` wählen.
2. Build-Einstellungen:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Unter **„Environment variables"** (Settings → Variables and Secrets) ggf. ergänzen:
   - `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (optional, für KI-Funktionen)
   - `ADMIN_EMAILS` ist bereits in `wrangler.toml` hinterlegt.
4. Speichern → Cloudflare baut und veröffentlicht automatisch. Jeder weitere `git push`
   löst einen neuen Deploy aus.

### 5. Datenbank (D1) anlegen

1. Im Cloudflare-Dashboard: **„Workers & Pages" → D1 → „Create database"**,
   Name: `smartwrite-db`.
2. Die angezeigte **Database ID** in `wrangler.toml` bei `database_id` eintragen
   (ersetzt `REPLACE_WITH_YOUR_D1_DATABASE_ID`) und committen + pushen.
3. Migrationen auf die Remote-Datenbank anwenden (einmalig, lokal ausführen):

   ```bash
   npm run db:migrate
   ```

   Dafür ist die Cloudflare-CLI-Anmeldung nötig: `npx wrangler login`
   (öffnet Browser, einmalig).

> Wichtig: `wrangler.toml` wird von Cloudflare Pages automatisch erkannt –
> die D1-Bindung `DB` steht dann sowohl lokal als auch in Produktion zur Verfügung.

## Tägliche Nutzung

- **Neue Version veröffentlichen:** Code ändern → `git add . && git commit -m "..." && git push`
  → Cloudflare Pages baut automatisch neu.
- **Adresse ändern:** Cloudflare Pages → Project → **Custom domains** → eigene Domain eintragen
  (DNS-Eintrag bei deinem Domain-Anbieter nötig). Die `*.pages.dev`-Adresse bleibt bestehen.
- **Admin-Login:** Mit einer der in `ADMIN_EMAILS` eingetragenen Adressen registrieren/anmelden –
  die Admin-Rolle wird automatisch vergeben.

## Fehlerbehebung

- **„Interner Serverfehler" / `no such table`:** Migrationen fehlen → `npm run db:migrate:local`
  (lokal) bzw. `npm run db:migrate` (remote) ausführen.
- **Build schlägt fehl:** `npm ci` + `npm run typecheck` lokal ausführen, Fehler beheben.
- **Login funktioniert nicht:** Cookies werden nur über HTTPS bzw. `localhost` gesetzt –
  auf `127.0.0.1` testen oder deployen.
- **Cloudflare-Deploy rot:** Builds-Log im Dashboard prüfen; häufige Ursache: fehlende
  `database_id` in `wrangler.toml` oder nicht committete Dateien.
- **TTS kommt nicht:** Browser auf Deutsch-Stimmen prüfen (Chrome/Edge mit de-DE-Stimme);
  die App funktioniert auch ohne Audio.

## Sicherheit

- Passwörter werden mit PBKDF2 (100.000 Iterationen) gehasht – niemals im Klartext gespeichert.
- Sessions sind HttpOnly-Cookies mit 30 Tagen Gültigkeit, serverseitig in D1 gespeichert.
- Admin-Rechte werden bei **jeder** Anfrage serverseitig geprüft.
- API-Keys belong in Umgebungsvariablen (`.dev.vars` lokal, Cloudflare Secrets remote) –
  niemals ins Repository committen.
