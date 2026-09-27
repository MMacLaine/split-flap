// Write CHANGELOG.md from src/changelog.js (the single source; the app shows the same
// entries in its version log). Run by deploy-to-site.mjs, or on its own:
//   node _dev/gen-changelog.mjs
import { writeFileSync } from 'node:fs';
import { CHANGELOG } from '../src/changelog.js';
let md = '# Changelog\n\nEach version is a release, newest first. The app shows this log under Edit, at the foot of the page list.\n';
for (const r of CHANGELOG) {
  md += `\n## v${r.v} (${r.date}): ${r.tag.en}\n\n${r.desc.en}\n\n`;
  for (const it of r.items.en) md += `- ${it}\n`;
}
writeFileSync(new URL('../CHANGELOG.md', import.meta.url), md);
console.log(`CHANGELOG.md: ${CHANGELOG.length} version(s), latest v${CHANGELOG[0].v}`);
