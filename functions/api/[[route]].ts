import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../_lib/util';
import {
  uid, hashPassword, verifyPassword, isAdminEmail, sessionCookie, clearCookie,
  levelForXp, gradeForPercent, jsonError,
} from '../_lib/util';
import { createSession, getAuth, requireAuth, requireAdmin, publicUser, type Auth } from '../_lib/auth';
import { gradeText, tokenize, verdictLabel, type Verdict } from '../_lib/phonetic';
import { isAIConfigured, generateExercises, analyzeErrors } from '../_lib/ai';

type C = { Bindings: Env; Variables: { auth?: Auth } };

const app = new Hono<C>().basePath('/api');

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error('API-Fehler:', err);
  return c.json({ error: 'Interner Serverfehler' }, 500);
});

// ---------- Helpers ----------

function mePayload(auth: Auth, env: Env) {
  const { level, into, needed } = levelForXp(auth.profile.xp);
  return {
    user: publicUser(auth, env),
    profile: auth.profile,
    isAdmin: auth.user.role === 'admin' || isAdminEmail(auth.user.email, env),
    level: { level, xpInto: into, xpNeeded: needed, xp: auth.profile.xp },
  };
}

async function firstProfileId(env: Env, userId: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT id FROM profiles WHERE user_id = ? ORDER BY created_at LIMIT 1')
    .bind(userId).first<{ id: string }>();
  return row?.id ?? null;
}

const MODE_TYPE: Record<string, string> = {
  word: 'word',
  sentence: 'sentence',
  dictation: 'sentence',
  text: 'text',
};

const POINTS: Record<string, number> = { word: 10, sentence: 30, text: 5 };
const DIFF_MULT: Record<string, number> = {
  anfaenger: 1, leicht: 1.2, mittel: 1.5, schwer: 2, experte: 2.5,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function feedbackFor(verdict: Verdict, expected: string, given: string): string {
  switch (verdict) {
    case 'correct': return 'Richtig!';
    case 'phonetic':
      return `Fast! „${given.trim()}" klingt wie das gesuchte Wort, geschrieben wird es aber: ${expected}`;
    case 'wrong': return `Das gesuchte Wort war: ${expected}`;
    default: return `Nicht eindeutig erkannt. Gesucht war: ${expected}`;
  }
}

// ================= AUTH =================

app.post('/register', async (c) => {
  const { email, password, name } = await c.req.json<{ email?: string; password?: string; name?: string }>();
  const mail = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return jsonError(c, 'Bitte eine gültige E-Mail-Adresse eingeben.');
  if (!password || password.length < 8) return jsonError(c, 'Das Passwort muss mindestens 8 Zeichen lang sein.');

  const env = c.env;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(mail).first();
  if (existing) return jsonError(c, 'Diese E-Mail-Adresse ist bereits registriert.', 409);

  const passwordHash = await hashPassword(password);
  const userId = uid();
  const role = isAdminEmail(mail, env) ? 'admin' : 'user';
  await env.DB.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .bind(userId, mail, passwordHash, role).run();

  const profileId = uid();
  const profileName = (name || '').trim() || mail.split('@')[0];
  await env.DB.prepare('INSERT INTO profiles (id, user_id, name) VALUES (?, ?, ?)')
    .bind(profileId, userId, profileName).run();

  const token = await createSession(env, userId, profileId);
  const secure = c.req.url.startsWith('https://');
  c.header('Set-Cookie', sessionCookie(token, secure));

  const auth: Auth = {
    user: { id: userId, email: mail, role, settings: {} },
    profile: {
      id: profileId, user_id: userId, name: profileName, avatar: 'star', color: 'indigo',
      daily_goal_xp: 100, xp: 0, streak: 0, best_streak: 0, last_active_date: null,
      total_rounds: 0, total_correct: 0, total_answers: 0, grade_sum: 0, grade_count: 0,
      created_at: new Date().toISOString(),
    },
    sessionToken: token,
  };
  return c.json(mePayload(auth, env), 201);
});

app.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  const mail = (email || '').trim().toLowerCase();
  const env = c.env;

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(mail)
    .first<{ id: string; email: string; password_hash: string; role: string; settings: string }>();
  if (!user || !(await verifyPassword(password || '', user.password_hash))) {
    return jsonError(c, 'E-Mail oder Passwort ist falsch.', 401);
  }

  let role = user.role;
  if (role !== 'admin' && isAdminEmail(mail, env)) {
    role = 'admin';
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
  }

  const profileId = await firstProfileId(env, user.id);
  const token = await createSession(env, user.id, profileId);
  const secure = c.req.url.startsWith('https://');
  c.header('Set-Cookie', sessionCookie(token, secure));

  const profile = profileId
    ? await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profileId).first<NonNullable<Auth['profile']>>()
    : null;
  const auth: Auth = {
    user: { id: user.id, email: user.email, role, settings: JSON.parse(user.settings || '{}') },
    profile: profile!,
    sessionToken: token,
  };
  return c.json(mePayload(auth, env));
});

app.post('/logout', async (c) => {
  const auth = await getAuth(c);
  if (auth) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.sessionToken).run();
  const secure = c.req.url.startsWith('https://');
  c.header('Set-Cookie', clearCookie(secure));
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const auth = await requireAuth(c);
  return c.json(mePayload(auth, c.env));
});

app.patch('/me', async (c) => {
  const auth = await requireAuth(c);
  const body = await c.req.json<{ settings?: Record<string, unknown> }>();
  const merged = { ...auth.user.settings, ...(body.settings || {}) };
  await c.env.DB.prepare('UPDATE users SET settings = ? WHERE id = ?')
    .bind(JSON.stringify(merged), auth.user.id).run();
  return c.json({ ok: true, settings: merged });
});

