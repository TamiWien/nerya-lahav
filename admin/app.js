import { render } from '/cms/render.js';
import { SECTIONS } from './schema.js';

/* ---------------- tiny helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
const I = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/></svg>'
};
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter(c => c != null && c !== false));
const icon = n => h('span', { html: I[n], 'aria-hidden': 'true', style: 'display:contents' });
const getIn = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const setIn = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k] ??= {}, o)[last] = v; };
const clone = o => JSON.parse(JSON.stringify(o));
let uid = 0; const nid = p => (p || 'f') + (++uid);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function toast(msg, kind = '', ms = 4200) {
  const t = h('div', { class: 'toast ' + kind }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), ms);
}
function confirmDlg(title, text, okLabel = 'אישור', danger = false) {
  return new Promise(res => {
    const d = h('dialog', { 'aria-labelledby': 'dlgT' },
      h('div', { class: 'dlg' }, h('h2', { id: 'dlgT' }, title), h('p', {}, text),
        h('div', { class: 'dlg-acts' },
          h('button', { class: 'btn ' + (danger ? 'btn-navy' : 'btn-gold'), onclick: () => { d.close(); res(true); } }, okLabel),
          h('button', { class: 'btn btn-line', onclick: () => { d.close(); res(false); } }, 'ביטול'))));
    d.addEventListener('close', () => { d.remove(); res(false); });
    document.body.append(d); d.showModal();
  });
}

/* ---------------- api ---------------- */
async function api(path, opt = {}) {
  const r = await fetch('/api/' + path, { credentials: 'same-origin', ...opt, headers: { ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
  let data = {};
  try { data = await r.json(); } catch {}
  if (r.status === 401 && path !== 'login') { showLogin(S.content ? 'ההתחברות פגה. צריך להתחבר שוב (השינויים שלך שמורים בטיוטה).' : ''); throw new Error('401'); }
  if (!r.ok) { const e = new Error(data.error || 'שגיאה ' + r.status); e.status = r.status; throw e; }
  return data;
}

/* ---------------- state ---------------- */
const S = { content: null, saved: '', sha: '', template: '', user: '', name: '', section: SECTIONS[0].id, pending: new Map(), live: new Map(), media: null, errors: new Map(), device: 'desktop', preview: innerWidth > 1180 };
const DRAFT = 'nl-cms-draft';
const isDirty = () => JSON.stringify(S.content) !== S.saved;
const saveDraft = debounce(() => {
  try { isDirty() ? localStorage.setItem(DRAFT, JSON.stringify({ content: S.content, sha: S.sha, at: Date.now() })) : localStorage.removeItem(DRAFT); } catch {}
}, 600);

function changed() {
  updateStatus();
  markSections();
  saveDraft();
  schedulePreview();
}

/* ---------------- login ---------------- */
function showLogin(msg = '') {
  const root = $('#root');
  let err;
  const form = h('form', { class: 'login-card', novalidate: true, onsubmit: async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = $('button[type=submit]', form);
    btn.disabled = true; err.textContent = '';
    try {
      await api('login', { method: 'POST', body: JSON.stringify({ user: fd.get('user'), password: fd.get('password') }) });
      try { localStorage.setItem('nl-cms-user', fd.get('user')); } catch {}
      boot();
    } catch (x) { err.textContent = x.message; btn.disabled = false; $('#pw').select(); }
  } },
    h('img', { src: '/assets/img/logo-mark.webp', alt: 'נריה להב' }),
    h('h1', {}, 'כניסה לניהול האתר'),
    h('fieldset', { style: 'border:0' }, h('legend', { class: 'sr' }, 'מי נכנס/ת?'),
      h('div', { class: 'who' }, ...[['neriya', 'נריה'], ['tamar', 'תמר']].map(([v, t]) =>
        h('label', {}, h('input', { type: 'radio', name: 'user', value: v, checked: (localStorage.getItem('nl-cms-user') || 'neriya') === v }), h('span', {}, t))))),
    h('div', { class: 'field' }, h('label', { for: 'pw' }, 'סיסמה'),
      h('input', { class: 'inp', id: 'pw', name: 'password', type: 'password', autocomplete: 'current-password', required: true, dir: 'ltr' })),
    err = h('p', { class: 'form-err', role: 'alert' }, msg),
    h('button', { class: 'btn btn-gold', type: 'submit' }, 'כניסה'));
  root.replaceChildren(h('main', { class: 'login' }, form));
  setTimeout(() => $('#pw')?.focus(), 50);
}

/* ---------------- boot ---------------- */
async function boot() {
  let data;
  try { data = await api('content'); } catch (e) { if (e.message !== '401') $('#root').replaceChildren(h('div', { class: 'loading' }, h('p', {}, e.message), h('button', { class: 'btn btn-line', onclick: boot }, 'לנסות שוב'))); return; }
  Object.assign(S, { content: data.content, saved: JSON.stringify(data.content), sha: data.sha, template: data.template, user: data.user, name: data.name });
  buildApp();
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch {}
  if (draft && JSON.stringify(draft.content) !== S.saved) offerDraft(draft);
}

function offerDraft(draft) {
  const when = new Date(draft.at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
  const stale = draft.sha !== S.sha;
  const b = h('div', { class: 'banner', role: 'region', 'aria-label': 'טיוטה' },
    h('p', {}, `נמצאו שינויים שלא נשמרו מ-${when}.` + (stale ? ' שימו לב: מאז האתר עודכן, כדאי לעבור על הטיוטה לפני שמירה.' : '')),
    h('button', { class: 'btn btn-gold btn-sm', onclick: () => { S.content = draft.content; b.remove(); renderEditor(); changed(); toast('הטיוטה שוחזרה'); } }, 'לשחזר'),
    h('button', { class: 'btn btn-line btn-sm', onclick: () => { try { localStorage.removeItem(DRAFT); } catch {} b.remove(); } }, 'למחוק'));
  $('#editor').prepend(b);
}

/* ---------------- app shell ---------------- */
let statusEl, saveBtn, undoBtn, mainEl, sideEl, editorEl, frame, pvWrap;
function buildApp() {
  statusEl = h('span', { class: 'status', role: 'status' }, h('i'), h('span'));
  saveBtn = h('button', { class: 'btn btn-gold', onclick: save, title: 'שמירה (Ctrl+S)' }, icon('save'), 'שמירה ופרסום');
  undoBtn = h('button', { class: 'btn btn-ghost hide-sm', onclick: discard }, icon('undo'), 'ביטול שינויים');
  const pvBtn = h('button', { class: 'btn btn-line', 'aria-pressed': String(S.preview), onclick: () => togglePreview(pvBtn) }, icon('eye'), h('span', { class: 'hide-sm' }, 'תצוגה מקדימה'));
  const menuBtn = h('button', { class: 'icon-btn menu-btn', 'aria-label': 'פתיחת רשימת האזורים', 'aria-expanded': 'false', onclick: () => { const o = sideEl.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); } }, icon('menu'));
  const bar = h('header', { class: 'bar' },
    menuBtn,
    h('div', { class: 'brand' }, h('img', { src: '/assets/img/logo-mark.webp', alt: 'נריה להב' }), h('b', {}, 'ניהול האתר')),
    statusEl, undoBtn, pvBtn,
    h('a', { class: 'btn btn-ghost hide-sm', href: '/', target: '_blank', rel: 'noopener' }, icon('ext'), 'לאתר'),
    saveBtn,
    h('button', { class: 'icon-btn', 'aria-label': `יציאה (${S.name})`, title: `מחובר/ת: ${S.name} · יציאה`, onclick: logout }, icon('out')));

  sideEl = h('nav', { class: 'side', 'aria-label': 'אזורים באתר' },
    h('h2', {}, 'אזורים באתר'),
    h('ul', {}, ...SECTIONS.map(s => h('li', {}, h('button', { 'data-s': s.id, onclick: () => go(s.id) }, s.title, h('span', { class: 'dot', 'aria-hidden': 'true' }))))),
    h('div', { class: 'help' }, h('b', {}, 'איך זה עובד? '), 'עורכים, רואים את השינוי בתצוגה המקדימה, ולוחצים ', h('b', {}, 'שמירה ופרסום'), '. האתר מתעדכן לבד תוך כדקה.'));
  editorEl = h('section', { class: 'editor', id: 'editor', tabindex: '-1', 'aria-live': 'off' });
  frame = h('iframe', { title: 'תצוגה מקדימה של האתר' });
  pvWrap = h('div', { class: 'pv-wrap' }, frame);
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'גודל מסך' },
    ...[['desktop', 'מחשב'], ['mobile', 'טלפון']].map(([v, t]) => h('button', { 'aria-pressed': String(S.device === v), onclick: e => { S.device = v; pvWrap.classList.toggle('mobile', v === 'mobile'); [...seg.children].forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); } }, t)));
  const closePv = h('button', { class: 'btn btn-line btn-sm', onclick: () => togglePreview(pvBtn) }, 'סגירה');
  const preview = h('aside', { class: 'preview', 'aria-label': 'תצוגה מקדימה' }, h('div', { class: 'pv-bar' }, 'תצוגה מקדימה · לפני שמירה', seg, closePv), pvWrap);
  mainEl = h('div', { class: 'main' + (S.preview ? (innerWidth > 1180 ? '' : ' show-preview') : ' no-preview') }, sideEl, editorEl, preview);
  $('#root').replaceChildren(h('div', { class: 'app' }, bar, mainEl));
  go(S.section, true);
  updateStatus();
  if (S.preview) refreshPreview();
}
function togglePreview(btn) {
  S.preview = !S.preview;
  btn.setAttribute('aria-pressed', String(S.preview));
  const wide = innerWidth > 1180;
  mainEl.classList.toggle('no-preview', !S.preview && wide);
  mainEl.classList.toggle('show-preview', S.preview && !wide);
  if (S.preview) refreshPreview();
}
async function logout() {
  if (isDirty() && !(await confirmDlg('לצאת?', 'יש שינויים שלא נשמרו. הם יישארו בטיוטה במחשב הזה.', 'יציאה'))) return;
  await api('logout', { method: 'POST' }).catch(() => {});
  showLogin();
}

