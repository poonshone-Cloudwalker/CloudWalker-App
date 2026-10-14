#!/usr/bin/env node
/* CloudWalker build: stitches src/ back into one offline HTML file.
 *   node build.js                     build dist/BluePrint_CloudWalker.html
 *   node build.js --verify <file>     also check the output is byte-identical to <file>
 * Checks every run: manifest files exist, JSON content parses, the app script compiles,
 * no \uXXXX escapes in source, and the bank chunks keep their order. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = __dirname, SRC = path.join(ROOT, 'src');
const M = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const read = rel => { const f = path.join(SRC, rel); if (!fs.existsSync(f)) throw new Error(`manifest lists a missing file: src/${rel}`); return fs.readFileSync(f, 'utf8'); };
const errs = [];
const json = rel => { const t = read(rel); try { JSON.parse(t); } catch (e) { errs.push(`src/${rel}: invalid JSON (${e.message})`); } return t; };

const css = M.css.map(read).join('');
const bank = [`<script type="application/json" id="bank-data">${json(M.bank.head)}</script>\n`,
  ...M.bank.chunks.map((c, i) => `<script type="application/json" class="bank-chunk" data-i="${i}">${json(c)}</script>\n`)].join('');
const js = M.js.map(p => typeof p === 'string' ? read(p) : p.prefix + json(p.json) + p.suffix).join('');
const out = read(M.head) + css + read(M.body) + bank + '<script>\n' + js + '</script>\n</body>\n</html>\n';

try { new Function(js); } catch (e) { errs.push(`app script does not compile: ${e.message}`); }
for (const [name, text] of [['css', css], ['js', js]]) { const m = text.match(/\\u[0-9a-fA-F]{4}/); if (m) errs.push(`${name} contains a \\uXXXX escape near "${text.slice(Math.max(0, m.index - 30), m.index + 10)}"`); }
const seen = new Set(); for (const p of [...M.css, ...M.js.map(p => p.json || p)]) { if (seen.has(p)) errs.push(`manifest lists ${p} twice`); seen.add(p); }
for (const dir of ['css', 'js/core', 'js/features']) { const d = path.join(SRC, dir); if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (!seen.has(`${dir}/${f}`)) errs.push(`src/${dir}/${f} is not in manifest.json, so it would be left out`); }
if (errs.length) { console.error('Build failed:\n  ' + errs.join('\n  ')); process.exit(1); }

const dest = path.join(ROOT, M.output); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, out);
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`Built ${M.output}: ${kb(Buffer.byteLength(out))} (${kb(zlib.gzipSync(out).length)} gzipped) from ${M.css.length} CSS, ${M.js.length} JS and ${M.bank.chunks.length + 1} bank files.`);
const v = process.argv.indexOf('--verify');
if (v > 0) { const ref = fs.readFileSync(process.argv[v + 1], 'utf8'); if (ref === out) console.log('Verify: identical to ' + path.basename(process.argv[v + 1]) + '.'); else { let i = 0; while (ref[i] === out[i]) i++; console.error(`Verify: differs at byte ${i}: …${JSON.stringify(out.slice(i, i + 60))} vs …${JSON.stringify(ref.slice(i, i + 60))}`); process.exit(2); } }