// ================= PROFILE / UNTERACCOUNTS =================

app.get('/profiles', async (c) => {
  const auth = await requireAuth(c);
  const { results } = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at')
    .bind(auth.user.id).all();
  return c.json({ profiles: results, activeId: auth.profile.id });
});

app.post('/profiles', async (c) => {
  const auth = await requireAuth(c);
  const { name, avatar, color, dailyGoalXp } = await c.req.json<{
    name?: string; avatar?: string; color?: string; dailyGoalXp?: number;
  }>();
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM profiles WHERE user_id = ?')
    .bind(auth.user.id).first<{ n: number }>();
  if ((count?.n || 0) >= 8) return jsonError(c, 'Maximal 8 Profile pro Account.');
  const id = uid();
  await c.env.DB.prepare('INSERT INTO profiles (id, user_id, name, avatar, color, daily_goal_xp) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, auth.user.id, (name || 'Neues Profil').trim() || 'Neues Profil',
      avatar || 'star', color || 'indigo', Math.min(Math.max(dailyGoalXp || 100, 10), 1000)).run();
  return c.json({ ok: true, id }, 201);
});

app.patch('/profiles/:id', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id).first<{ id: string }>();
  if (!profile) return jsonError(c, 'Profil nicht gefunden.', 404);
  const body = await c.req.json<{
    name?: string; avatar?: string; color?: string; dailyGoalXp?: number; theme?: string;
  }>();
  await c.env.DB.prepare(
    'UPDATE profiles SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), color = COALESCE(?, color), daily_goal_xp = COALESCE(?, daily_goal_xp) WHERE id = ?'
  ).bind(body.name ?? null, body.avatar ?? null, body.color ?? null,
    body.dailyGoalXp ? Math.min(Math.max(body.dailyGoalXp, 10), 1000) : null, id).run();
  return c.json({ ok: true });
});

app.delete('/profiles/:id', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  if (id === auth.profile.id) return jsonError(c, 'Das aktive Profil kann nicht gelöscht werden.');
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id).first<{ id: string }>();
  if (!profile) return jsonError(c, 'Profil nicht gefunden.', 404);
  await c.env.DB.prepare('DELETE FROM profiles WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.post('/profiles/:id/switch', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id).first<{ id: string }>();
  if (!profile) return jsonError(c, 'Profil nicht gefunden.', 404);
  await c.env.DB.prepare('UPDATE sessions SET profile_id = ? WHERE token = ?').bind(id, auth.sessionToken).run();
  const fresh = await c.env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first<NonNullable<Auth['profile']>>();
  return c.json(mePayload({ ...auth, profile: fresh! }, c.env));
});

// ================= META =================

app.get('/meta', async (c) => {
  const { results: levels } = await c.env.DB.prepare('SELECT * FROM difficulty_levels ORDER BY sort_order').all();
  const { results: rewards } = await c.env.DB.prepare('SELECT * FROM rewards ORDER BY sort_order').all();
  return c.json({
    difficulties: levels,
    rewards,
    avatars: ['star', 'rocket', 'bot', 'wand', 'cat', 'dog', 'panda', 'alien'],
    colors: ['indigo', 'emerald', 'rose', 'amber', 'sky', 'violet'],
    modes: [
      { key: 'word', label: 'Wörter', desc: 'Einzelne Wörter hören und schreiben' },
      { key: 'sentence', label: 'Sätze', desc: 'Ganze Sätze anhören und schreiben' },
      { key: 'dictation', label: 'Diktat', desc: 'Sätze als klassisches Diktat' },
      { key: 'text', label: 'Text', desc: 'Längere Texte hören und schreiben' },
    ],
    aiConfigured: isAIConfigured(c.env),
  });
});

// ================= RUNDEN =================