function updateStatus() {
  if (!statusEl) return;
  const d = isDirty();
  statusEl.className = 'status' + (d ? ' dirty' : '');
  statusEl.lastChild.textContent = d ? 'יש שינויים שלא נשמרו' : S.deployMsg || 'הכל שמור';
  saveBtn.disabled = !d && !S.pending.size;
  undoBtn.disabled = !d;
}
function markSections() {
  const saved = JSON.parse(S.saved);
  SECTIONS.forEach(s => {
    const b = $(`[data-s="${s.id}"]`, sideEl);
    const keys = [...new Set(s.fields.filter(f => f.k).map(f => f.k))];
    const diff = keys.some(k => JSON.stringify(getIn(S.content, k)) !== JSON.stringify(getIn(saved, k)));
    b.classList.toggle('changed', diff);
    b.classList.toggle('has-err', [...S.errors.keys()].some(k => k.startsWith(s.id + ':')));
    b.setAttribute('aria-label', s.title + (diff ? ' (יש שינויים)' : ''));
  });
}

function go(id, first) {
  S.section = id;
  sideEl.classList.remove('open');
  [...sideEl.querySelectorAll('[data-s]')].forEach(b => b.setAttribute('aria-current', String(b.dataset.s === id)));
  renderEditor();
  if (!first) { editorEl.scrollTop = 0; editorEl.focus({ preventScroll: true }); }
  scrollPreview();
}

