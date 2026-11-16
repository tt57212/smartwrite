import type { Env } from './util';

/**
 * Austauschbare KI-Schnittstelle.
 * Unterstützt OpenAI-kompatible Chat-Completion-APIs (OpenAI, Azure, Ollama, LM Studio, ...).
 * Konfiguration über Umgebungsvariablen:
 *   AI_API_KEY, AI_BASE_URL (z. B. https://api.openai.com/v1), AI_MODEL
 * Ohne Schlüssel liefert `isAIConfigured()` false und die App nutzt
 * eingebaute heuristische Generatoren (funktionieren ohne externe Kosten).
 */

export function isAIConfigured(env: Env): boolean {
  return !!(env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL);
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(env: Env, messages: ChatMessage[], jsonMode = true): Promise<string | null> {
  if (!isAIConfigured(env)) return null;
  try {
    const res = await fetch(`${env.AI_BASE_URL!.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
        temperature: 0.7,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Generiert deutsche Rechtschreibübungen als JSON. */
export async function generateExercises(
  env: Env,
  opts: { difficulty: string; count: number; focus?: string[]; mode?: string; instructions?: string }
): Promise<{ type: 'word' | 'sentence'; text: string }[] | null> {
  const focus = opts.focus?.length ? `Schwerpunktwörter: ${opts.focus.join(', ')}. ` : '';
  const custom = opts.instructions ? `\nZusätzliche Anweisungen des Lehrers: ${opts.instructions}` : '';
  const content = await chat(env, [
    {
      role: 'system',
      content:
        'Du bist ein deutscher Rechtschreibtrainer. Antworte NUR mit JSON: {"items":[{"type":"word"|"sentence","text":"..."}]}. Keine Erklärungen.',
    },
    {
      role: 'user',
      content: `Erstelle ${opts.count} deutsche Rechtschreibübungen auf Niveau "${opts.difficulty}". ${focus}Verwende typische deutsche Rechtschreibfallen (ie/ei, ss/ß, Umlauts, ch). Wörter kurz, Sätze einfach.${custom}`,
    },
  ]);
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { items?: { type?: string; text?: string }[] };
    const items = (parsed.items || [])
      .filter((i) => i.text && (i.type === 'word' || i.type === 'sentence'))
      .map((i) => ({ type: i.type as 'word' | 'sentence', text: String(i.text).trim() }))
      .slice(0, opts.count);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/** Erstellt ein persönliches Feedback zu den Fehlern eines Profils. */
export async function analyzeErrors(
  env: Env,
  opts: { name: string; mistakes: { word: string; count: number }[]; avgGrade: number | null; level: number; instructions?: string }
): Promise<{ summary: string; tips: string[]; recommendation: string } | null> {
  const mistakeText = opts.mistakes.length
    ? opts.mistakes.map((m) => `${m.word} (${m.count}×)`).join(', ')
    : 'keine';
  const content = await chat(
    env,
    [
      {
        role: 'system',
        content:
          'Du bist ein freundlicher deutscher Lehrer. Antworte NUR mit JSON: {"summary":"...","tips":["..."],"recommendation":"..."}. Kurz, motivierend, auf Deutsch.',
      },
      {
        role: 'user',
        content: `Schüler: ${opts.name}, Level ${opts.level}, Ø Note ${opts.avgGrade ?? 'k. A.'}. Häufigste Fehlerwörter: ${mistakeText}. Gib eine kurze Fehleranalyse, 3 konkrete Tipps und eine Übungsempfehlung.${opts.instructions ? `\nZusätzliche Anweisungen des Lehrers: ${opts.instructions}` : ''}`,
      },
    ],
    true
  );
  if (!content) return null;
  try {
    const p = JSON.parse(content) as { summary?: string; tips?: string[]; recommendation?: string };
    if (!p.summary) return null;
    return { summary: p.summary, tips: (p.tips || []).slice(0, 5), recommendation: p.recommendation || '' };
  } catch {
    return null;
  }
}
