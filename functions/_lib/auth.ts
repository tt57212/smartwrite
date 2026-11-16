import { HTTPException } from 'hono/http-exception';
import type { Env } from './util';
import { SESSION_COOKIE, isAdminEmail } from './util';

/** Minimal-Context, damit die Helper unabhängig von Hono-Generics funktionieren. */
export interface AuthContext {
  env: Env;
  req: {
    header(name: string): string | undefined;
    url: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  settings: Record<string, unknown>;
}

export interface AuthProfile {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  color: string;
  daily_goal_xp: number;
  xp: number;
  streak: number;
  best_streak: number;
  last_active_date: string | null;
  total_rounds: number;
  total_correct: number;
  total_answers: number;
  grade_sum: number;
  grade_count: number;
  created_at: string;
}

export interface Auth {
  user: AuthUser;
  profile: AuthProfile;
  sessionToken: string;
}

interface SessionRow {
  token: string;
  user_id: string;
  profile_id: string | null;
  expires_at: string;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function createSession(env: Env, userId: string, profileId: string | null): Promise<string> {
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const expires = new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.prepare('INSERT INTO sessions (token, user_id, profile_id, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, profileId, expires)
    .run();
  return token;
}

export async function getAuth(c: AuthContext): Promise<Auth | null> {
  const token = readCookie(c.req.header('cookie'), SESSION_COOKIE);
  if (!token) return null;
  const env = c.env;
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ?').bind(token).first<SessionRow>();
  if (!session) return null;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (session.expires_at < now) return null;

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<{
    id: string; email: string; role: string; settings: string;
  }>();
  if (!user) return null;

  // Admin-Rolle serverseitig sicherstellen (z. B. ENV nachträglich gesetzt)
  let role = user.role;
  if (role !== 'admin' && isAdminEmail(user.email, env)) {
    role = 'admin';
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
  }

  let profileId = session.profile_id;
  if (!profileId) {
    profileId = await firstProfileId(env, user.id);
  }
  const profile = profileId
    ? await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(profileId).first<AuthProfile>()
    : null;
  if (!profile || profile.user_id !== user.id) return null;

  return {
    user: { id: user.id, email: user.email, role, settings: safeJson(user.settings) },
    profile,
    sessionToken: token,
  };
}

async function firstProfileId(env: Env, userId: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT id FROM profiles WHERE user_id = ? ORDER BY created_at LIMIT 1')
    .bind(userId).first<{ id: string }>();
  return row?.id ?? null;
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

/** Wirft 401, wenn nicht angemeldet. */
export async function requireAuth(c: AuthContext): Promise<Auth> {
  const auth = await getAuth(c);
  if (!auth) throw new HTTPException(401, { message: 'Nicht angemeldet' });
  return auth;
}

/** Wirft 403, wenn kein Admin. */
export async function requireAdmin(c: AuthContext): Promise<Auth> {
  const auth = await requireAuth(c);
  const isAdmin = auth.user.role === 'admin' || isAdminEmail(auth.user.email, c.env);
  if (!isAdmin) throw new HTTPException(403, { message: 'Keine Admin-Berechtigung' });
  return auth;
}

export function publicUser(auth: Auth, env: Env) {
  return {
    id: auth.user.id,
    email: auth.user.email,
    role: auth.user.role === 'admin' || isAdminEmail(auth.user.email, env) ? 'admin' : 'user',
    settings: auth.user.settings,
  };
}