app.post('/rounds', async (c) => {
  const auth = await requireAuth(c);
  const body = await c.req.json<{
    mode?: string; difficulty?: string; count?: number; listId?: string;
    weakOnly?: boolean; focusWords?: string[];
  }>();
  const mode = body.mode || 'word';
  const type = MODE_TYPE[mode];
  if (!type) return jsonError(c, 'Ungültiger Modus.');
  const count = Math.min(Math.max(body.count || 10, 1), mode === 'text' ? 3 : 50);
  const env = c.env;

  let candidates: { ref_type: string; ref_id: number; prompt: string; answer: string; difficulty: string | null }[] = [];

  if (body.listId) {
    const list = await env.DB.prepare('SELECT id FROM word_lists WHERE id = ? AND profile_id = ?')
      .bind(body.listId, auth.profile.id).first<{ id: string }>();
    if (!list) return jsonError(c, 'Liste nicht gefunden.', 404);
    const { results } = await env.DB.prepare('SELECT * FROM list_items WHERE list_id = ?')
      .bind(body.listId).all<{ id: number; type: string; text: string; difficulty: string | null }>();
    candidates = results
      .filter((r) => r.type === type || (mode === 'dictation' && r.type === 'sentence'))
      .map((r) => ({ ref_type: 'list_item', ref_id: r.id, prompt: r.text, answer: r.text, difficulty: r.difficulty }));
  } else if (body.weakOnly) {
    // Schwache Wörter aus den Statistiken priorisieren
    const { results: stats } = await env.DB.prepare(
      `SELECT word, display, wrong_count + phonetic_count AS errors FROM word_stats
       WHERE profile_id = ? AND (wrong_count + phonetic_count) > 0
       ORDER BY errors DESC LIMIT ?`
    ).bind(auth.profile.id, count * 3).all<{ word: string; display: string }>();
    const words = stats.map((s) => s.display);
    if (!words.length) return jsonError(c, 'Noch keine Fehlerdaten vorhanden – starte eine normale Runde.');
    const placeholders = words.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, text FROM content_items WHERE type = 'word' AND text IN (${placeholders})`
    ).bind(...words).all<{ id: number; text: string }>();
    candidates = results.map((r) => ({ ref_type: 'content', ref_id: r.id, prompt: r.text, answer: r.text, difficulty: null }));
  } else {
    const diff = body.difficulty && body.difficulty !== 'gemischt' ? body.difficulty : null;
    const q = diff
      ? env.DB.prepare("SELECT id, text FROM content_items WHERE type = ? AND difficulty = ?")
          .bind(type, diff)
      : env.DB.prepare('SELECT id, text FROM content_items WHERE type = ?').bind(type);
    const { results } = await q.all<{ id: number; text: string }>();
    candidates = results.map((r) => ({
      ref_type: 'content', ref_id: r.id, prompt: r.text, answer: r.text,
      difficulty: diff,
    }));
  }

  if (!candidates.length) return jsonError(c, 'Keine Übungen für diese Auswahl gefunden.', 404);
  const chosen = shuffle(candidates).slice(0, count);

  const roundId = uid();
  const config = JSON.stringify({ mode, difficulty: body.difficulty || 'gemischt', count: chosen.length });
  await env.DB.prepare('INSERT INTO rounds (id, profile_id, mode, config, item_count) VALUES (?, ?, ?, ?, ?)')
    .bind(roundId, auth.profile.id, mode, config, chosen.length).run();

  const stmts = chosen.map((item, i) =>
    env.DB.prepare('INSERT INTO round_items (round_id, ref_type, ref_id, prompt, answer, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(roundId, item.ref_type, item.ref_id, item.prompt, item.answer, i)
  );
  await env.DB.batch(stmts);

  const { results: savedItems } = await env.DB.prepare(
    'SELECT id, prompt, sort_order FROM round_items WHERE round_id = ? ORDER BY sort_order'
  ).bind(roundId).all<{ id: number; prompt: string; sort_order: number }>();

  return c.json({
    roundId,
    mode,
    count: chosen.length,
    items: savedItems.map((i) => ({ itemId: i.id, prompt: i.prompt, index: i.sort_order })),
  });
});

app.get('/rounds/:id', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const round = await c.env.DB.prepare('SELECT * FROM rounds WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first<Record<string, unknown>>();
  if (!round) return jsonError(c, 'Runde nicht gefunden.', 404);
  const { results: items } = await c.env.DB.prepare(
    'SELECT id, prompt, answer, sort_order FROM round_items WHERE round_id = ? ORDER BY sort_order'
  ).bind(id).all<{ id: number; prompt: string; answer: string; sort_order: number }>();
  let answers: Record<number, { given: string; verdict: string; points: number; max_points: number; feedback: string | null }> = {};
  if (round.status === 'finished') {
    const { results: ans } = await c.env.DB.prepare(
      'SELECT item_id, given, verdict, points, max_points, feedback FROM answers WHERE round_id = ?'
    ).bind(id).all();
    for (const a of ans as { item_id: number; given: string; verdict: string; points: number; max_points: number; feedback: string | null }[]) {
      answers[a.item_id] = a;
    }
  }
  return c.json({ round, items, answers });
});

app.post('/rounds/:id/submit', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const env = c.env;

  const round = await env.DB.prepare('SELECT * FROM rounds WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first<{ id: string; mode: string; status: string; profile_id: string }>();
  if (!round) return jsonError(c, 'Runde nicht gefunden.', 404);
  if (round.status === 'finished') return jsonError(c, 'Diese Runde wurde bereits abgegeben.');

  const { answers: givenAnswers } = await c.req.json<{
    answers: { itemId: number; given: string }[];
  }>();
  const givenMap = new Map((givenAnswers || []).map((a) => [a.itemId, a.given ?? '']));

  const { results: items } = await env.DB.prepare(
    'SELECT id, prompt, answer, sort_order FROM round_items WHERE round_id = ? ORDER BY sort_order'
  ).bind(id).all<{ id: number; prompt: string; answer: string; sort_order: number }>();

  // Schwierigkeits-Multiplikator aus der Config
  let diffKey = 'mittel';
  try {
    const cfg = JSON.parse((round as { config?: string }).config || '{}');
    if (cfg.difficulty && DIFF_MULT[cfg.difficulty]) diffKey = cfg.difficulty;
  } catch { /* ignore */ }
  const mult = DIFF_MULT[diffKey] ?? 1;
  const isText = round.mode === 'text';

  interface ItemResult {
    itemId: number; prompt: string; expected: string; given: string;
    verdict: Verdict; points: number; maxPoints: number; feedback: string;
  }
  const results: ItemResult[] = [];
  const wordStatUpdates = new Map<string, { display: string; verdict: Verdict }>();

  for (const item of items) {
    const given = givenMap.get(item.id) ?? '';
    const base = (POINTS[wordType(round.mode)] ?? 10) * mult;
    // Text-Items: wortweise Bewertung
    let verdict: Verdict;
    let points: number;
    let maxPoints: number;
    if (isText) {
      const expWords = tokenize(item.answer);
      const gotWords = tokenize(given);
      maxPoints = expWords.length * POINTS.text * mult;
      let earned = 0;
      let correctW = 0, phonW = 0, wrongW = 0;
      expWords.forEach((w, i) => {
        const g = gotWords[i] ?? '';
        const r = gradeText(w, g);
        const wPoints = r.verdict === 'correct' ? POINTS.text * mult : r.verdict === 'phonetic' ? POINTS.text * mult * 0.6 : 0;
        earned += wPoints;
        if (r.verdict === 'correct') correctW++;
        else if (r.verdict === 'phonetic') phonW++;
        else wrongW++;
        // Wortstatistik für längere Wörter pflegen
        if (w.length >= 4 && /^[a-zäöüß]+$/.test(w)) {
          const key = w;
          const prev = wordStatUpdates.get(key);
          const score = r.verdict === 'correct' ? 2 : r.verdict === 'phonetic' ? 1 : 0;
          if (!prev || score < (prev.verdict === 'correct' ? 2 : prev.verdict === 'phonetic' ? 1 : 0)) {
            wordStatUpdates.set(key, { display: w, verdict: r.verdict });
          }
        }
      });
      points = Math.round(earned);
      verdict = points >= maxPoints * 0.9 ? 'correct' : points >= maxPoints * 0.6 ? 'phonetic' : points > 0 ? 'wrong' : 'unclear';
      const fb = `Text: ${correctW} Wörter richtig, ${phonW} klangen richtig, ${wrongW} waren falsch. Korrektur: ${item.answer.slice(0, 120)}${item.answer.length > 120 ? '…' : ''}`;
      results.push({ itemId: item.id, prompt: item.prompt, expected: item.answer, given, verdict, points, maxPoints, feedback: fb });
      continue;
    }

    const g = gradeText(item.answer, given);
    verdict = g.verdict;
    maxPoints = Math.round(base);
    points = verdict === 'correct' ? maxPoints : verdict === 'phonetic' ? Math.round(maxPoints * 0.6) : 0;

    // Wortstatistik: einzelne Wörter in Sätzen/Diktaten ebenfalls auswerten
    if (round.mode !== 'word') {
      const expTokens = tokenize(item.answer).filter((t) => t.length >= 4 && /^[a-zäöüß]+$/.test(t));
      const gotTokens = tokenize(given);
      const gotSet = new Set(gotTokens);
      const rank: Record<Verdict, number> = { correct: 2, phonetic: 1, wrong: 0, unclear: 0 };
      for (const tok of expTokens) {
        const v: Verdict = gotSet.has(tok) ? 'correct' : phonetischNahe(tok, gotSet) ? 'phonetic' : 'wrong';
        const prev = wordStatUpdates.get(tok);
        if (!prev || rank[v] < rank[prev.verdict]) {
          wordStatUpdates.set(tok, { display: capitalizeLike(tok, item.answer), verdict: v });
        }
      }
    } else {
      const w = item.answer.trim();
      if (/^[^ ]+$/.test(w) && w.length >= 2) {
        wordStatUpdates.set(w.toLowerCase(), { display: w, verdict });
      }
    }

    results.push({
      itemId: item.id, prompt: item.prompt, expected: item.answer, given,
      verdict, points, maxPoints,
      feedback: feedbackFor(verdict, item.answer, given),
    });
  }

  const score = results.reduce((s, r) => s + r.points, 0);
  const maxScore = results.reduce((s, r) => s + r.maxPoints, 0);
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  const grade = gradeForPercent(percent);
  const correctCount = results.filter((r) => r.verdict === 'correct').length;
  const gradeNum = parseFloat(grade);

  // DB aktualisieren
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      "UPDATE rounds SET status='finished', score=?, max_score=?, percent=?, grade=?, finished_at=datetime('now') WHERE id=?"
    ).bind(score, maxScore, percent, grade, id),
  ];
  for (const r of results) {
    stmts.push(env.DB.prepare(
      'INSERT INTO answers (round_id, item_id, given, verdict, points, max_points, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, r.itemId, r.given, r.verdict, r.points, r.maxPoints, r.feedback));
  }
  // word_stats Upserts
  for (const [key, val] of wordStatUpdates) {
    const inc = { correct: 'correct_count', phonetic: 'phonetic_count', wrong: 'wrong_count', unclear: 'unclear_count' }[val.verdict];
    stmts.push(env.DB.prepare(
      `INSERT INTO word_stats (profile_id, word, display, ${inc}, last_verdict, updated_at)
       VALUES (?, ?, ?, 1, ?, datetime('now'))
       ON CONFLICT(profile_id, word) DO UPDATE SET ${inc} = ${inc} + 1, display = excluded.display, last_verdict = excluded.last_verdict, updated_at = excluded.updated_at`
    ).bind(auth.profile.id, key, val.display, val.verdict));
  }
  await env.DB.batch(stmts);

  // Profil-Fortschritt: XP, Serie, Statistiken
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
  const p = auth.profile;
  let streak = p.streak;
  if (p.last_active_date !== today) {
    streak = p.last_active_date === yesterday ? p.streak + 1 : 1;
  }
  const newXp = p.xp + score;
  const { level } = levelForXp(newXp);
  await env.DB.prepare(
    `UPDATE profiles SET xp=?, streak=?, best_streak=MAX(best_streak, ?), last_active_date=?,
     total_rounds=total_rounds+1, total_answers=total_answers+?, total_correct=total_correct+?,
     grade_sum=grade_sum+?, grade_count=grade_count+1 WHERE id=?`
  ).bind(newXp, streak, streak, today, results.length, correctCount, gradeNum, p.id).run();

  // Belohnungen prüfen
  const unlocked = await checkRewards(env, p.id, {
    xp: newXp, level, streak, rounds: p.total_rounds + 1, percent,
  });

  return c.json({
    roundId: id, mode: round.mode,
    results: results.map((r) => ({
      itemId: r.itemId, prompt: r.prompt, expected: r.expected, given: r.given,
      verdict: r.verdict, verdictLabel: verdictLabel(r.verdict),
      points: r.points, maxPoints: r.maxPoints, feedback: r.feedback,
    })),
    score, maxScore, percent, grade,
    correctCount, totalCount: results.length,
    xpGained: score,
    level: { level, xp: newXp },
    streak,
    unlockedRewards: unlocked,
  });
});

function wordType(mode: string): string {
  return mode === 'word' ? 'word' : mode === 'text' ? 'text' : 'sentence';
}

function capitalizeLike(tok: string, source: string): string {
  const idx = source.toLowerCase().indexOf(tok);
  if (idx >= 0 && idx + tok.length < source.length && /[A-ZÄÖÜ]/.test(source[idx])) {
    return source[idx].toUpperCase() + source.slice(idx + 1, idx + tok.length + 1);
  }
  return tok;
}

function phonetischNahe(tok: string, got: Set<string>): boolean {
  for (const g of got) {
    const r = gradeText(tok, g);
    if (r.verdict === 'phonetic') return true;
  }
  return false;
}

async function checkRewards(
  env: Env,
  profileId: string,
  stats: { xp: number; level: number; streak: number; rounds: number; percent: number }
): Promise<{ id: string; name: string; description: string; icon: string }[]> {
  const { results: rewards } = await env.DB.prepare('SELECT * FROM rewards').all<{
    id: string; name: string; description: string; icon: string;
    condition_type: string; condition_value: number;
  }>();
  const { results: unlocked } = await env.DB.prepare('SELECT reward_id FROM unlocked_rewards WHERE profile_id = ?')
    .bind(profileId).all<{ reward_id: string }>();
  const has = new Set(unlocked.map((u) => u.reward_id));
  const newly: typeof rewards = [];

  for (const r of rewards) {
    if (has.has(r.id)) continue;
    let ok = false;
    switch (r.condition_type) {
      case 'xp': ok = stats.xp >= r.condition_value; break;
      case 'level': ok = stats.level >= r.condition_value; break;
      case 'streak': ok = stats.streak >= r.condition_value; break;
      case 'rounds': ok = stats.rounds >= r.condition_value; break;
      case 'grade': ok = stats.percent >= r.condition_value; break;
    }
    if (ok) {
      await env.DB.prepare('INSERT OR IGNORE INTO unlocked_rewards (profile_id, reward_id) VALUES (?, ?)')
        .bind(profileId, r.id).run();
      newly.push(r);
    }
  }
  return newly.map((r) => ({ id: r.id, name: r.name, description: r.description, icon: r.icon }));
}

// ================= STATISTIKEN =================

app.get('/stats', async (c) => {
  const auth = await requireAuth(c);
  const env = c.env;
  const pid = auth.profile.id;

  const todayRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(a.points),0) AS xp FROM answers a
     JOIN rounds r ON r.id = a.round_id
     WHERE r.profile_id = ? AND date(a.created_at) = date('now')`
  ).bind(pid).first<{ xp: number }>();

  const { results: weekly } = await env.DB.prepare(
    `SELECT date(r.finished_at) AS day, COUNT(*) AS rounds, ROUND(AVG(r.percent),1) AS avgPercent
     FROM rounds r WHERE r.profile_id = ? AND r.status='finished' AND r.finished_at >= date('now','-14 days')
     GROUP BY day ORDER BY day`
  ).bind(pid).all();

  const { results: mistakes } = await env.DB.prepare(
    `SELECT word, display, wrong_count, phonetic_count, correct_count, unclear_count
     FROM word_stats WHERE profile_id = ? AND (wrong_count + phonetic_count + unclear_count) > 0
     ORDER BY (wrong_count*2 + phonetic_count + unclear_count) DESC LIMIT 8`
  ).bind(pid).all();

  const { results: strengths } = await env.DB.prepare(
    `SELECT word, display, correct_count FROM word_stats
     WHERE profile_id = ? AND correct_count >= 2 ORDER BY correct_count DESC LIMIT 6`
  ).bind(pid).all();

  const { results: recent } = await env.DB.prepare(
    `SELECT id, mode, percent, grade, score, max_score, created_at, finished_at FROM rounds
     WHERE profile_id = ? AND status='finished' ORDER BY finished_at DESC LIMIT 10`
  ).bind(pid).all();

  const avgGrade = auth.profile.grade_count > 0
    ? Math.round((auth.profile.grade_sum / auth.profile.grade_count) * 10) / 10
    : null;
  const { level, into, needed } = levelForXp(auth.profile.xp);

  return c.json({
    profile: auth.profile,
    level: { level, xpInto: into, xpNeeded: needed, xp: auth.profile.xp },
    todayXp: todayRow?.xp || 0,
    dailyGoal: auth.profile.daily_goal_xp,
    avgGrade,
    weekly,
    mistakes,
    strengths,
    recentRounds: recent,
  });
});

