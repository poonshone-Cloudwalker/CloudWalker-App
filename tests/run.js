#!/usr/bin/env node
/* Regression suite for the built app (Playwright + Chromium).
 *   node tests/run.js                 build, then run every test
 *   node tests/run.js packs exam-     run only tests whose name contains one of the words
 *   node tests/run.js --update        save the current output as the expected output
 *   node tests/run.js --no-build      test the existing dist/ build
 * Exact tests must print the same lines as tests/expected/<name>.txt. Smoke tests depend on today's
 * date, timers or random shuffles, so they only have to finish without page errors. */
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), SUITE = path.join(__dirname, 'suite'), WORK = path.join(__dirname, '.work'), EXP = path.join(__dirname, 'expected');
const SMOKE = ['backups-and-fast-close', 'onboarding-and-path', 'content-review', 'exam-formats-and-sim', 'exam-timer-and-ordering', 'lessons-and-foundations', 'ai-feedback-and-calibration', 'habits-and-calendar', 'practice-bank-packs'];
const args = process.argv.slice(2), update = args.includes('--update'), words = args.filter(a => !a.startsWith('--'));
if (!args.includes('--no-build')) execFileSync('node', [path.join(ROOT, 'build.js')], { stdio: 'inherit' });
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifest.json'), 'utf8')); const DIST = path.join(ROOT, M.output);
const nodePath = [process.env.NODE_PATH, (() => { try { return execFileSync('npm', ['root', '-g']).toString().trim(); } catch { return ''; } })(), path.join(ROOT, 'node_modules')].filter(Boolean).join(path.delimiter);

fs.rmSync(WORK, { recursive: true, force: true }); fs.cpSync(path.join(__dirname, 'fixtures'), WORK, { recursive: true }); fs.mkdirSync(EXP, { recursive: true });
const tests = fs.readdirSync(SUITE).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(n => !words.length || words.some(w => n.includes(w))).sort();

/* The hosted-PWA test needs the build served over http on port 8731 */
const server = http.createServer((req, res) => { const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(path.dirname(DIST), p === '/' ? path.basename(DIST) : p); if (!f.startsWith(path.dirname(DIST)) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(res); });
const run = name => new Promise(resolve => {
  const src = fs.readFileSync(path.join(SUITE, name + '.js'), 'utf8').split('__CW_APP__').join('file://' + DIST);
  const file = path.join(WORK, name + '.js'); fs.writeFileSync(file, src); let out = ''; const t0 = Date.now();
  const ch = spawn('node', [file], { cwd: WORK, env: { ...process.env, NODE_PATH: nodePath, CW_ROOT: ROOT } });
  const kill = setTimeout(() => ch.kill('SIGKILL'), 300000);
  ch.stdout.on('data', d => out += d); ch.stderr.on('data', d => out += d);
  ch.on('close', code => { clearTimeout(kill); resolve({ name, code, out, s: Math.round((Date.now() - t0) / 1000) }); });
});
(async () => {
  await new Promise(r => server.listen(8731, r)); const rows = []; let failed = 0;
  for (const name of tests) {
    const r = await run(name); fs.writeFileSync(path.join(WORK, name + '.out.txt'), r.out);
    const smoke = SMOKE.includes(name); const pageErr = /^ERR /m.test(r.out) || /errors:? \[\s*['"]/.test(r.out); const expF = path.join(EXP, name + '.txt');
    let status;
    if (r.code !== 0) status = 'FAIL (crashed)'; else if (pageErr) status = 'FAIL (page errors)';
    else if (smoke) status = 'pass (smoke)';
    else if (update || !fs.existsSync(expF)) { fs.writeFileSync(expF, r.out); status = 'saved as expected'; }
    else status = fs.readFileSync(expF, 'utf8') === r.out ? 'pass' : 'FAIL (output changed)';
    if (status.startsWith('FAIL')) failed++; rows.push([name, status, r.s + 's']); console.log(`${status.padEnd(22)} ${name} (${r.s}s)`);
  }
  server.close();
  console.log(`\n${tests.length - failed} of ${tests.length} passed.${failed ? ' Outputs are in tests/.work/<name>.out.txt; compare with tests/expected/<name>.txt.' : ''}`);
  process.exit(failed ? 1 : 0);
})();
