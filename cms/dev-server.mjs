// Local test server for the admin: same API as the Cloudflare functions, but reads and writes the local files.
// Run: node cms/dev-server.mjs  →  http://localhost:5179/admin/  (any password works)
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { render } from './render.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 5179;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.gif': 'image/gif' };
const sha = t => createHash('sha1').update('blob ' + Buffer.byteLength(t) + '\0').update(t).digest('hex');
const send = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
const body = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString())); });
let user = null;

async function walk(dir) {
  const out = [];
  for (const e of await readdir(join(ROOT, dir), { withFileTypes: true }).catch(() => [])) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/login') { const b = JSON.parse(await body(req)); user = b.user; return send(res, 200, { user, name: user }); }
    if (p === '/api/logout') { user = null; return send(res, 200, { ok: true }); }
    if (p.startsWith('/api/') && !user) return send(res, 401, { error: 'צריך להתחבר' });
    if (p === '/api/content' && req.method === 'GET') {
      const txt = await readFile(join(ROOT, 'content/content.json'), 'utf8');
      return send(res, 200, { content: JSON.parse(txt), sha: sha(txt), template: await readFile(join(ROOT, 'cms/template.html'), 'utf8'), user, name: user === 'tamar' ? 'תמר' : 'נריה' });
    }
    if (p === '/api/content' && req.method === 'PUT') {
      const b = JSON.parse(await body(req));
      const cur = await readFile(join(ROOT, 'content/content.json'), 'utf8');
      if (b.sha && b.sha !== sha(cur)) return send(res, 409, { error: 'מישהו אחר שמר בינתיים.' });
      for (const f of b.files || []) { await mkdir(join(ROOT, dirname(f.path)), { recursive: true }); await writeFile(join(ROOT, f.path), Buffer.from(f.data, 'base64')); }
      const text = JSON.stringify(b.content, null, 2) + '\n';
      const html = render(await readFile(join(ROOT, 'cms/template.html'), 'utf8'), b.content);
      await writeFile(join(ROOT, 'content/content.json'), text);
      await writeFile(join(ROOT, process.env.OUT || 'index.html'), html);
      return send(res, 200, { ok: true, sha: sha(text) });
    }
    if (p === '/api/media') {
      const files = (await Promise.all(['assets/img', 'assets/uploads', 'assets/video'].map(walk))).flat()
        .filter(f => /\.(webp|jpe?g|png|gif|mp4)$/i.test(f) && !/\/(ic-|c-|logo|baby-band|envelope|auth-)/.test(f))
        .map(f => ({ path: f.slice(1), kind: /\.mp4$/i.test(f) ? 'video' : 'image' }));
      return send(res, 200, { files });
    }
    let file = join(ROOT, decodeURIComponent(p));
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT') { res.writeHead(404); return res.end('not found'); }
    console.error(e); send(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`admin dev server: http://localhost:${PORT}/admin/`));