/* ---------------- editor ---------------- */
function renderEditor() {
  const sec = SECTIONS.find(s => s.id === S.section);
  const banner = $('.banner', editorEl);
  editorEl.replaceChildren(...[banner].filter(Boolean),
    h('div', { class: 'ed-head' }, h('h1', {}, sec.title), sec.intro && h('p', {}, sec.intro)),
    h('div', { class: 'fields' }, ...sec.fields.map(f => field(f, S.content, f.k, sec.id + ':' + (f.k || '')))));
  markSections();
}

/* obj + key: where the value lives; ekey: unique key for error tracking */
function field(f, obj, key, ekey) {
  if (f.type === 'note') return h('div', { class: 'note' }, h('h3', {}, f.label), f.help && h('p', {}, f.help));
  if (f.type === 'list') return listField(f, obj, key, ekey);
  if (f.type === 'strings') return stringsField(f, obj, key);
  const id = nid();
  const get = () => getIn(obj, key);
  const set = v => { setIn(obj, key, v); changed(); };
  const help = f.help && h('p', { class: 'hint', id: id + 'h' }, f.help);
  const err = h('p', { class: 'err', id: id + 'e', hidden: true });
  const label = h('label', { for: id }, f.label, f.required && h('span', { class: 'req', 'aria-hidden': 'true' }, '*'));
  const desc = [help && id + 'h', id + 'e'].filter(Boolean).join(' ');
  let control, count;
  const checkLen = v => { if (count) { count.textContent = `${v.length}/${f.max}`; count.classList.toggle('over', v.length > f.max); } };
  const validate = v => {
    let msg = '';
    if (f.required && !String(v ?? '').trim()) msg = 'צריך למלא את השדה הזה.';
    else if (f.pattern && v && !new RegExp(f.pattern).test(String(v).replace(/\s/g, ''))) msg = 'הפורמט לא נראה תקין.';
    err.hidden = !msg; err.textContent = msg;
    control?.setAttribute('aria-invalid', String(!!msg));
    msg ? S.errors.set(ekey, msg) : S.errors.delete(ekey);
  };
  if (f.max && ['text', 'textarea', 'rich'].includes(f.type)) count = h('span', { class: 'count', 'aria-hidden': 'true' });
  if (count) label.append(count);

  switch (f.type) {
    case 'text': case 'textarea': case 'rich': case 'number': {
      const multi = f.type !== 'text' && f.type !== 'number';
      control = h(multi ? 'textarea' : 'input', {
        class: 'inp', id, 'aria-describedby': desc, dir: f.dir || 'auto', placeholder: f.placeholder || '',
        ...(multi ? { rows: f.paras ? 7 : 3 } : { type: f.type === 'number' ? 'number' : 'text', min: f.min })
      });
      control.value = get() ?? '';
      control.addEventListener('input', () => { const v = f.type === 'number' ? (control.value === '' ? '' : +control.value) : control.value; set(v); checkLen(control.value); validate(v); });
      control.addEventListener('blur', () => validate(get()));
      checkLen(control.value); validate(get());
      if (f.type === 'rich') {
        const wrapB = () => {
          const { selectionStart: a, selectionEnd: b, value } = control;
          if (a === b) { toast('קודם מסמנים את המילים שרוצים להדגיש'); control.focus(); return; }
          control.setRangeText('**' + value.slice(a, b) + '**', a, b, 'end');
          control.dispatchEvent(new Event('input'));
          control.focus();
        };
        control.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); wrapB(); } });
        const bar = h('div', { class: 'rich-bar' },
          h('button', { type: 'button', onclick: wrapB, 'aria-label': 'הדגשה של הטקסט המסומן', title: 'הדגשה (Ctrl+B)' }, 'B'),
          h('small', {}, f.paras ? 'Enter = שורה חדשה · שורה ריקה = פסקה חדשה · **טקסט** = מודגש' : 'Enter = שורה חדשה · **טקסט** = מודגש'));
        return h('div', { class: 'field' }, label, help, h('div', {}, bar, control), err);
      }
      break;
    }
    case 'select':
      control = h('select', { class: 'inp', id, 'aria-describedby': desc }, ...f.options.map(o => h('option', { value: o.v, selected: o.v === get() }, o.t)));
      if (!f.options.some(o => o.v === get())) control.prepend(h('option', { value: get() || '', selected: true }, get() || '—'));
      control.addEventListener('change', () => set(control.value));
      break;
    case 'toggle': {
      control = h('input', { type: 'checkbox', id, checked: !!get(), 'aria-describedby': desc, onchange: () => set(control.checked) });
      return h('div', { class: 'field' }, h('label', { class: 'toggle', for: id }, control, f.label), help);
    }
    case 'image': case 'video':
      return mediaField(f, obj, key, id, label, help, err, validate);
  }
  return h('div', { class: 'field' }, label, help, control, err);
}

