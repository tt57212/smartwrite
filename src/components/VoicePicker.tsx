import { useEffect, useState } from 'react';
import { getGermanVoices, getPitchSetting, getRateSetting, getVoiceSetting, getVolumeSetting, setPitchSetting, setRateSetting, setVoiceSetting, setVolumeSetting, speak, type VoiceInfo } from '../lib/tts';
import { Select } from './ui';

/** Auswahl für deutsche TTS-Stimme und Tempo. */
export function VoicePicker({ compact = false, onChange }: { compact?: boolean; onChange?: () => void }) {
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voice, setVoice] = useState(getVoiceSetting());
  const [rate, setRate] = useState(getRateSetting());
  const [pitch, setPitch] = useState(getPitchSetting());
  const [volume, setVolume] = useState(getVolumeSetting());

  useEffect(() => {
    const load = () => setVoices(getGermanVoices());
    load();
    // Stimmen laden asynchron nach
    const t = setTimeout(load, 500);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => clearTimeout(t);
  }, []);

  const rateLabel = rate < 0.85 ? 'Langsam' : rate > 1.05 ? 'Schnell' : 'Normal';
  const pitchLabel = pitch < 0.9 ? 'Tief' : pitch > 1.1 ? 'Hoch' : 'Normal';
  const volLabel = volume < 0.5 ? 'Leise' : volume > 0.8 ? 'Laut' : 'Normal';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? '' : 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60'}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">🔊</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stimme</p>
          <Select
            value={voice}
            onChange={(e) => { setVoice(e.target.value); setVoiceSetting(e.target.value); onChange?.(); }}
            className="mt-0.5 w-52 py-1.5 text-xs"
          >
            <option value="">Automatisch (Deutsch)</option>
            {voices.map((v) => (
              <option key={v.uri + v.name} value={v.uri}>{v.name} ({v.lang})</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">⏩</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tempo: {rateLabel}</p>
          <input
            type="range" min={0.6} max={1.3} step={0.05} value={rate}
            onChange={(e) => { const r = parseFloat(e.target.value); setRate(r); setRateSetting(r); onChange?.(); }}
            className="mt-1 w-36 accent-indigo-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">🎚</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stimmlage: {pitchLabel}</p>
          <input
            type="range" min={0.5} max={1.5} step={0.05} value={pitch}
            onChange={(e) => { const p = parseFloat(e.target.value); setPitch(p); setPitchSetting(p); onChange?.(); }}
            className="mt-1 w-36 accent-indigo-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">🔈</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lautstärke: {volLabel}</p>
          <input
            type="range" min={0.1} max={1} step={0.05} value={volume}
            onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setVolumeSetting(v); onChange?.(); }}
            className="mt-1 w-36 accent-indigo-600"
          />
        </div>
      </div>

      <button
        onClick={() => speak('Hallo! So klingt deine gewählte Stimme.', { rate, pitch, volume })}
        className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
      >
        🔊 Testen
      </button>
    </div>
  );
}