app.get('/history', async (c) => {
  const auth = await requireAuth(c);
  const env = c.env;
  const { results: rounds } = await env.DB.prepare(
    `SELECT id, mode, percent, grade, score, max_score, created_at, finished_at FROM rounds
     WHERE profile_id = ? AND status='finished' ORDER BY finished_at DESC LIMIT 30`
  ).bind(auth.profile.id).all<{ id: string }>();
  const ids = rounds.map((r) => r.id);
  let wrongByRound: Record<string, { expected: string; given: string; verdict: string }[]> = {};
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const { results: wrong } = await env.DB.prepare(
      `SELECT a.round_id, i.answer AS expected, a.given, a.verdict
       FROM answers a JOIN round_items i ON i.id = a.item_id
       WHERE a.round_id IN (${placeholders}) AND a.verdict != 'correct' ORDER BY a.id`
    ).bind(...ids).all<{ round_id: string; expected: string; given: string; verdict: string }>();
    for (const w of wrong) {
      (wrongByRound[w.round_id] ||= []).push({ expected: w.expected, given: w.given, verdict: w.verdict });
    }
  }
  return c.json({ rounds: rounds.map((r) => ({ ...r, mistakes: (wrongByRound[r.id] || []).slice(0, 10) })) });
});

app.get('/rewards', async (c) => {
  const auth = await requireAuth(c);
  const env = c.env;
  const { results: rewards } = await env.DB.prepare('SELECT * FROM rewards ORDER BY sort_order').all();
  const { results: unlocked } = await env.DB.prepare(
    'SELECT reward_id, unlocked_at FROM unlocked_rewards WHERE profile_id = ?'
  ).bind(auth.profile.id).all<{ reward_id: string; unlocked_at: string }>();
  const map = new Map(unlocked.map((u) => [u.reward_id, u.unlocked_at]));
  return c.json({
    rewards: rewards.map((r) => ({
      ...(r as Record<string, unknown>),
      unlocked: map.has((r as { id: string }).id),
      unlockedAt: map.get((r as { id: string }).id) || null,
    })),
  });
});