/* ---------------- media ---------------- */
const srcFor = p => !p ? '' : S.pending.get(p)?.url || S.live.get(p) || (/^(https?:|blob:|data:)/.test(p) ? p : '/' + p.replace(/^\//, ''));
const fileName = p => (p || '').split('/').pop().split('?')[0];

function mediaField(f, obj, key, id, label, help, err, validate) {
  const isVid = f.type === 'video';
  const thumb = h('div', { class: 'thumb', 'aria-hidden': 'true' });
  const name = h('div', { class: 'm-name' });
  const newTag = h('span', { class: 'new', hidden: true }, 'חדש · יעלה בשמירה');
  const file = h('input', { type: 'file', accept: isVid ? 'video/mp4' : 'image/jpeg,image/png,image/webp,image/gif', hidden: true, id });
  const paint = () => {
    const p = getIn(obj, key);
    thumb.replaceChildren();
    if (!p) thumb.textContent = 'אין קובץ';
    else if (isVid) thumb.append(h('video', { src: srcFor(p) + '#t=0.8', muted: true, preload: 'metadata', playsinline: true }));
    else thumb.append(h('img', { src: srcFor(p), alt: '' }));
    name.textContent = fileName(p);
    newTag.hidden = !S.pending.has(p);
    validate(p);
  };
  const choose = async path => { setIn(obj, key, path); paint(); changed(); };
  const take = async fl => {
    if (!fl) return;
    try { choose(await addUpload(fl, isVid)); toast(isVid ? 'הסרטון נוסף. הוא יעלה לאתר בשמירה.' : 'התמונה נוספה. היא תעלה לאתר בשמירה.'); }
    catch (e) { toast(e.message, 'err'); }
  };
  file.addEventListener('change', () => { take(file.files[0]); file.value = ''; });
  const box = h('div', { class: 'media' }, thumb,
    h('div', { class: 'm-body' },
      h('div', { class: 'm-acts' },
        h('button', { type: 'button', class: 'btn btn-line btn-sm', onclick: () => file.click(), 'aria-describedby': id + 'n' }, isVid ? 'העלאת סרטון' : 'העלאת תמונה'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: async () => { const p = await pickMedia(isVid ? 'video' : 'image'); if (p) choose(p); } }, 'בחירה מהספרייה')),
      h('div', { id: id + 'n' }, name, newTag)),
    file);
  box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag'); });
  box.addEventListener('dragleave', () => box.classList.remove('drag'));
  box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('drag'); take(e.dataTransfer.files[0]); });
  paint();
  const parts = [h('span', { class: 'lbl', id: id + 'l' }, label.childNodes[0].textContent, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null), help, box, err];
  if (f.alt) {
    const altPath = f.alt.includes('.') && !Array.isArray(obj) && obj === S.content ? f.alt : f.alt;
    const aid = nid('alt');
    const inp = h('input', { class: 'inp', id: aid, value: getIn(obj === S.content ? S.content : obj, altPath) || '', 'aria-describedby': aid + 'h', oninput: () => { setIn(obj === S.content ? S.content : obj, altPath, inp.value); changed(); } });
    parts.push(h('div', { class: 'field' }, h('label', { for: aid }, 'תיאור התמונה'), h('p', { class: 'hint', id: aid + 'h' }, 'משפט קצר על מה רואים בתמונה. עוזר לגולשים עיוורים ולגוגל.'), inp));
  }
  return h('div', { class: 'field', role: 'group', 'aria-labelledby': id + 'l' }, ...parts);
}

