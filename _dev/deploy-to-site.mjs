// Publish Split-Flap to maclaine.se/split-flap (Swedish) and /en/split-flap (English).
//
// Same arrangement as Tunnelbana: the site is a separate Cloudflare Pages project
// (repo: personal-website) and the board lives at a PATH on the apex domain, so the
// shipping files are copied into the site repo and deploy with it.
//
// THIS REPO REMAINS THE SOURCE OF TRUTH. Never edit the copies in personal-website by
// hand: run this and it mirrors exactly, deleting anything that no longer exists here.
// Both site pages are generated from index.html plus the site/ templates (SEO head,
// Swedish copy), so the two languages cannot drift apart.
//
//   node _dev/deploy-to-site.mjs            # copy, then print what changed
//   node _dev/deploy-to-site.mjs --check    # report drift only, change nothing
import { readdirSync, statSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const SRC = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const SITE = process.env.SITE || '/Users/matthewmaclaine/personal website';
const CHECK = process.argv.includes('--check');
const ASSET_DIR = join(SITE, 'split-flap');

const SHIP_DIRS = ['src', 'data', 'fonts', 'icons'];

// CHANGELOG.md follows src/changelog.js, so a deploy never ships a log the repo lacks.
await import('./gen-changelog.mjs');

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, out); else out.push(relative(base, p));
  }
  return out;
}

// Everything the site should contain, as { path: Buffer | string }.
const want = new Map();
for (const d of SHIP_DIRS) for (const f of walk(join(SRC, d))) want.set(join(ASSET_DIR, d, f), readFileSync(join(SRC, d, f)));

// The manifest's start_url and scope must name the page, not the asset folder.
const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.webmanifest'), 'utf8'));
manifest.start_url = '/split-flap'; manifest.scope = '/split-flap';
manifest.icons = manifest.icons.map(i => ({ ...i, src: '/split-flap/' + i.src }));
want.set(join(ASSET_DIR, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

want.set(join(SITE, 'split-flap-sw.js'), readFileSync(join(SRC, 'sw.js')));
want.set(join(SITE, 'images', 'og-split-flap.png'), readFileSync(join(SRC, 'site', 'og-split-flap.png')));

const html = readFileSync(join(SRC, 'index.html'), 'utf8');
const between = (s, tag, repl) => {
  const a = s.indexOf(`<!-- ${tag} -->`), b = s.indexOf(`<!-- /${tag} -->`);
  if (a < 0 || b < 0) throw new Error(`index.html is missing the ${tag} markers`);
  return s.slice(0, a) + repl.trim() + '\n' + s.slice(b + `<!-- /${tag} -->`.length).replace(/^\n/, '');
};
function page(lang) {
  let s = html;
  s = between(s, 'sf:head', readFileSync(join(SRC, 'site', `head.${lang}.html`), 'utf8'));
  if (lang === 'sv') s = between(s, 'sf:about', readFileSync(join(SRC, 'site', 'about.sv.html'), 'utf8'));
  else s = s.replace(/[ \t]*<!-- \/?sf:about -->\n/g, '');
  s = s.replace('<html lang="en">', `<html lang="${lang}">`);
  s = s.replace(/(href|src)="\.\/(src|fonts|icons)\//g, '$1="/split-flap/$2/');
  s = s.replace('data-sw="./sw.js"', `data-sw="/split-flap-sw.js?assets=/split-flap/" data-sw-scope="${lang === 'sv' ? '/split-flap' : '/en/split-flap'}"`);
  s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<!-- GENERATED from github.com/MMacLaine/split-flap by _dev/deploy-to-site.mjs. Edit there, not here. -->');
  if (/="\.\//.test(s)) throw new Error(`relative path left in the ${lang} page`);
  return s;
}
want.set(join(SITE, 'split-flap.html'), page('sv'));
want.set(join(SITE, 'en', 'split-flap.html'), page('en'));

// Diff against what is there now.
const have = existsSync(ASSET_DIR) ? walk(ASSET_DIR).map(f => join(ASSET_DIR, f)) : [];
const changed = [], added = [], removed = have.filter(p => !want.has(p));
for (const [p, body] of want) {
  if (!existsSync(p)) added.push(p);
  else if (!readFileSync(p).equals(Buffer.isBuffer(body) ? body : Buffer.from(body))) changed.push(p);
}
const rel = p => relative(SITE, p);
for (const [label, list] of [['added', added], ['changed', changed], ['removed', removed]]) for (const p of list) console.log(`${label.padEnd(8)} ${rel(p)}`);
if (!added.length && !changed.length && !removed.length) console.log('in sync');

if (CHECK) process.exit(added.length || changed.length || removed.length ? 1 : 0);
for (const p of [...added, ...changed]) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, want.get(p)); }
for (const p of removed) rmSync(p);