app.get('/weak-words', async (c) => {
  const auth = await requireAuth(c);
  const { results } = await c.env.DB.prepare(
    `SELECT word, display, correct_count, phonetic_count, wrong_count, unclear_count
     FROM word_stats WHERE profile_id = ?
     ORDER BY (wrong_count*2 + phonetic_count) DESC, correct_count ASC LIMIT 30`
  ).bind(auth.profile.id).all();
  return c.json({ words: results });
});

// ================= EIGENE LISTEN =================

app.get('/lists', async (c) => {
  const auth = await requireAuth(c);
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, (SELECT COUNT(*) FROM list_items i WHERE i.list_id = l.id) AS item_count
     FROM word_lists l WHERE l.profile_id = ? ORDER BY l.created_at DESC`
  ).bind(auth.profile.id).all();
  return c.json({ lists: results });
});

app.post('/lists', async (c) => {
  const auth = await requireAuth(c);
  const { name, difficulty } = await c.req.json<{ name?: string; difficulty?: string }>();
  if (!name?.trim()) return jsonError(c, 'Name darf nicht leer sein.');
  const id = uid();
  await c.env.DB.prepare('INSERT INTO word_lists (id, profile_id, name, difficulty) VALUES (?, ?, ?, ?)')
    .bind(id, auth.profile.id, name.trim(), difficulty || null).run();
  return c.json({ ok: true, id }, 201);
});

app.delete('/lists/:id', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const list = await c.env.DB.prepare('SELECT id FROM word_lists WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first();
  if (!list) return jsonError(c, 'Liste nicht gefunden.', 404);
  await c.env.DB.prepare('DELETE FROM word_lists WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.get('/lists/:id', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const list = await c.env.DB.prepare('SELECT * FROM word_lists WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first();
  if (!list) return jsonError(c, 'Liste nicht gefunden.', 404);
  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM list_items WHERE list_id = ? ORDER BY id'
  ).bind(id).all();
  return c.json({ list, items });
});

app.post('/lists/:id/items', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const list = await c.env.DB.prepare('SELECT id FROM word_lists WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first();
  if (!list) return jsonError(c, 'Liste nicht gefunden.', 404);
  const body = await c.req.json<{
    items?: { type?: string; text?: string; difficulty?: string }[];
    type?: string; text?: string; difficulty?: string;
  }>();
  const raw = body.items?.length ? body.items : (body.text ? [{ type: body.type, text: body.text, difficulty: body.difficulty }] : []);
  const cleaned = raw
    .map((i) => ({ type: i.type || 'word', text: (i.text || '').trim(), difficulty: i.difficulty || null }))
    .filter((i) => ['word', 'sentence', 'text'].includes(i.type) && i.text.length > 0);
  if (!cleaned.length) return jsonError(c, 'Keine gültigen Einträge übermittelt.');
  const stmts = cleaned.map((i) =>
    c.env.DB.prepare('INSERT INTO list_items (list_id, type, text, difficulty) VALUES (?, ?, ?, ?)')
      .bind(id, i.type, i.text, i.difficulty)
  );
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, added: cleaned.length }, 201);
});

app.delete('/lists/:id/items/:itemId', async (c) => {
  const auth = await requireAuth(c);
  const id = c.req.param('id');
  const itemId = c.req.param('itemId');
  const list = await c.env.DB.prepare('SELECT id FROM word_lists WHERE id = ? AND profile_id = ?')
    .bind(id, auth.profile.id).first();
  if (!list) return jsonError(c, 'Liste nicht gefunden.', 404);
  await c.env.DB.prepare('DELETE FROM list_items WHERE id = ? AND list_id = ?').bind(itemId, id).run();
  return c.json({ ok: true });
});

// ================= KI =================

app.get('/ai/status', async (c) => c.json({ configured: isAIConfigured(c.env) }));

app.post('/ai/generate', async (c) => {
  const auth = await requireAuth(c);
  const { difficulty, count, focus } = await c.req.json<{ difficulty?: string; count?: number; focus?: string[] }>();
  const diff = difficulty || 'mittel';
  const n = Math.min(Math.max(count || 8, 1), 20);

  // Zuerst schwache Wörter als Fokus verwenden
  const { results: weak } = await c.env.DB.prepare(
    `SELECT display FROM word_stats WHERE profile_id = ? AND (wrong_count + phonetic_count) > 0
     ORDER BY (wrong_count*2 + phonetic_count) DESC LIMIT 10`
  ).bind(auth.profile.id).all<{ display: string }>();
  const focusWords = [...(focus || []), ...weak.map((w) => w.display)].slice(0, 15);

  let generated = await generateExercises(c.env, { difficulty: diff, count: n, focus: focusWords });
  let source: 'ai' | 'builtin' = 'ai';

  if (!generated) {
    source = 'builtin';
    // Heuristik: mische Schwäche-Wörter mit zufälligen Inhalten der Stufe
    const pool: { type: 'word' | 'sentence'; text: string }[] = [];
    for (const w of weak.slice(0, Math.ceil(n / 2))) pool.push({ type: 'word', text: w.display });
    const { results } = await c.env.DB.prepare(
      "SELECT type, text FROM content_items WHERE difficulty = ? AND (type='word' OR type='sentence') ORDER BY RANDOM() LIMIT ?"
    ).bind(diff, n - pool.length).all<{ type: string; text: string }>();
    for (const r of results) pool.push({ type: r.type as 'word' | 'sentence', text: r.text });
    generated = shuffle(pool).slice(0, n);
  }

  // Generierte Inhalte speichern, damit sie wiederverwendet werden können
  const stmts = generated.map((g) =>
    c.env.DB.prepare('INSERT INTO content_items (type, text, difficulty, category, is_ai_generated) VALUES (?, ?, ?, ?, 1)')
      .bind(g.type, g.text, diff, 'ki-generiert')
  );
  if (stmts.length) await c.env.DB.batch(stmts);

  return c.json({ source, items: generated });
});

app.post('/ai/analyze', async (c) => {
  const auth = await requireAuth(c);
  const env = c.env;
  const { results: mistakes } = await env.DB.prepare(
    `SELECT word, display, wrong_count, phonetic_count FROM word_stats
     WHERE profile_id = ? AND (wrong_count + phonetic_count + unclear_count) > 0
     ORDER BY (wrong_count*2 + phonetic_count) DESC LIMIT 10`
  ).bind(auth.profile.id).all<{ word: string; display: string; wrong_count: number; phonetic_count: number }>();

  const mistakeList = mistakes.map((m) => ({ word: m.display, count: m.wrong_count + m.phonetic_count }));
  const avgGrade = auth.profile.grade_count > 0
    ? Math.round((auth.profile.grade_sum / auth.profile.grade_count) * 10) / 10 : null;
  const { level } = levelForXp(auth.profile.xp);

  const aiResult = await analyzeErrors(env, {
    name: auth.profile.name, mistakes: mistakeList, avgGrade, level,
  });
  if (aiResult) return c.json({ source: 'ai', ...aiResult });

  // Eingebauter Fallback
  const top = mistakes.slice(0, 5).map((m) => `„${m.display}“`);
  const summary = mistakes.length
    ? `${auth.profile.name} hat bisher ${mistakes.length} verschiedene Problemwörter. Am häufigsten kommen ${top.join(', ')} vor.`
    : 'Noch nicht genug Daten für eine Analyse – schließe zuerst ein paar Runden ab.';
  const tips = [
    'Übe die Top-Fehlerwörter gezielt mit der Funktion „Schwierige Wörter wiederholen“.',
    'Achte besonders auf die Laute ie/ei und die Unterscheidung von ss und ß.',
    'Kurze, regelmäßige Runden bringen mehr als seltene lange Sessions.',
  ];
  const recommendation = mistakes.length
    ? `Starte eine Runde mit „Schwierige Wörter" (${mistakes.length} Fehlerwörter warten).`
    : 'Starte mit einer einfachen Wort-Runde auf Stufe „Leicht“.';
  return c.json({ source: 'builtin', summary, tips, recommendation });
});