const MAX_IMG = 2000, MAX_VID = 40 * 1024 * 1024;
async function addUpload(fileObj, isVid) {
  let blob = fileObj, ext;
  if (isVid) {
    if (fileObj.type !== 'video/mp4') throw new Error('אפשר להעלות רק סרטוני MP4.');
    if (fileObj.size > MAX_VID) throw new Error(`הסרטון גדול מדי (${(fileObj.size / 1048576).toFixed(0)}MB). המקסימום הוא 40MB, אפשר לכווץ אותו ולנסות שוב.`);
    ext = 'mp4';
  } else {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(fileObj.type)) throw new Error('אפשר להעלות תמונות JPG, PNG, WEBP או GIF.');
    if (fileObj.type === 'image/gif') ext = 'gif';
    else {
      /* shrink + convert to webp in the browser: faster site, no extra tools */
      const bmp = await createImageBitmap(fileObj);
      const k = Math.min(1, MAX_IMG / Math.max(bmp.width, bmp.height));
      const c = h('canvas', { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.84));
      ext = 'webp';
      if (!blob || blob.type !== 'image/webp') { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86)); ext = 'jpg'; }
    }
  }
  const base = fileObj.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || (isVid ? 'video' : 'image');
  const d = new Date();
  const path = `assets/uploads/${d.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`;
  const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  S.pending.set(path, { data, url: URL.createObjectURL(blob), size: blob.size });
  return path;
}

async function pickMedia(kind) {
  const d = h('dialog', { class: 'wide', 'aria-labelledby': 'libT' });
  const grid = h('div', { class: 'lib', role: 'list' }, h('div', { class: 'loading' }, h('div', { class: 'spin' })));
  const q = h('input', { class: 'inp', type: 'search', placeholder: 'חיפוש לפי שם קובץ', 'aria-label': 'חיפוש בספרייה', style: 'max-width:280px' });
  d.append(h('div', { class: 'dlg' }, h('h2', { id: 'libT' }, kind === 'video' ? 'ספריית סרטונים' : 'ספריית תמונות'),
    h('div', { class: 'lib-tools' }, q, h('button', { class: 'btn btn-line btn-sm', style: 'margin-right:auto', onclick: () => d.close() }, 'סגירה')), grid));
  document.body.append(d); d.showModal();
  return new Promise(async res => {
    d.addEventListener('close', () => { d.remove(); res(null); });
    try { S.media ??= (await api('media')).files; } catch (e) { grid.replaceChildren(h('p', {}, e.message)); return; }
    const all = [...[...S.pending.keys()].map(p => ({ path: p, kind: /\.mp4$/.test(p) ? 'video' : 'image' })), ...S.media].filter(m => m.kind === kind);
    const paint = () => {
      const t = q.value.trim().toLowerCase();
      const list = all.filter(m => !t || m.path.toLowerCase().includes(t));
      grid.replaceChildren(...(list.length ? list.map(m => h('div', { role: 'listitem' }, h('button', { type: 'button', 'aria-label': fileName(m.path), onclick: () => { d.close(); res(m.path); } },
        kind === 'video' ? h('video', { src: srcFor(m.path) + '#t=0.8', muted: true, preload: 'metadata' }) : h('img', { src: srcFor(m.path), alt: '', loading: 'lazy' }),
        kind === 'video' && h('span', { class: 'vtag' }, fileName(m.path))))) : [h('p', {}, 'לא נמצאו קבצים.')]));
    };
    q.addEventListener('input', paint); paint();
  });
}

