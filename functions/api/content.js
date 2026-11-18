import { USERS, CONTENT_PATH, TEMPLATE_PATH, json, fail, github, decodeB64, blobSha } from '../../cms/server.js';
import { render } from '../../cms/render.js';

export async function onRequestGet({ env, data }) {
  const gh = github(env);
  const [meta, template] = await Promise.all([gh.meta(CONTENT_PATH), gh.raw(TEMPLATE_PATH)]);
  return json({ content: JSON.parse(decodeB64(meta.content)), sha: meta.sha, template, user: data.user, name: USERS[data.user] });
}

const UPLOAD = /^assets\/uploads\/[a-z0-9][a-z0-9._-]{0,90}\.(webp|jpe?g|png|gif|mp4)$/;
const MAX_TOTAL = 60 * 1024 * 1024; // base64 characters per save

/* one save = one commit: new content.json + the rebuilt index.html + any new uploads */
export async function onRequestPut({ request, env, data }) {
  let body;
  try { body = await request.json(); } catch { return fail('הנתונים שנשלחו לא תקינים.'); }
  const { content, sha, files = [] } = body;
  if (!content || typeof content !== 'object' || !content.settings || !content.hero) return fail('התוכן שנשלח לא שלם.');
  let total = 0;
  for (const f of files) {
    if (!UPLOAD.test(f.path || '') || typeof f.data !== 'string') return fail('קובץ לא תקין: ' + (f.path || ''));
    total += f.data.length;
  }
  if (total > MAX_TOTAL) return fail('הקבצים גדולים מדי לשמירה אחת. כדאי לשמור כל סרטון בנפרד.', 413);

  const gh = github(env);
  const [meta, template, ref] = await Promise.all([gh.meta(CONTENT_PATH), gh.raw(TEMPLATE_PATH), gh.call(`/git/ref/heads/${gh.branch}`)]);
  if (sha && meta.sha !== sha) return fail('מישהו אחר שמר שינויים בזמן שעבדת. צריך לטעון מחדש (השינויים שלך נשמרים בטיוטה).', 409);

  let html;
  try { html = render(template, content); } catch (e) { return fail('לא הצלחתי לבנות את הדף: ' + e.message); }
  const text = JSON.stringify(content, null, 2) + '\n';

  const head = await gh.call(`/git/commits/${ref.object.sha}`);
  const tree = [
    { path: CONTENT_PATH, mode: '100644', type: 'blob', content: text },
    { path: 'index.html', mode: '100644', type: 'blob', content: html }
  ];
  for (const f of files) {
    const blob = await gh.post('/git/blobs', { content: f.data, encoding: 'base64' });
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await gh.post('/git/trees', { base_tree: head.tree.sha, tree });
  const who = USERS[data.user];
  const commit = await gh.post('/git/commits', {
    message: `עדכון תוכן מהמערכת (${who})` + (body.note ? `: ${String(body.note).slice(0, 120)}` : ''),
    tree: newTree.sha,
    parents: [head.sha],
    author: { name: `${who} · מערכת ניהול`, email: 'cms@nerya-lahav.local', date: new Date().toISOString() }
  });
  try {
    await gh.patch(`/git/refs/heads/${gh.branch}`, { sha: commit.sha, force: false });
  } catch (e) {
    if (e.status === 422) return fail('האתר עודכן ממקום אחר באותו רגע. כדאי לנסות לשמור שוב.', 409);
    throw e;
  }
  return json({ ok: true, sha: await blobSha(text), commit: commit.sha });
}