// ================= ADMIN =================

const admin = new Hono<C>();
admin.use('*', async (c, next) => {
  await requireAdmin(c);
  await next();
});

admin.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.created_at,
       (SELECT COUNT(*) FROM profiles p WHERE p.user_id = u.id) AS profile_count,
       (SELECT COALESCE(SUM(xp),0) FROM profiles p WHERE p.user_id = u.id) AS total_xp
     FROM users u ORDER BY u.created_at DESC`
  ).all();
  return c.json({ users: results });
});

admin.post('/users', async (c) => {
  const { email, password, name, role } = await c.req.json<{
    email?: string; password?: string; name?: string; role?: string;
  }>();
  const mail = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return jsonError(c, 'Ungültige E-Mail.');
  if (!password || password.length < 8) return jsonError(c, 'Passwort min. 8 Zeichen.');
  const env = c.env;
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(mail).first();
  if (exists) return jsonError(c, 'E-Mail existiert bereits.', 409);
  const userId = uid();
  const userRole = role === 'admin' || isAdminEmail(mail, env) ? 'admin' : 'user';
  await env.DB.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .bind(userId, mail, await hashPassword(password), userRole).run();
  const pid = uid();
  await env.DB.prepare('INSERT INTO profiles (id, user_id, name) VALUES (?, ?, ?)')
    .bind(pid, userId, (name || mail.split('@')[0]).trim()).run();
  return c.json({ ok: true, id: userId }, 201);
});

admin.patch('/users/:id', async (c) => {
  const { role, password } = await c.req.json<{ role?: string; password?: string }>();
  const id = c.req.param('id');
  if (role !== undefined) {
    if (!['user', 'admin'].includes(role)) return jsonError(c, 'Ungültige Rolle.');
    await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
  }
  if (password) {
    if (password.length < 8) return jsonError(c, 'Passwort min. 8 Zeichen.');
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(await hashPassword(password), id).run();
  }
  return c.json({ ok: true });
});

admin.delete('/users/:id', async (c) => {
  const auth = await requireAdmin(c);
  const id = c.req.param('id');
  if (id === auth.user.id) return jsonError(c, 'Du kannst dich nicht selbst löschen.');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

admin.get('/profiles', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, u.email FROM profiles p JOIN users u ON u.id = p.user_id
     ORDER BY p.xp DESC LIMIT 200`
  ).all();
  return c.json({ profiles: results });
});