/* ---------------- lists ---------------- */
function itemTitle(f, it, i) {
  if (typeof it === 'string') return it;
  const v = f.title ? String(getIn(it, f.title) ?? '').replace(/\*\*/g, '').trim() : '';
  return v ? (f.titlePrefix || '') + v : '';
}
function listField(f, obj, key, ekey) {
  const wrap = h('div', { class: 'field' });
  const open = new Set();
  const paint = (focusIdx, flash) => {
    const arr = getIn(obj, key) || [];
    const canAdd = !f.fixed && (!f.max || arr.length < f.max);
    const canDel = !f.fixed && arr.length > (f.min || 0);
    const move = (i, d) => { const [x] = arr.splice(i, 1); arr.splice(i + d, 0, x); const a = open.has(i), b = open.has(i + d); open.delete(i); open.delete(i + d); if (a) open.add(i + d); if (b) open.add(i); changed(); paint(i + d, true); };
    const del = async i => {
      if (!(await confirmDlg(`למחוק את ה${f.item}?`, itemTitle(f, arr[i], i) || `${f.item} מספר ${i + 1}`, 'מחיקה', true))) return;
      arr.splice(i, 1); open.clear(); changed(); paint(); toast(`ה${f.item} נמחק/ה. אפשר לבטל עם ״ביטול שינויים״ עד שמירה.`);
    };
    const dup = i => { arr.splice(i + 1, 0, clone(arr[i])); open.add(i + 1); changed(); paint(i + 1, true); };
    const acts = i => [
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `הזזת ${f.item} ${i + 1} למעלה`, disabled: f.fixed || i === 0, onclick: () => move(i, -1) }, icon('up')),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `הזזת ${f.item} ${i + 1} למטה`, disabled: f.fixed || i === arr.length - 1, onclick: () => move(i, 1) }, icon('down')),
      canAdd && h('button', { type: 'button', class: 'icon-btn', 'aria-label': `שכפול ${f.item} ${i + 1}`, onclick: () => dup(i) }, icon('copy')),
      canDel && h('button', { type: 'button', class: 'icon-btn danger', 'aria-label': `מחיקת ${f.item} ${i + 1}`, onclick: () => del(i) }, icon('del'))
    ];
    let body;
    if (f.grid) {
      body = h('div', { class: 'grid-list', role: 'list' }, ...arr.map((it, i) => {
        const img = h('div', { class: 'gimg', style: `background-image:url("${srcFor(it.src)}")` },
          h('button', { type: 'button', onclick: async () => { const p = await pickOrUpload(); if (p) { it.src = p; changed(); paint(i, true); } } }, 'החלפה'));
        const alt = h('input', { value: it.alt || '', placeholder: 'תיאור התמונה', 'aria-label': `תיאור תמונה ${i + 1}`, oninput: () => { it.alt = alt.value; changed(); } });
        return h('div', { class: 'gcard' + (flash && i === focusIdx ? ' item flash' : ''), role: 'listitem' }, img, alt, h('div', { class: 'gacts' }, ...acts(i)));
      }));
    } else {
      body = h('div', { class: 'list', role: 'list' }, ...arr.map((it, i) => {
        const bid = nid('it'), title = itemTitle(f, it, i), isOpen = open.has(i);
        const tgl = h('button', { type: 'button', class: 'tgl', 'aria-expanded': String(isOpen), 'aria-controls': bid, onclick: () => { isOpen ? open.delete(i) : open.add(i); paint(i); } },
          h('span', { class: 'n', 'aria-hidden': 'true' }, i + 1),
          h('span', { class: 't' + (title ? '' : ' empty') }, title || `${f.item} חדש/ה`),
          h('span', { class: 'sr' }, `${f.item} ${i + 1}`), icon('chev'));
        const head = h('div', { class: 'item-head' }, tgl, ...acts(i));
        const content = isOpen && h('div', { class: 'item-body', id: bid }, ...f.fields.map(sf => field(sf, it, sf.k, `${ekey}.${i}.${sf.k}`)));
        const el = h('div', { class: 'item' + (flash && i === focusIdx ? ' flash' : ''), role: 'listitem' }, head, content);
        if (!isOpen) f.fields.forEach(sf => { if (sf.required && !String(getIn(it, sf.k) ?? '').trim()) S.errors.set(`${ekey}.${i}.${sf.k}`, 'חסר'); else S.errors.delete(`${ekey}.${i}.${sf.k}`); });
        return el;
      }));
    }
    const addBtn = canAdd && h('button', { type: 'button', class: 'btn btn-line btn-sm', onclick: async () => {
      let blank = clone(f.blank || {});
      if (f.grid) { const p = await pickOrUpload(); if (!p) return; blank.src = p; }
      arr.push(blank); open.clear(); open.add(arr.length - 1); changed(); paint(arr.length - 1, true);
      setTimeout(() => wrap.querySelector('.item:last-child input, .item:last-child textarea, .gcard:last-child input')?.focus(), 30);
    } }, icon('plus'), `הוספת ${f.item}`);
    fill(wrap, h('span', { class: 'lbl' }, f.label, h('span', { class: 'count' }, `${arr.length}${f.max && !f.fixed ? ' מתוך ' + f.max : ''}`)), f.help && h('p', { class: 'hint' }, f.help), body,
      (addBtn || f.fixed) && h('div', { class: 'list-foot' }, addBtn, f.fixed && h('small', {}, 'מספר הפריטים כאן קבוע כדי לשמור על העיצוב.')));
    if (focusIdx != null && !flash) wrap.querySelectorAll('.tgl')[focusIdx]?.focus();
    markSections();
  };
  paint();
  return wrap;
}
async function pickOrUpload() {
  return new Promise(res => {
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', hidden: true });
    const d = h('dialog', { 'aria-labelledby': 'puT' }, h('div', { class: 'dlg' }, h('h2', { id: 'puT' }, 'איזו תמונה?'), h('p', {}, 'אפשר להעלות תמונה חדשה מהמחשב או מהטלפון, או לבחור תמונה שכבר קיימת באתר.'),
      h('div', { class: 'dlg-acts' },
        h('button', { class: 'btn btn-gold', onclick: () => file.click() }, 'העלאת תמונה'),
        h('button', { class: 'btn btn-line', onclick: async () => { d.close(); res(await pickMedia('image')); } }, 'בחירה מהספרייה'),
        h('button', { class: 'btn btn-ghost', onclick: () => { d.close(); res(null); } }, 'ביטול'))), file);
    file.addEventListener('change', async () => { d.close(); try { res(await addUpload(file.files[0], false)); } catch (e) { toast(e.message, 'err'); res(null); } });
    d.addEventListener('cancel', () => res(null));
    document.body.append(d); d.showModal();
  });
}
function stringsField(f, obj, key) {
  const wrap = h('div', { class: 'field', role: 'group' });
  const paint = () => {
    const arr = getIn(obj, key) || [];
    const lid = nid('s');
    fill(wrap, h('span', { class: 'lbl', id: lid }, f.label),
      h('div', { class: 'strings' }, ...arr.map((v, i) => {
        const inp = h('input', { class: 'inp', value: v, 'aria-label': `${f.item} ${i + 1}`, maxlength: f.maxLen || f.max || 60, oninput: () => { arr[i] = inp.value; changed(); } });
        return h('div', { class: 'str-row' }, inp,
          !f.fixed && h('button', { type: 'button', class: 'icon-btn', 'aria-label': `הזזת ${f.item} ${i + 1} למעלה`, disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); changed(); paint(); } }, icon('up')),
          !f.fixed && arr.length > (f.min || 0) && h('button', { type: 'button', class: 'icon-btn danger', 'aria-label': `מחיקת ${f.item} ${i + 1}`, onclick: () => { arr.splice(i, 1); changed(); paint(); } }, icon('del')));
      })),
      !f.fixed && (!f.max || arr.length < f.max) && h('div', { class: 'list-foot' }, h('button', { type: 'button', class: 'btn btn-line btn-sm', onclick: () => { arr.push(''); changed(); paint(); wrap.querySelector('.str-row:last-child input')?.focus(); } }, icon('plus'), `הוספת ${f.item}`)));
    wrap.setAttribute('aria-labelledby', lid);
  };
  paint();
  return wrap;
}

