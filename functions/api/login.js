import { USERS, json, fail, safeEqual, makeCookie } from '../../cms/server.js';

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) return fail('בקשה לא מורשית.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('בקשה לא תקינה.'); }
  const user = String(body.user || '');
  const expected = USERS[user] && env['PASSWORD_' + user.toUpperCase()];
  const ok = expected ? await safeEqual(env, body.password || '', expected) : false;
  if (!ok) {
    await new Promise(r => setTimeout(r, 700)); // slows down guessing
    return fail('הסיסמה לא נכונה.', 401);
  }
  return json({ user, name: USERS[user] }, 200, { 'Set-Cookie': await makeCookie(env, user) });
}