admin.get('/stats', async (c) => {
  const env = c.env;
  const users = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  const profiles = await env.DB.prepare('SELECT COUNT(*) AS n FROM profiles').first<{ n: number }>();
  const rounds = await env.DB.prepare("SELECT COUNT(*) AS n FROM rounds WHERE status='finished'").first<{ n: number }>();
  const answers = await env.DB.prepare('SELECT COUNT(*) AS n FROM answers').first<{ n: number }>();
  const content = await env.DB.prepare('SELECT COUNT(*) AS n FROM content_items').first<{ n: number }>();
  const xp = await env.DB.prepare('SELECT COALESCE(SUM(xp),0) AS n FROM profiles').first<{ n: number }>();
  return c.json({
    users: users?.n || 0, profiles: profiles?.n || 0, rounds: rounds?.n || 0,
    answers: answers?.n || 0, content: content?.n || 0, totalXp: xp?.n || 0,
  });
});

admin.get('/content', async (c) => {
  const difficulty = c.req.query('difficulty');
  const type = c.req.query('type');
  let q = 'SELECT * FROM content_items WHERE 1=1';
  const binds: string[] = [];
  if (difficulty) { q += ' AND difficulty = ?'; binds.push(difficulty); }
  if (type) { q += ' AND type = ?'; binds.push(type); }
  q += ' ORDER BY id DESC LIMIT 300';
  const { results } = await c.env.DB.prepare(q).bind(...binds).all();
  return c.json({ items: results });
});

