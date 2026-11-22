import { readUser, fail } from '../../cms/server.js';

const OPEN = new Set(['/api/login', '/api/logout']);

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  for (const k of ['SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO']) if (!env[k]) return fail('המערכת עוד לא הוגדרה: חסר ' + k + ' בהגדרות Cloudflare.', 500);
  if (!OPEN.has(path)) {
    data.user = await readUser(env, request);
    if (!data.user) return fail('צריך להתחבר מחדש.', 401);
    /* writes only from the admin page itself */
    if (request.method !== 'GET' && request.headers.get('Origin') !== new URL(request.url).origin) return fail('בקשה לא מורשית.', 403);
  }
  try {
    return await next();
  } catch (e) {
    console.error(e);
    return fail(e.status === 401 ? 'GitHub דחה את הטוקן (GITHUB_TOKEN): הוא שגוי, פג תוקף או הודבק עם תווים מיותרים.'
      : e.status === 403 || e.status === 404 ? 'לטוקן של GitHub אין גישה לריפו ' + env.GITHUB_REPO + '. צריך לבחור את הריפו ולתת הרשאת Contents: Read and write.'
      : 'משהו השתבש בשרת: ' + e.message, 500);
  }
}