/* ---------------- preview ---------------- */
function previewHtml() {
  /* swap paths of files that are not on the server yet for their local copies */
  let txt = JSON.stringify(S.content);
  for (const [p, v] of [...S.pending, ...[...S.live].map(([p, u]) => [p, { url: u }])]) txt = txt.split(JSON.stringify(p).slice(1, -1)).join(v.url);
  let html = render(S.template, JSON.parse(txt));
  return html.replace('<head>', '<head><base href="/" target="_blank"><script>try{sessionStorage.setItem("nl-seen","1")}catch(e){}<\/script>');
}
let pvY = 0;
function refreshPreview() {
  if (!S.preview || !frame) return;
  try { pvY = frame.contentWindow?.scrollY || 0; } catch {}
  try { frame.srcdoc = previewHtml(); } catch (e) { console.error(e); return; }
  frame.onload = () => {
    const w = frame.contentWindow;
    w.document.querySelectorAll('a[href^="#"]').forEach(a => a.target = '_self');
    if (pvY) w.scrollTo(0, pvY); else scrollPreview();
    pvY = 0;
  };
}
const schedulePreview = debounce(refreshPreview, 450);
function scrollPreview() {
  if (!S.preview || !frame?.contentDocument) return;
  const sec = SECTIONS.find(s => s.id === S.section);
  const d = frame.contentDocument;
  const el = sec.anchor === 'top' ? d.body : sec.anchor === 'footer' ? d.querySelector('footer') : d.getElementById(sec.anchor);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------- validation ---------------- */
function validateAll() {
  const errs = [];
  const walk = (fields, obj, sid, label) => fields.forEach(f => {
    if (!f.k) return;
    const v = getIn(obj, f.k);
    if (f.type === 'list') (v || []).forEach((it, i) => walk(f.fields, it, sid, `${f.item} ${i + 1}`));
    else if (f.required && !String(v ?? '').trim()) errs.push({ sid, msg: `${label ? label + ': ' : ''}${f.label}` });
    else if (f.pattern && v && !new RegExp(f.pattern).test(String(v).replace(/\s/g, ''))) errs.push({ sid, msg: `${f.label}: הפורמט לא תקין` });
  });
  SECTIONS.forEach(s => walk(s.fields, S.content, s.id, ''));
  return errs;
}

/* ---------------- save / discard ---------------- */
let saving = false;
async function save() {
  if (saving || (!isDirty() && !S.pending.size)) return;
  const errs = validateAll();
  if (errs.length) {
    const sec = SECTIONS.find(s => s.id === errs[0].sid);
    go(sec.id);
    toast(`לפני השמירה צריך להשלים: ${sec.title}, ${errs[0].msg}` + (errs.length > 1 ? ` (ועוד ${errs.length - 1})` : ''), 'err', 7000);
    setTimeout(() => editorEl.querySelector('[aria-invalid="true"]')?.focus(), 80);
    return;
  }
  const txt = JSON.stringify(S.content);
  const files = [...S.pending].filter(([p]) => txt.includes(p)).map(([path, v]) => ({ path, data: v.data }));
  saving = true;
  saveBtn.disabled = true;
  statusEl.className = 'status busy';
  statusEl.lastChild.textContent = files.length ? `מעלה ${files.length} קבצים ושומר…` : 'שומר…';
  try {
    const r = await api('content', { method: 'PUT', body: JSON.stringify({ content: S.content, sha: S.sha, files }) });
    S.sha = r.sha;
    S.saved = txt;
    for (const [p, v] of S.pending) if (txt.includes(p)) S.live.set(p, v.url);
    S.pending.clear();
    S.media = null;
    try { localStorage.removeItem(DRAFT); } catch {}
    toast('נשמר! האתר יתעדכן תוך כדקה.', 'ok');
    renderEditor();
    watchDeploy(txt);
  } catch (e) {
    if (e.message !== '401') toast(e.message, 'err', 8000);
    if (e.status === 409) { const ok = await confirmDlg('הגרסה באתר השתנתה', 'כדי לא לדרוס שינויים של מישהו אחר, צריך לטעון את הגרסה העדכנית. השינויים שלך נשמרו בטיוטה ויוצע לשחזר אותם.', 'טעינה מחדש'); if (ok) { try { localStorage.setItem(DRAFT, JSON.stringify({ content: S.content, sha: S.sha, at: Date.now() })); } catch {} location.reload(); } }
  } finally {
    saving = false;
    updateStatus();
    markSections();
  }
}
/* the live site has picked up the save once its content.json matches */
async function watchDeploy(txt) {
  const want = JSON.stringify(JSON.parse(txt));
  S.deployMsg = 'מעדכן את האתר…'; updateStatus();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 6000));
    if (JSON.stringify(S.content) !== want && isDirty()) break;
    try {
      const live = await (await fetch('/content/content.json?t=' + Date.now(), { cache: 'no-store' })).json();
      if (JSON.stringify(live) === want) { S.deployMsg = 'האתר עודכן ✓'; updateStatus(); toast('האתר החי עודכן ✓', 'ok'); setTimeout(() => { S.deployMsg = ''; updateStatus(); }, 8000); return; }
    } catch {}
  }
  S.deployMsg = ''; updateStatus();
}
async function discard() {
  if (!isDirty()) return;
  if (!(await confirmDlg('לבטל את כל השינויים?', 'האתר יחזור למצב השמור האחרון. אי אפשר לשחזר את מה שנמחק.', 'ביטול השינויים', true))) return;
  S.content = JSON.parse(S.saved);
  S.pending.clear();
  S.errors.clear();
  try { localStorage.removeItem(DRAFT); } catch {}
  renderEditor(); changed();
  toast('השינויים בוטלו');
}

addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.content) { e.preventDefault(); save(); } });
addEventListener('beforeunload', e => { if (S.content && (isDirty() || S.pending.size)) { e.preventDefault(); e.returnValue = ''; } });

boot();
