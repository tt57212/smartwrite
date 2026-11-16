// Deutsche Phonetik-Vereinfachung + Levenshtein für die faire Bewertung:
// Wer ein Wort so schreibt, wie er es hört (z. B. "Fater" statt "Vater"),
// bekommt die Unterscheidung "phonetisch richtig, aber falsch geschrieben".

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:„“"'’()\[\]<>…]/g, '')
    .replace(/-/g, ' ')
    .trim();
}

/** Vereinfachte deutschen Lautschrift: bildet Buchstaben auf approximierte Laute ab. */
export function germanPhonetic(s: string): string {
  let t = normalize(s);
  const reps: [RegExp, string][] = [
    [/äu/g, 'oy'], [/eu/g, 'oy'], [/au/g, 'au'],
    [/ei/g, 'a'], [/ie/g, 'i'],
    [/sch/g, 'x'], [/ch/g, 'x'], [/ck/g, 'k'],
    [/qu/g, 'kv'], [/pf/g, 'pf'], [/tz/g, 'ts'],
    [/v/g, 'f'], [/w/g, 'v'], [/z/g, 'ts'], [/j/g, 'y'], [/y/g, 'i'],
    [/ß/g, 's'], [/ä/g, 'e'], [/ö/g, 'o'], [/ü/g, 'u'],
  ];
  for (const [re, to] of reps) t = t.replace(re, to);
  // Doppelkonsonanten zusammenfassen (phonetisch meist ein Laut)
  t = t.replace(/(.)\1+/g, '$1');
  return t.replace(/[^a-z ]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

export type Verdict = 'correct' | 'phonetic' | 'wrong' | 'unclear';

/**
 * Bewertet eine Antwort auf ein diktiertes Wort/einen Satz.
 * Gibt ein Verdict plus den phonetischen Abstand zurück.
 */
export function gradeText(expected: string, given: string): { verdict: Verdict; distance: number } {
  const e = normalize(expected);
  const g = normalize(given);
  if (!g) return { verdict: 'unclear', distance: 999 };
  if (e === g) return { verdict: 'correct', distance: 0 };

  const ep = germanPhonetic(e);
  const gp = germanPhonetic(g);
  const d = levenshtein(ep, gp);
  const len = Math.max(ep.length, gp.length, 1);
  const threshold = Math.max(1, Math.floor(len * 0.3));

  if (d <= threshold) return { verdict: 'phonetic', distance: d };

  // "Nicht eindeutig erkennbar": fast keine Laute gemeinsam und sehr großer Abstand
  const shared = [...new Set(ep.split(''))].filter((c) => gp.includes(c)).length;
  if (d > len * 0.9 && shared <= 1) return { verdict: 'unclear', distance: d };
  return { verdict: 'wrong', distance: d };
}

/** Zerlegt Text in Wörter (für Listen und Wortstatistiken). */
export function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'Richtig geschrieben',
  phonetic: 'Phonetisch richtig, aber falsch geschrieben',
  wrong: 'Falsches Wort',
  unclear: 'Nicht eindeutig erkennbar',
};

export function verdictLabel(v: Verdict): string {
  return VERDICT_LABEL[v];
}
