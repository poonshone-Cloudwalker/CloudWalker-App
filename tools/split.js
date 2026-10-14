#!/usr/bin/env node
/* One-time tool: splits the V09.1 single file into src/. Kept for the record and for re-running
 * against a newer single-file build. Usage: node tools/split.js <app.html>
 * The split is lossless: `node build.js --verify <app.html>` must reproduce the input byte for byte. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'src');
const html = fs.readFileSync(process.argv[2], 'utf8'); const L = html.split('\n');
const find = (re, from = 0) => { for (let i = from; i < L.length; i++) if (re.test(L[i])) return i; throw new Error('not found ' + re); };
const join = (a, b) => L.slice(a, b).join('\n') + '\n'; /* lines [a, b) with a trailing newline */
const slug = s => s.toLowerCase().replace(/v09\s*/g, 'v09-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-').slice(0, 44).replace(/-+$/, '');
const write = (rel, text) => { const f = path.join(SRC, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return rel; };
fs.rmSync(SRC, { recursive: true, force: true });

const iStyle = find(/^<style>$/), iStyleEnd = find(/^<\/style>$/, iStyle), iBank = find(/^<script type="application\/json" id="bank-data">/), iScript = find(/^<script>$/, iBank);
const iScriptEnd = L.lastIndexOf('</script>');
if (L.slice(iScriptEnd).join('\n') !== '</script>\n</body>\n</html>\n') throw new Error('unexpected tail');
const manifest = { output: 'dist/BluePrint_CloudWalker.html', head: write('shell/head.html', join(0, iStyle + 1)), css: [], body: write('shell/body.html', join(iStyleEnd, iBank)), bank: { head: '', chunks: [] }, js: [] };

/* CSS: one file per "---------- Section ----------" block */
const cssMarks = []; for (let i = iStyle + 1; i < iStyleEnd; i++) if (/^\/\* -{10} .* -{10} \*\/$/.test(L[i])) cssMarks.push(i);
if (cssMarks[0] !== iStyle + 1) cssMarks.unshift(iStyle + 1);
cssMarks.forEach((a, k) => { const b = cssMarks[k + 1] ?? iStyleEnd; const name = (L[a].match(/-{10} (.*) -{10}/) || [, 'base'])[1]; manifest.css.push(write(`css/${String(k + 1).padStart(2, '0')}-${slug(name)}.css`, join(a, b))); });

/* Bank: header and chunks become plain JSON files; build.js writes the script tags back */
const headM = L[iBank].match(/^<script type="application\/json" id="bank-data">(.*)<\/script>$/); JSON.parse(headM[1]);
manifest.bank.head = write('content/bank/bank-head.json', headM[1]);
for (let i = iBank + 1; i < iScript; i++) { const m = L[i].match(/^<script type="application\/json" class="bank-chunk" data-i="(\d+)">(.*)<\/script>$/); if (!m || +m[1] !== manifest.bank.chunks.length) throw new Error('chunk line ' + i); JSON.parse(m[2]); manifest.bank.chunks.push(write(`content/bank/chunk-${m[1].padStart(2, '0')}.json`, m[2])); }

/* JS: phase and top-level markers are mandatory cuts; long segments are cut again at sub-markers */
const jsA = iScript + 1, jsB = iScriptEnd;
const isMajor = s => /^ ?\/\* (={10,}|-{40,})/.test(s), isSub = s => /^ ?\/\* -{10} /.test(s);
const gStart = find(/^const GLOSSARY_SEED = \{$/, jsA), gEnd = find(/^\};$/, gStart);
const majors = [jsA]; for (let i = jsA + 1; i < jsB; i++) if (isMajor(L[i])) majors.push(i);
const cuts = [];
majors.forEach((a, k) => { const b = majors[k + 1] ?? jsB; cuts.push(a); let last = a;
  for (let i = a + 1; i < b; i++) { if (i === gStart) { cuts.push(i, gEnd + 1); last = gEnd + 1; i = gEnd; continue; } if (isSub(L[i]) && i - last > 450 && b - i > 120) { cuts.push(i); last = i; } } });
const uniqCuts = [...new Set(cuts)].sort((x, y) => x - y);
const firstFeature = find(/Phase 2 content/, jsA); let n = 0, curPhase = 'core';
uniqCuts.forEach((a, k) => { const b = uniqCuts[k + 1] ?? jsB;
  if (a === gStart) { manifest.js.push({ json: write('content/glossary-seed.json', L.slice(gStart, gEnd + 1).join('\n').replace(/^const GLOSSARY_SEED = /, '').replace(/;$/, '')), prefix: 'const GLOSSARY_SEED = ', suffix: ';\n' }); return; }
  const m = L[a].match(/(?:={10,}|-{10,})\s*(.*?)\s*(?:\*\/)?$/); let title = m && m[1] ? m[1] : (a === jsA ? 'developer notes and helpers' : 'continued');
  if (isMajor(L[a]) && /={10,}/.test(L[a])) curPhase = slug(title.replace(/:.*$/, '')).replace(/-content.*/, '');
  const RENAME = { 'continued': 'glossary-views-and-search', 'binding-and-events': 'phase-2-binding-and-events' };
  if (/^Boot$/.test(title)) { manifest.js.push(write('js/boot.js', join(a, b))); return; }
  title = RENAME[slug(title)] || title;
  const dir = a < firstFeature ? 'js/core' : 'js/features'; const pre = a < firstFeature || /^phase-/.test(slug(title)) || /^v09-/.test(slug(title)) ? '' : (isMajor(L[a]) && /={10,}/.test(L[a]) ? '' : curPhase + '-');
  manifest.js.push(write(`${dir}/${String(++n * 10).padStart(3, '0')}-${(pre + slug(title)).slice(0, 52).replace(/-+$/, '')}.js`, join(a, b))); });
fs.writeFileSync(path.join(SRC, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`css ${manifest.css.length} files, bank ${manifest.bank.chunks.length} chunks, js ${manifest.js.length} parts`);
