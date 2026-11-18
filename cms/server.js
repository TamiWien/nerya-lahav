/* Server helpers for the Cloudflare Pages functions (functions/api/*).
   Required environment variables (Cloudflare → Pages project → Settings → Variables and Secrets):
     SESSION_SECRET      long random string
     PASSWORD_NERIYA     Neriya's login password
     PASSWORD_TAMAR      Tamar's login password
     GITHUB_TOKEN        fine-grained token with Contents: read & write on the repo
     GITHUB_REPO         e.g. TamiWien/nerya-lahav
     GITHUB_BRANCH       optional, default main */

export const USERS = { neriya: 'נריה', tamar: 'תמר' };
export const CONTENT_PATH = 'content/content.json';
export const TEMPLATE_PATH = 'cms/template.html';
const COOKIE = 'nl_admin';
const enc = new TextEncoder();

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
export const fail = (msg, status = 400) => json({ error: msg }, status);

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
/* compare through an HMAC so the time taken does not leak how much of the password matched */
export async function safeEqual(env, a, b) {
  const [x, y] = await Promise.all([hmac(env.SESSION_SECRET, String(a)), hmac(env.SESSION_SECRET, String(b))]);
  return x === y;
}

export async function makeCookie(env, user) {
  const exp = Date.now() + 1000 * 60 * 60 * 12;
  const payload = user + '.' + exp;
  const token = payload + '.' + (await hmac(env.SESSION_SECRET, payload));
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function readUser(env, request) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(COOKIE + '=([^;]+)'));
  if (!m || !env.SESSION_SECRET) return null;
  const [user, exp, sig] = m[1].split('.');
  if (!USERS[user] || !(+exp > Date.now())) return null;
  return (await hmac(env.SESSION_SECRET, user + '.' + exp)) === sig ? user : null;
}

/* ---------- GitHub ---------- */
export function github(env) {
  const base = `https://api.github.com/repos/${env.GITHUB_REPO}`;
  const branch = env.GITHUB_BRANCH || 'main';
  async function call(path, opt = {}) {
    const r = await fetch(base + path, {
      ...opt,
      headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: opt.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'User-Agent': 'nerya-lahav-cms',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opt.body ? { 'Content-Type': 'application/json' } : {})
      }
    });
    if (!r.ok) {
      const e = new Error('GitHub ' + r.status + ': ' + (await r.text()).slice(0, 300));
      e.status = r.status;
      throw e;
    }
    return opt.raw ? r.text() : r.json();
  }
  return {
    branch, call,
    meta: path => call(`/contents/${path}?ref=${branch}`),
    raw: path => call(`/contents/${path}?ref=${branch}`, { raw: true }),
    post: (path, body) => call(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: (path, body) => call(path, { method: 'PATCH', body: JSON.stringify(body) })
  };
}

export const decodeB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

/* the sha git gives a file with this text: lets the editor know the new version without another request */
export async function blobSha(text) {
  const body = enc.encode(text);
  const head = enc.encode('blob ' + body.length + '\0');
  const all = new Uint8Array(head.length + body.length);
  all.set(head); all.set(body, head.length);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map(b => b.toString(16).padStart(2, '0')).join('');
}
