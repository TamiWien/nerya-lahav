/* Shared page renderer: one template + content.json -> index.html.
   Used by the admin preview (browser), cms/build.mjs (Node) and the save function (Cloudflare).
   Template syntax:
     {{path}}            escaped text
     {{{path}}}          raw html (only for values the renderer builds itself)
     {{fn path}}         helper: rich, paras, url, icon
     {{#each path}}…{{/each}}   loop; inside: field names, this, @index, @num, @first, @last
     {{#if path}}…{{else}}…{{/if}}, {{#unless path}}…{{/unless}}
   Text conventions in content: **bold**, a line break = <br>, an empty line = new paragraph (paras only). */

const H = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => H[c]);
export const rich = s => esc(s).replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>').replace(/\r?\n/g, '<br>');
export const paras = s => String(s ?? '').trim().split(/\r?\n\s*\r?\n/).map(p => '<p>' + rich(p.trim()) + '</p>').join('');

export const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
};

const HELPERS = { rich, paras, url: v => encodeURIComponent(String(v ?? '')), icon: v => ICONS[v] || ICONS.home };

/* ---------- parser ---------- */
const TAG = /\{\{\{\s*([\s\S]+?)\s*\}\}\}|\{\{\s*([\s\S]+?)\s*\}\}/g;
function parse(tpl) {
  const root = { kids: [] }, stack = [root];
  let last = 0, m;
  const top = () => stack[stack.length - 1];
  const push = n => (top().inElse ? top().els : top().kids).push(n);
  TAG.lastIndex = 0;
  while ((m = TAG.exec(tpl))) {
    if (m.index > last) push({ t: 'text', v: tpl.slice(last, m.index) });
    last = TAG.lastIndex;
    if (m[1] !== undefined) { push({ t: 'raw', v: m[1] }); continue; }
    const s = m[2];
    if (s[0] === '#') {
      const [kind, ...rest] = s.slice(1).split(/\s+/);
      const n = { t: kind, v: rest.join(' '), kids: [], els: [] };
      push(n); stack.push(n);
    } else if (s[0] === '/') {
      if (stack.length < 2) throw new Error('Unexpected {{' + s + '}}');
      stack.pop();
    } else if (s === 'else') top().inElse = true;
    else push({ t: 'var', v: s });
  }
  if (stack.length > 1) throw new Error('Unclosed block {{#' + top().t + '}}');
  if (last < tpl.length) push({ t: 'text', v: tpl.slice(last) });
  return root.kids;
}

function lookup(path, scopes) {
  if (path === 'this') return scopes[scopes.length - 1].item;
  if (path[0] === '@') return scopes[scopes.length - 1].meta?.[path.slice(1)];
  const parts = path.split('.');
  for (let i = scopes.length - 1; i >= 0; i--) {
    const it = scopes[i].item;
    if (it && typeof it === 'object' && parts[0] in it) return parts.reduce((o, k) => (o == null ? o : o[k]), it);
  }
  return undefined;
}
const truthy = v => Array.isArray(v) ? v.length > 0 : !!v;

function run(nodes, scopes) {
  let out = '';
  for (const n of nodes) {
    if (n.t === 'text') out += n.v;
    else if (n.t === 'raw') out += String(lookup(n.v, scopes) ?? '');
    else if (n.t === 'var') {
      const [a, b] = n.v.split(/\s+/);
      out += b ? HELPERS[a](lookup(b, scopes)) : esc(lookup(a, scopes));
    } else if (n.t === 'each') {
      const list = lookup(n.v, scopes) || [];
      list.forEach((item, i) => {
        out += run(n.kids, scopes.concat({ item, meta: { index: i, num: i + 1, first: i === 0, last: i === list.length - 1 } }));
      });
    } else if (n.t === 'if' || n.t === 'unless') {
      let v = truthy(lookup(n.v, scopes));
      if (n.t === 'unless') v = !v;
      out += run(v ? n.kids : n.els, scopes);
    }
  }
  return out;
}

/* ---------- values the page needs but nobody should have to type ---------- */
const stripMarks = s => String(s || '').replace(/[֑-ׇ״"]/g, '');
function wrap(text, width) {
  const lines = []; let cur = '';
  String(text || '').replace(/\*\*/g, '').split(/\s+/).filter(Boolean).forEach(w => {
    if (cur && (cur + ' ' + w).length > width) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  });
  if (cur) lines.push(cur);
  return lines;
}
const ROTS = ['-3deg', '2.5deg', '-2deg', '3deg'];
const FAQ_KEYS = ['before', 'day', 'after'];

export function derive(content) {
  const c = JSON.parse(JSON.stringify(content));
  const digits = String(c.settings.phone || '').replace(/\D/g, '');
  const intl = digits.startsWith('0') ? '972' + digits.slice(1) : digits;
  const inner = c.hero.ring_inner || [];
  const imgs = c.moments.images || [];
  const rot = k => imgs.slice(k).concat(imgs.slice(0, k));
  const letters = c.voices.letters.items || [];
  const feat = letters[Math.min(Math.max(1, +c.voices.letters.featured || 1), letters.length) - 1] || { text: '', parents: '' };
  const n = (c.included.cards || []).length;
  c.process.steps.forEach((s, i) => { s.rot = ROTS[i % ROTS.length]; });
  c.faq.tabs.forEach((t, i) => { t.key = FAQ_KEYS[i] || 'tab' + (i + 1); });
  c.$ = {
    tel: 'tel:+' + intl,
    wa: intl,
    stamp_aria: stripMarks(c.hero.ring_outer).trim() + ' · ' + inner.join(', '),
    ring_inner: inner.concat(inner),
    ticker3: [].concat(c.ticker, c.ticker, c.ticker),
    inc_nums: Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0')),
    inc_total: String(n).padStart(2, '0'),
    row1: imgs, row2: rot(Math.ceil(imgs.length / 2)), row3: rot(Math.ceil(imgs.length / 4)),
    ink: wrap(feat.text, 34).map(esc).join('<br>'),
    ink_sig: feat.parents
  };
  return c;
}

const cache = new Map();
export function render(template, content) {
  let tree = cache.get(template);
  if (!tree) { tree = parse(template); cache.clear(); cache.set(template, tree); }
  return run(tree, [{ item: derive(content) }]);
}
