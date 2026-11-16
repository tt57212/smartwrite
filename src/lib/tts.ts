/** Text-to-Speech mit deutscher Stimme (Web Speech API). */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() || [];
  cachedVoice =
    voices.find((v) => v.lang === 'de-DE') ||
    voices.find((v) => v.lang.startsWith('de')) ||
    null;
  return cachedVoice;
}

// Stimmen werden asynchron geladen
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): void {
  if (!isTTSSupported()) { opts.onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'de-DE';
  utter.rate = opts.rate ?? 0.92;
  utter.pitch = 1;
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  if (opts.onEnd) {
    utter.onend = opts.onEnd;
    utter.onerror = opts.onEnd;
  }
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}
