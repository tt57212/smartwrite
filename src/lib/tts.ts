/** Text-to-Speech mit deutscher Stimme (Web Speech API) + Stimmauswahl. */

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  localService: boolean;
}

const VOICE_KEY = 'sw_voice';
const RATE_KEY = 'sw_rate';

let voicesCache: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { voicesCache = []; refreshVoices(); };
  refreshVoices();
}

/** Alle verfügbaren deutschen Stimmen (oder alle, wenn keine de-Stimme existiert). */
export function getGermanVoices(): VoiceInfo[] {
  const all = refreshVoices();
  const de = all.filter((v) => v.lang.toLowerCase().startsWith('de'));
  const list = de.length ? de : all;
  return list.map((v) => ({
    uri: v.voiceURI,
    name: v.name.replace(/^Microsoft\s*/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim() || v.name,
    lang: v.lang,
    localService: v.localService,
  }));
}

export function getVoiceSetting(): string {
  return localStorage.getItem(VOICE_KEY) || '';
}

export function setVoiceSetting(uri: string): void {
  if (uri) localStorage.setItem(VOICE_KEY, uri);
  else localStorage.removeItem(VOICE_KEY);
}

export function getRateSetting(): number {
  const r = parseFloat(localStorage.getItem(RATE_KEY) || '');
  return Number.isFinite(r) ? r : 0.92;
}

export function setRateSetting(rate: number): void {
  localStorage.setItem(RATE_KEY, String(rate));
}

function resolveVoice(): SpeechSynthesisVoice | null {
  const all = refreshVoices();
  if (!all.length) return null;
  const wanted = getVoiceSetting();
  if (wanted) {
    const found = all.find((v) => v.voiceURI === wanted || v.name === wanted);
    if (found) return found;
  }
  return (
    all.find((v) => v.lang === 'de-DE') ||
    all.find((v) => v.lang.toLowerCase().startsWith('de')) ||
    null
  );
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): void {
  if (!isTTSSupported()) { opts.onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'de-DE';
  utter.rate = opts.rate ?? getRateSetting();
  utter.pitch = 1;
  const voice = resolveVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }
  if (opts.onEnd) {
    utter.onend = opts.onEnd;
    utter.onerror = opts.onEnd;
  }
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}