admin.post('/content', async (c) => {
  const { type, text, difficulty, category } = await c.req.json<{
    type?: string; text?: string; difficulty?: string; category?: string;
  }>();
  if (!type || !['word', 'sentence', 'text'].includes(type) || !text?.trim()) {
    return jsonError(c, 'Ungültige Eingabe (type: word|sentence|text, text erforderlich).');
  }
  const res = await c.env.DB.prepare(
    'INSERT INTO content_items (type, text, difficulty, category) VALUES (?, ?, ?, ?)'
  ).bind(type, text.trim(), difficulty || 'mittel', category || 'allgemein').run();
  return c.json({ ok: true, id: res.meta.last_row_id }, 201);
});

admin.patch('/content/:id', async (c) => {
  const { text, difficulty, category } = await c.req.json<{ text?: string; difficulty?: string; category?: string }>();
  await c.env.DB.prepare(
    'UPDATE content_items SET text = COALESCE(?, text), difficulty = COALESCE(?, difficulty), category = COALESCE(?, category) WHERE id = ?'
  ).bind(text ?? null, difficulty ?? null, category ?? null, c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.delete('/content/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM content_items WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.get('/difficulty', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM difficulty_levels ORDER BY sort_order').all();
  return c.json({ levels: results });
});

admin.post('/difficulty', async (c) => {
  const { key, label, description, sortOrder } = await c.req.json<{
    key?: string; label?: string; description?: string; sortOrder?: number;
  }>();
  if (!key || !label) return jsonError(c, 'key und label erforderlich.');
  await c.env.DB.prepare('INSERT INTO difficulty_levels (key, label, description, sort_order) VALUES (?, ?, ?, ?)')
    .bind(key, label, description || '', sortOrder ?? 99).run();
  return c.json({ ok: true }, 201);
});

admin.patch('/difficulty/:id', async (c) => {
  const { label, description, sortOrder } = await c.req.json<{ label?: string; description?: string; sortOrder?: number }>();
  await c.env.DB.prepare(
    'UPDATE difficulty_levels SET label = COALESCE(?, label), description = COALESCE(?, description), sort_order = COALESCE(?, sort_order) WHERE id = ?'
  ).bind(label ?? null, description ?? null, sortOrder ?? null, c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.delete('/difficulty/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM difficulty_levels WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.get('/rounds', async (c) => {
  const profileId = c.req.query('profileId');
  let q = `SELECT r.*, p.name AS profile_name, u.email FROM rounds r
           JOIN profiles p ON p.id = r.profile_id JOIN users u ON u.id = p.user_id
           WHERE r.status='finished'`;
  const binds: string[] = [];
  if (profileId) { q += ' AND r.profile_id = ?'; binds.push(profileId); }
  q += ' ORDER BY r.finished_at DESC LIMIT 100';
  const { results } = await c.env.DB.prepare(q).bind(...binds).all();
  return c.json({ rounds: results });
});

app.route('/admin', admin);

// ---------- Pages-Functions-Export ----------

export const onRequest = async (context: {
  request: Request;
  env: Env;
  waitUntil: (p: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: () => Promise<Response>;
  functionPath?: string;
  params?: Record<string, string>;
}): Promise<Response> => app.fetch(context.request, context.env, context as unknown as ExecutionContext);
