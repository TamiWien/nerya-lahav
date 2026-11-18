// Rebuild index.html from cms/template.html + content/content.json.
// Run after editing the template locally:  node cms/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { render } from './render.js';

const root = new URL('..', import.meta.url);
const tpl = readFileSync(new URL('cms/template.html', root), 'utf8');
const content = JSON.parse(readFileSync(new URL('content/content.json', root), 'utf8'));
const out = process.argv[2] || 'index.html';
writeFileSync(new URL(out, root), render(tpl, content));
console.log('built', out);
