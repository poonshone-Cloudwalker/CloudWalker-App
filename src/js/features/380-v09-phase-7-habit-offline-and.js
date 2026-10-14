/* ================================================================== V09 Phase 7: habit, offline, and install
 * - Installable: a web app manifest is built at runtime as a Blob (same origin as the page), and a
 *   service worker caches the app shell when the app is served over http(s). Browsers do not allow
 *   service workers on file:// pages or from blob:/data: URLs, so the app detects that, says so, and
 *   offers the two-file hosting setup (this HTML plus cloudwalker-sw.js) for any static host.
 * - Habits: a daily goal in minutes or cards, a streak with one automatic freeze per week, a Today
 *   card (due reviews, next lesson, next lab, days to exam), opt-in reminders while the app is open,
 *   and an .ics calendar export of the study plan when notifications are not available.
 * - Weekly review: time vs plan, accuracy trend, weakest domain, one thing to change; exports as Markdown.
 * Active time is counted only while this page is visible and you touched, typed, or scrolled in the
 * last two minutes, in 30-second steps. Nothing is sent anywhere. */

/* ---------- Habit state (in the workspace, so it travels with exports) */
const HB = () => {
  const h = (S.ws.habit ||= {});
  h.goal ||= { type: 'cards', value: 20, updated: 0 }; h.days ||= {}; h.weekNotes ||= {};
  h.remind ||= { on: false, time: '19:00', lastNotified: '', updated: 0 }; h.startedAt ||= startOfDay(Date.now());
  return h;
};
const dayStr = t => isoDate(t);
const weekKeyOf = t => isoDate(mondayOf(t));
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return startOfDay(d.getTime()); };

/* Active minutes: 30-second ticks while visible and recently used */
let p7LastInput = Date.now(), p7Pending = 0;
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => window.addEventListener(ev, () => { p7LastInput = Date.now(); }, { passive: true, capture: true }));
function p7Tick() {
  if (document.visibilityState !== 'visible' || Date.now() - p7LastInput > 120000 || !S.ws) return;
  const d = HB().days[dayStr(Date.now())] ||= { min: 0 }; d.min = Math.round((d.min + 0.5) * 2) / 2; d.updated = Date.now();
  if (++p7Pending >= 4) { p7Pending = 0; markDirty(); }
}
setInterval(p7Tick, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && p7Pending) { p7Pending = 0; markDirty(); } });

/* Cards = questions answered (any mode) + recall cards graded, per local day */
function cardsByDay() {
  const m = {};
  for (const arr of Object.values(S.progress.answers)) for (const a of arr) { const k = dayStr(a.t); m[k] = (m[k] || 0) + 1; }
  for (const r of (S.ws.recallLog || [])) { const k = dayStr(r.t); m[k] = (m[k] || 0) + 1; }
  return m;
}
function dayStats(k, cbd = cardsByDay()) { return { cards: cbd[k] || 0, min: HB().days[k]?.min || 0 }; }
function goalMet(k, cbd) { const g = HB().goal; const s = dayStats(k, cbd); return g.type === 'minutes' ? s.min >= g.value : s.cards >= g.value; }
function streakInfo() {
  const h = HB(); const cbd = cardsByDay(); const today = startOfDay(Date.now()); const start = startOfDay(h.startedAt);
  let streak = 0; const frozen = [], usedWeek = new Set(); let earliestMet = null;
  for (let d = today, i = 0; d >= start && i < 800; d = addDays(d, -1), i++) {
    const k = dayStr(d);
    if (goalMet(k, cbd)) { streak++; earliestMet = d; continue; }
    if (d === today) continue;
    const wk = weekKeyOf(d); if (!usedWeek.has(wk)) { usedWeek.add(wk); frozen.push(d); continue; }
    break;
  }
  const bridging = frozen.filter(d => earliestMet !== null && d > earliestMet);
  const thisWeek = weekKeyOf(today); const usedThisWeek = bridging.find(d => weekKeyOf(d) === thisWeek) || null;
  return { streak, frozen: bridging, todayMet: goalMet(dayStr(today), cbd), today: dayStats(dayStr(today), cbd), freezeLeft: !usedThisWeek, freezeUsedOn: usedThisWeek };
}
function examDateInfo() {
  const p = cwProfile(); const iso = p.examDate || S.ws.plan?.examDate || ''; const code = p.targetExam || S.ws.plan?.code || '';
  if (!iso) return null; const days = Math.round((parseISO(iso) - startOfDay(Date.now())) / DAY);
  return { iso, code, days };
}
function nextLessonInfo() { try { const code = lessonsExam(); const fnd = isNonTechnical() && foundationsDone() < lessonsOf('FOUND').length; const list = fnd ? lessonsOf('FOUND') : lessonsOf(code); return list.find(l => lessonStatus(l.id) !== 'passed') || null; } catch { return null; } }

/* ---------- Today card */
function todayCard(full) {
  const h = HB(); const st = streakInfo(); const g = h.goal; const cur = g.type === 'minutes' ? st.today.min : st.today.cards;
  const due = reviewCount(); const les = nextLessonInfo(); const lab = nextLab(); const ex = examDateInfo();
  const unitN = n => g.type === 'minutes' ? (n === 1 ? 'minute' : 'minutes') : (n === 1 ? 'card' : 'cards'); const unit = unitN(g.value);
  const tile = (label, val, href, cta) => `<a class="td-tile" href="${href}"><span class="tl">${label}</span><span class="tv">${val}</span>${cta ? `<span class="small muted">${cta}</span>` : ''}</a>`;
  return `<section class="card td-card" aria-labelledby="h-td"><div class="card-head"><h2 id="h-td">Today</h2>${full ? '' : '<a class="small" href="#/today">Goal and reminders</a>'}</div>
    <div class="td-goal"><div class="td-ring" role="img" aria-label="Daily goal: ${Math.floor(cur)} of ${g.value} ${unit}">${ringSvg(Math.min(1, cur / g.value))}<span>${Math.floor(cur)}<small>/${g.value}</small></span></div>
      <div><p><strong>${st.todayMet ? 'Goal met today.' : `${Math.max(0, Math.ceil(g.value - cur))} ${unitN(Math.max(0, Math.ceil(g.value - cur)))} to go.`}</strong> Daily goal: ${g.value} ${unit}.</p>
      <p class="small">Streak: <strong>${st.streak} day${st.streak === 1 ? '' : 's'}</strong> · Freeze this week: ${st.freezeLeft ? 'available' : `used on ${new Date(st.freezeUsedOn).toLocaleDateString(undefined, { weekday: 'long' })}`}</p></div></div>
    <div class="td-grid">
      ${tile('Due reviews', due ? `${due} waiting` : 'All clear', '#/retention', due ? 'Start daily review' : '')}
      ${tile('Next lesson', les ? esc(les.title) : 'All checks passed', les ? '#/lessons/' + esc(les.id) : '#/lessons', les ? esc(les.exam === 'FOUND' ? 'Cloud foundations' : les.exam) : '')}
      ${tile('Next lab', lab ? esc(lab.title) : 'Every scenario attempted', lab ? '#/lab/' + lab.id : '#/lab', '')}
      ${tile('Exam', ex ? (ex.days > 0 ? `${ex.days} day${ex.days === 1 ? '' : 's'} to go` : ex.days === 0 ? 'Today' : 'Date passed') : 'No date set', ex ? '#/plan' : '#/career/profile', ex ? esc(`${ex.code} · ${ex.iso}`) : 'Add your exam date')}
    </div></section>`;
}
function ringSvg(f) { const r = 26, c = 2 * Math.PI * r; return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--color-divider)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--color-primary)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>`; }
const _dashP7 = VIEWS.dashboard;
VIEWS.dashboard = arg => { const h = _dashP7(arg); if (!onboarded()) return h; const i = h.indexOf('<section'); return i < 0 ? todayCard() + h : h.slice(0, i) + todayCard() + h.slice(i); };

/* ---------- Today & habits page */
function streakCalendar() {
  const st = streakInfo(); const cbd = cardsByDay(); const today = startOfDay(Date.now()); const first = addDays(mondayOf(today), -21); const fz = new Set(st.frozen.map(dayStr)); const start = startOfDay(HB().startedAt);
  const cells = []; for (let d = first; d <= addDays(mondayOf(today), 6); d = addDays(d, 1)) {
    const k = dayStr(d); const s = dayStats(k, cbd); const met = goalMet(k, cbd); const fut = d > today; const pre = d < start;
    const cls = fut ? 'fut' : met ? 'met' : fz.has(k) ? 'frz' : pre ? 'pre' : d === today ? 'open' : 'miss';
    const lab = fut ? 'upcoming' : met ? 'goal met' : fz.has(k) ? 'freeze used' : pre ? 'before goal was set' : d === today ? 'in progress' : 'missed';
    cells.push(`<li class="cal-d ${cls}${d === today ? ' now' : ''}"><span class="sr-only">${new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${lab}, ${s.cards} cards, ${Math.round(s.min)} minutes</span><span aria-hidden="true">${new Date(d).getDate()}</span></li>`);
  }
  return `<ol class="cal-grid" aria-label="Last four weeks">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<li class="cal-h" aria-hidden="true">${x}</li>`).join('')}${cells.join('')}</ol>
    <p class="small muted" style="margin-top:6px"><span class="key met"></span> goal met <span class="key frz"></span> freeze used <span class="key miss"></span> missed</p>`;
}
const notifSupported = () => 'Notification' in window;
VIEWS.today = () => {
  const h = HB(); const g = h.goal; const rm = h.remind; const perm = notifSupported() ? Notification.permission : 'unsupported';
  return `<div class="page-head"><div><h1>Today and habits</h1><p class="muted">A small daily goal, a streak that forgives one missed day a week, and reminders you choose.</p></div></div>
  ${todayCard(true)}
  <div class="grid g-2" style="margin-top:16px">
    <section class="card" aria-labelledby="h-goal"><h2 id="h-goal">Daily goal</h2>
      <div class="seg-control" role="group" aria-label="Goal type" style="margin:8px 0 12px">${[['cards', 'Cards'], ['minutes', 'Minutes']].map(([k, l]) => `<button type="button" data-action="p7-goal-type" data-v="${k}" aria-pressed="${g.type === k}">${l}</button>`).join('')}</div>
      <div class="field"><label for="p7-goal">${g.type === 'minutes' ? 'Minutes of active study a day' : 'Questions or review cards a day'}</label><input id="p7-goal" type="number" inputmode="numeric" min="1" max="${g.type === 'minutes' ? 240 : 300}" value="${g.value}"></div>
      <p class="small muted" style="margin-top:8px">${g.type === 'minutes' ? 'Active time counts while the app is open in front of you and you used it in the last two minutes.' : 'Every answered question and every graded review card counts.'} Miss one day in a week and the streak keeps going; a freeze is used automatically. A second missed day in the same week ends the streak.</p>
      <h3 style="margin-top:14px">Last four weeks</h3>${streakCalendar()}</section>
    <section class="card" aria-labelledby="h-rem"><h2 id="h-rem">Reminders</h2>
      <div class="field"><label for="p7-time">Remind me at</label><input id="p7-time" type="time" value="${esc(rm.time)}"></div>
      ${perm === 'unsupported' ? '<p class="small" style="margin-top:10px">This browser does not support notifications. Add the study plan to your calendar instead.</p>'
        : perm === 'denied' ? '<p class="small" style="margin-top:10px">Notifications are blocked for this app in your browser settings. Add the study plan to your calendar instead, or allow notifications in the browser and come back.</p>'
        : `<label class="row small" style="gap:8px;margin-top:12px"><input type="checkbox" data-action="p7-remind" ${rm.on && perm === 'granted' ? 'checked' : ''}> Notify me at this time when reviews are due or the goal is not met</label>`}
      <p class="small muted" style="margin-top:8px">A reminder can only appear while the app is open or running in the background; there is no server that can wake it. On iPad, web notifications work only for apps added to the Home Screen, on recent iPadOS versions.</p>
      <h3 style="margin-top:14px">Calendar</h3><p class="small muted">A daily study block at your reminder time${S.ws.plan?.weeks ? ', each week\'s plan targets, and your exam day' : ''}. Works with Apple, Google, and Outlook calendars.</p>
      <div class="row" style="margin-top:8px"><button class="btn" data-action="p7-ics">Download calendar file (.ics)</button></div>
      <p class="small muted" style="margin-top:12px">Want it on your home screen? See <a href="#/install">Install and offline</a>.</p></section></div>`;
};

/* ---------- Reminders while open */
function p7NotifyCheck() {
  if (!S.ws || !notifSupported() || Notification.permission !== 'granted') return;
  const rm = HB().remind; if (!rm.on) return;
  const [hh, mm] = (rm.time || '19:00').split(':').map(Number); const now = new Date(); const at = new Date(); at.setHours(hh || 0, mm || 0, 0, 0);
  const today = dayStr(Date.now()); if (now < at || rm.lastNotified === today) return;
  const due = reviewCount(); const st = streakInfo(); if (!due && st.todayMet) return;
  rm.lastNotified = today; markDirty();
  const body = [due ? `${due} review${due === 1 ? '' : 's'} due.` : '', st.todayMet ? '' : 'Your daily goal is not met yet.', st.streak ? `Streak: ${st.streak} days.` : ''].filter(Boolean).join(' ');
  const opts2 = { body, tag: 'cloudwalker-review', icon: $('link[rel="apple-touch-icon"]')?.href };
  (P7.reg && P7.reg.showNotification ? P7.reg.showNotification('CloudWalker: time to review', opts2) : Promise.resolve(new Notification('CloudWalker: time to review', opts2))).catch(() => { /* ignore */ });
}
setInterval(p7NotifyCheck, 60000);

/* ---------- .ics export */
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function icsFold(line) { const enc = new TextEncoder(); const out = []; let cur = ''; for (const ch of line) { if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch; } out.push(cur); return out.join('\r\n '); }
const icsLocal = t => { const d = new Date(t); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`; };
const icsDate = t => isoDate(t).replace(/-/g, '');
const icsUTC = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function buildIcs() {
  const h = HB(); const g = h.goal; const [hh, mm] = h.remind.time.split(':').map(Number); const ex = examDateInfo(); const now = Date.now();
  const start = new Date(startOfDay(now)); start.setHours(hh || 19, mm || 0, 0, 0); if (start.getTime() < now) start.setDate(start.getDate() + 1);
  const mins = g.type === 'minutes' ? g.value : Math.max(15, Math.round(g.value * 1.5));
  const until = ex && ex.days > 0 ? parseISO(ex.iso) : addDays(now, 56);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BluePrint CloudWalker//Study plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:CloudWalker study'];
  const ev = (uid, lines) => { L.push('BEGIN:VEVENT', `UID:${uid}@cloudwalker.local`, `DTSTAMP:${icsUTC(now)}`, ...lines, 'END:VEVENT'); };
  ev('daily-' + icsDate(start.getTime()), [`DTSTART:${icsLocal(start.getTime())}`, `DURATION:PT${mins}M`, `RRULE:FREQ=DAILY;UNTIL=${icsDate(until)}T235959`, `SUMMARY:${icsEsc(`CloudWalker study (${g.value} ${g.type})`)}`, `DESCRIPTION:${icsEsc('Open CloudWalker: clear due reviews first, then the next lesson or practice set.')}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${icsEsc('Time to study')}`, 'END:VALARM']);
  const pl = S.ws.plan; if (pl && pl.weeks) pl.weeks.forEach((w, i) => { if (w.end < now) return; ev(`plan-${pl.code}-${i + 1}-${icsDate(w.start)}`, [`DTSTART;VALUE=DATE:${icsDate(w.start)}`, `DTEND;VALUE=DATE:${icsDate(addDays(w.start, 1))}`, `SUMMARY:${icsEsc(`${pl.code} plan, week ${i + 1}: ${w.practiceQs} practice questions${w.sims ? `, ${w.sims} practice exam${w.sims === 1 ? '' : 's'}` : ''}`)}`, `DESCRIPTION:${icsEsc(`About ${Math.round(w.minutes / 60 * 10) / 10} hours this week, including ${w.reviewMin} minutes of review.`)}`, 'TRANSP:TRANSPARENT']); });
  if (ex && ex.days >= 0) ev(`exam-${ex.code}-${ex.iso}`, [`DTSTART;VALUE=DATE:${icsDate(parseISO(ex.iso))}`, `DTEND;VALUE=DATE:${icsDate(addDays(parseISO(ex.iso), 1))}`, `SUMMARY:${icsEsc(`Exam day: ${ex.code}`)}`, 'TRANSP:TRANSPARENT']);
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n') + '\r\n';
}

/* ---------- Weekly review */
function weekRange(offset) { const s = addDays(mondayOf(Date.now()), -7 * offset); return { s, e: addDays(s, 7) }; }
function answersBetween(a, b) { const out = []; for (const [id, arr] of Object.entries(S.progress.answers)) { const q = Q(id); for (const x of arr) if (x.t >= a && x.t < b) out.push({ q, x }); } return out; }
function plannedMinutes(a, b) {
  const pl = S.ws.plan; let m = 0; if (pl && pl.weeks) for (const w of pl.weeks) { const o = Math.max(0, Math.min(b, w.end) - Math.max(a, w.start)); if (o > 0) m += w.minutes * o / (w.end - w.start); }
  if (m) return { m: Math.round(m), src: `your ${pl.code} study plan` };
  const g = HB().goal; return g.type === 'minutes' ? { m: g.value * 7, src: 'your daily goal' } : { m: 0, src: '' };
}
function weekReport(offset) {
  const { s, e } = weekRange(offset); const days = []; for (let d = s; d < e; d = addDays(d, 1)) days.push(dayStr(d));
  const tracked = days.reduce((t, k) => t + (HB().days[k]?.min || 0), 0); const ans = answersBetween(s, e);
  const answerMin = Math.round(ans.reduce((t, a) => t + Math.min(a.x.ms || 0, 300000), 0) / 60000); const plan = plannedMinutes(s, e);
  const cor = ans.filter(a => a.x.correct).length; const acc = ans.length ? Math.round(cor / ans.length * 100) : null;
  const trend = []; for (let i = 5; i >= 0; i--) { const r = weekRange(offset + i); const a = answersBetween(r.s, r.e); trend.push({ s: r.s, n: a.length, acc: a.length ? Math.round(a.filter(x => x.x.correct).length / a.length * 100) : null }); }
  const dm = new Map(); for (const { q, x } of ans) { if (!q) continue; const k = q.exam_code + '||' + q.domain; const r = dm.get(k) || { att: 0, cor: 0 }; r.att++; if (x.correct) r.cor++; dm.set(k, r); }
  const weak = [...dm.entries()].filter(([, r]) => r.att >= 3).map(([k, r]) => { const [code, domain] = k.split('||'); return { code, domain, att: r.att, acc: Math.round(r.cor / r.att * 100) }; }).sort((a, b) => a.acc - b.acc || b.att - a.att)[0] || null;
  const st = streakInfo(); const today = dayStr(Date.now()); const elapsed = days.filter(k => k <= today).length; const metDays = days.filter(k => k <= today && goalMet(k)).length;
  const sims = S.progress.sessions.filter(x => x.mode === 'exam' && x.ended >= s && x.ended < e).length;
  const oi = (() => { try { return overconfidenceIndex().overall; } catch { return null; } })();
  return { s, e, days, elapsed, tracked: Math.round(tracked), answerMin, plan, n: ans.length, acc, trend, weak, metDays, streak: st.streak, sims, oi, due: reviewCount() };
}
function suggestion(r) {
  const les = r.weak ? LESSONS.find(l => l.exam === r.weak.code && l.domain === r.weak.domain) : null;
  if (!r.n && !r.tracked) return { text: r.elapsed < 7 ? 'Nothing recorded yet this week. Start with ten minutes of daily review today.' : 'No study was recorded this week. Pick two fixed times for next week and put them in your calendar.', href: r.elapsed < 7 ? '#/retention' : '#/today', cta: r.elapsed < 7 ? 'Daily review' : 'Add study blocks to your calendar' };
  if (r.plan.m && r.tracked < r.plan.m * 0.7 * r.elapsed / 7) return { text: `You studied ${fmtMin(r.tracked)} against ${fmtMin(r.plan.m)} planned. Put two fixed study blocks in your calendar for next week.`, href: '#/today', cta: 'Add study blocks to your calendar' };
  if (r.weak && r.weak.acc < 60) return { text: `${r.weak.code} ${r.weak.domain.replace(/^\d+\.\s*/, '')} was your weakest area (${r.weak.acc}% over ${r.weak.att} answers). ${les ? 'Re-read its lesson and retake the check before more practice.' : 'Do one focused drill on it before mixed practice.'}`, href: les ? '#/lessons/' + les.id : '#/study', cta: les ? 'Open the lesson' : 'Focus drill' };
  if (r.due > 30) return { text: `${r.due} reviews are waiting. Start each session with ten minutes of daily review before new questions.`, href: '#/retention', cta: 'Daily review' };
  if (r.oi !== null && r.oi > 10) return { text: 'Your self-ratings run high compared with the evidence. Before rating confidence next week, name one reason you could be wrong.', href: '#/calibration', cta: 'See calibration' };
  if (r.elapsed >= 4 && r.metDays < r.elapsed * 0.57) return { text: `You met your daily goal on ${r.metDays} of ${r.elapsed} days. Lower the goal a little so it fits your real week, then build it back up.`, href: '#/today', cta: 'Adjust the goal' };
  if (!r.sims && r.n >= 50) return { text: 'Practice is steady. Add one timed practice exam next week to check how it holds up under time.', href: '#/exam', cta: 'Exam mode' };
  return { text: 'A solid week. Keep the same rhythm and add one new lesson.', href: '#/lessons', cta: 'Lessons' };
}
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`;
const weekLabel = r => `${new Date(r.s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to ${new Date(addDays(r.e, -1)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
S.p7 = { week: 0, inst: null, sw: 'unknown', swErr: '' };
VIEWS.weekly = () => {
  const off = S.p7.week; const r = weekReport(off); const sg = suggestion(r); const key = weekKeyOf(r.s); const note = HB().weekNotes[key]?.text || '';
  const maxT = Math.max(r.tracked, r.answerMin, r.plan.m, 1);
  const bar = (l, v, cls) => `<div class="wk-bar"><span class="small">${l}</span><div class="bar ${cls}" role="img" aria-label="${l}: ${fmtMin(v)}"><i style="width:${Math.round(v / maxT * 100)}%"></i></div><span class="small num">${fmtMin(v)}</span></div>`;
  return `<div class="page-head"><div><h1>Weekly review</h1><p class="muted">${esc(weekLabel(r))}${off === 0 ? ' (this week so far)' : ''}</p></div><div class="row"><button class="btn" data-action="p7-wk" data-v="1">← Earlier</button><button class="btn" data-action="p7-wk" data-v="-1" ${off === 0 ? 'disabled' : ''}>Later →</button><button class="btn primary" data-action="p7-wk-md">Export Markdown</button></div></div>
  <div class="grid g-2">
    <section class="card" aria-labelledby="h-wk-t"><h2 id="h-wk-t">Time vs plan</h2>
      ${bar('Active time tracked', r.tracked, '')}${bar('Time spent answering', r.answerMin, '')}${r.plan.m ? bar('Planned', r.plan.m, 'good') : ''}
      <p class="small muted" style="margin-top:8px">${r.plan.m ? `Plan from ${esc(r.plan.src)}.` : 'No plan or minutes goal for this week, so there is nothing to compare against. <a href="#/plan">Create a study plan</a>.'} Active time counts only while the app was in front of you and in use. Daily goal met on ${r.metDays} of ${r.elapsed} day${r.elapsed === 1 ? '' : 's'}${r.elapsed < 7 ? ' so far' : ''}.</p></section>
    <section class="card" aria-labelledby="h-wk-a"><h2 id="h-wk-a">Accuracy trend</h2>
      <div class="wk-trend" role="img" aria-label="Accuracy by week: ${esc(r.trend.map(t => `${fmtDate(t.s)} ${t.acc === null ? 'no answers' : t.acc + '% of ' + t.n}`).join('; '))}">${r.trend.map(t => `<div class="wk-col"><div class="wk-stack"><i style="height:${t.acc === null ? 0 : t.acc}%"></i></div><span class="small">${t.acc === null ? '—' : t.acc + '%'}</span><span class="small muted">${new Date(t.s).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span></div>`).join('')}</div>
      <p class="small muted" style="margin-top:6px">${r.n} answers this week${r.acc !== null ? `, ${r.acc}% correct` : ''}. Six weeks, oldest on the left.</p></section>
    <section class="card" aria-labelledby="h-wk-w"><h2 id="h-wk-w">Weakest domain</h2>${r.weak ? `<p><strong>${esc(r.weak.code)} · ${esc(r.weak.domain)}</strong></p><p class="small">${r.weak.acc}% correct over ${r.weak.att} answers this week.</p>` : '<p class="small muted">No domain had three or more answers this week.</p>'}</section>
    <section class="card" aria-labelledby="h-wk-c"><h2 id="h-wk-c">One thing to change next week</h2><p>${esc(sg.text)}</p><div class="row" style="margin-top:8px"><a class="btn sm" href="${sg.href}">${esc(sg.cta)}</a></div>
      <div class="field" style="margin-top:12px"><label for="p7-note">Your own note for next week</label><textarea id="p7-note" rows="3" data-p7wk="${key}" placeholder="In your words: what will you do differently?">${esc(note)}</textarea></div></section>
  </div>`;
};
function weekMarkdown(off) {
  const r = weekReport(off); const sg = suggestion(r); const note = HB().weekNotes[weekKeyOf(r.s)]?.text || '';
  return [`# Weekly review: ${weekLabel(r)}`, '', `Generated ${fmtDate(Date.now())} by BluePrint CloudWalker. Practice material; not exam content.`, '', '## Time vs plan', '',
    `- Active time tracked: ${fmtMin(r.tracked)}`, `- Time spent answering: ${fmtMin(r.answerMin)}`, `- Planned: ${r.plan.m ? `${fmtMin(r.plan.m)} (from ${r.plan.src})` : 'no plan for this week'}`, `- Daily goal met: ${r.metDays} of ${r.elapsed} days · streak now ${r.streak} days`, '',
    '## Accuracy trend (last six weeks)', '', '| Week of | Answers | Correct |', '|---|---:|---:|', ...r.trend.map(t => `| ${isoDate(t.s)} | ${t.n} | ${t.acc === null ? 'n/a' : t.acc + '%'} |`), '',
    '## Weakest domain', '', r.weak ? `${r.weak.code} · ${r.weak.domain}: ${r.weak.acc}% over ${r.weak.att} answers.` : 'No domain had three or more answers this week.', '',
    '## One thing to change next week', '', sg.text, ...(note.trim() ? ['', `My note: ${note.trim()}`] : []), ''].join('\n');
}

/* ---------- Install and offline */
const SW_FILE = 'cloudwalker-sw.js';
const SW_SOURCE = `/* CloudWalker service worker: caches the app shell so the app opens offline. Serve this file next to the app's HTML. */
const CACHE = 'cloudwalker-v09-shell-1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cloudwalker-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'cache-shell' && typeof d.url === 'string') e.waitUntil(caches.open(CACHE).then(c => c.add(new Request(d.url, { cache: 'reload' }))).catch(() => {})); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.open(CACHE).then(c => c.keys().then(ks => ks.length ? c.match(ks[0]) : Response.error())))));
    return;
  }
  e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; }).catch(() => m); return m || net; }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { const c = cs[0]; if (c) { c.focus(); return c.navigate ? c.navigate(c.url.split('#')[0] + '#/retention').catch(() => {}) : null; } return self.clients.openWindow(self.registration.scope); })); });
`;
const P7 = { reg: null };
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function p7Manifest() {
  try {
    if (location.protocol === 'file:' || $('link[rel="manifest"]')) return;
    const base = location.href.split('#')[0]; const scope = base.replace(/[^/]*$/, '');
    const src = $('link[rel="apple-touch-icon"]')?.href; const img = new Image();
    img.onload = () => {
      const icon = n => { const c = document.createElement('canvas'); c.width = c.height = n; c.getContext('2d').drawImage(img, 0, 0, n, n); return c.toDataURL('image/png'); };
      const m = { name: 'BluePrint CloudWalker Trainer', short_name: 'CloudWalker', description: 'Cloud certification prep, lessons, labs, and interview practice that works offline.', start_url: base, scope, display: 'standalone', orientation: 'any', background_color: '#f6f8fb', theme_color: '#4b9cd3',
        icons: [{ src: icon(192), sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'any' }] };
      const l = document.createElement('link'); l.rel = 'manifest'; l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' })); document.head.append(l);
    };
    if (src) img.src = src;
  } catch { /* install is optional */ }
}
async function p7RegisterSW() {
  if (location.protocol === 'file:') { S.p7.sw = 'file'; return; }
  if (!('serviceWorker' in navigator)) { S.p7.sw = 'unsupported'; return; }
  if (!window.isSecureContext) { S.p7.sw = 'insecure'; return; }
  try {
    const reg = await navigator.serviceWorker.register(SW_FILE, { scope: './' }); P7.reg = reg; S.p7.sw = 'registered';
    const send = w => w && w.postMessage({ type: 'cache-shell', url: location.href.split('#')[0] });
    send(reg.active || reg.waiting || reg.installing);
    navigator.serviceWorker.ready.then(r => { P7.reg = r; send(r.active); S.p7.sw = 'ready'; if (route().name === 'install') render(); });
  } catch (e) { S.p7.sw = 'missing'; S.p7.swErr = e.message || String(e); }
  if (route().name === 'install') render();
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.p7.inst = e; if (route().name === 'install') render(); });
window.addEventListener('appinstalled', () => { S.p7.inst = null; showStatus('CloudWalker is installed.'); });
window.addEventListener('offline', () => showStatus('You are offline. Study, reviews, lessons, and saving all keep working; only AI feedback needs a connection.'));
window.addEventListener('online', () => showStatus('Back online.'));
const SW_STATE = {
  unknown: ['', 'Checking…'], file: ['warn-chip', 'Opened as a file'], unsupported: ['warn-chip', 'Not supported in this browser'], insecure: ['warn-chip', 'Needs https'],
  missing: ['warn-chip', `${SW_FILE} not found next to the app`], registered: ['', 'Starting…'], ready: ['ok-chip', 'Ready for offline use']
};
VIEWS.install = () => {
  const s = S.p7.sw; const [cls, lab] = SW_STATE[s] || SW_STATE.unknown; const ua = navigator.userAgent; const ios = /iPad|iPhone|Macintosh/.test(ua) && 'ontouchend' in document; const android = /Android/.test(ua);
  const steps = (title, list, hl) => `<section class="card ${hl ? 'inst-hl' : ''}"><h3>${title}${hl ? ' <span class="chip strong">This device</span>' : ''}</h3><ol class="inst-steps">${list.map(x => `<li>${x}</li>`).join('')}</ol></section>`;
  return `<div class="page-head"><div><h1>Install and offline</h1><p class="muted">CloudWalker keeps everything on this device, so studying works without a connection. Installing it puts it on your home screen like an app.</p></div></div>
  <section class="card" aria-labelledby="h-inst-s"><div class="card-head"><h2 id="h-inst-s">Status</h2><span class="chip ${cls}">${esc(lab)}</span></div>
    <ul class="plain-list small"><li>Running as an installed app: <strong>${isStandalone() ? 'yes' : 'no'}</strong></li><li>Connection: <strong>${navigator.onLine === false ? 'offline' : 'online'}</strong></li><li>Your data: saved in this browser on this device (see <a href="#/settings">Settings</a>)</li></ul>
    ${s === 'file' ? `<p class="notice" style="margin-top:10px">You opened the app as a file (file://). It works fully offline this way, because the whole app is this one file. Browsers do not let a file install itself or run a service worker, so "Add to Home Screen" from a file opens a browser tab rather than an app. To install it, put it on any static web host (below).</p>` : ''}
    ${s === 'missing' ? `<p class="notice" style="margin-top:10px">The app is hosted, but <code>${SW_FILE}</code> is not in the same folder, so offline start-up is not set up. Download it below and upload it next to this HTML file.</p>` : ''}
    ${s === 'insecure' ? '<p class="notice" style="margin-top:10px">This page is served over plain http. Installing and offline start-up need https (or localhost).</p>' : ''}
    ${S.p7.inst ? '<div class="row" style="margin-top:10px"><button class="btn primary" data-action="p7-install">Install CloudWalker</button></div>' : ''}</section>
  <h2 style="margin:20px 0 10px">Add to your home screen</h2>
  <div class="grid g-2">
    ${steps('iPad or iPhone (Safari)', ['Open the hosted app in Safari.', 'Tap the Share button (a square with an arrow).', 'Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.', 'Open CloudWalker from the home screen. Your data in Safari and in the home-screen app are kept separately, so move it with Save workspace and Import if you studied in Safari first.'], ios)}
    ${steps('Android tablet or phone (Chrome)', ['Open the hosted app in Chrome.', 'Tap <strong>Install</strong> in the address bar, or the menu (three dots) then <strong>Install app</strong> or <strong>Add to Home screen</strong>.', 'Confirm. CloudWalker opens in its own window.', 'If you studied in a browser tab first, the installed app shares that data on Android.'], android)}
  </div>
  <section class="card" style="margin-top:16px" aria-labelledby="h-host"><h2 id="h-host">Minimal hosting (any static host)</h2>
    <p class="small">No server code, database, or build step is needed. Put two files in the same folder of any host that serves https:</p>
    <ol class="inst-steps small"><li>This app's HTML file. Rename it to <code>index.html</code> if you want a short address.</li><li><code>${SW_FILE}</code>, downloaded with the button below.</li></ol>
    <p class="small">Static hosts that work include GitHub Pages, Netlify, Cloudflare Pages, Vercel, an Amazon S3 static website behind CloudFront, Azure Static Web Apps, or Firebase Hosting. To try it on your own computer, run <code>python3 -m http.server 8080</code> in that folder and open <code>http://localhost:8080</code>.</p>
    <p class="small muted">Each web address keeps its own saved data. Moving to a new address starts empty, so bring your work over with Save workspace and Import.</p>
    <div class="row" style="margin-top:10px"><button class="btn" data-action="p7-sw-dl">Download ${SW_FILE}</button></div></section>`;
};

/* ---------- Workspace import: habit data merges, newer wins */
const _smartImportP7 = smartImport;
smartImport = data => {
  const r = _smartImportP7(data); const w = data && (data.workspace || data); if (!w || data.format !== 'cloudwalker-workspace' || !w.habit || typeof w.habit !== 'object') return r;
  const h = HB(), x = w.habit;
  if (x.goal && (x.goal.updated || 0) > (h.goal.updated || 0) && ['cards', 'minutes'].includes(x.goal.type)) h.goal = x.goal;
  if (x.remind && (x.remind.updated || 0) > (h.remind.updated || 0)) h.remind = { ...x.remind, on: false };
  if (x.days && typeof x.days === 'object') for (const [k, v] of Object.entries(x.days)) if (v && /^\d{4}-\d{2}-\d{2}$/.test(k) && (!h.days[k] || (v.min || 0) > (h.days[k].min || 0))) h.days[k] = v;
  if (x.weekNotes && typeof x.weekNotes === 'object') for (const [k, v] of Object.entries(x.weekNotes)) if (v && (!h.weekNotes[k] || (v.updated || 0) > (h.weekNotes[k].updated || 0))) h.weekNotes[k] = v;
  if (x.startedAt && x.startedAt < h.startedAt) h.startedAt = x.startedAt;
  return r;
};

/* ---------- Chrome and events */
ICON.today = '<path d="M4 7h16v13H4z"/><path d="M8 3v4M16 3v4M4 11h16"/><path d="M9 15l2 2 4-4"/>';
ICON.weekly = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
ICON.install = '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/>';
(() => {
  const at = (key, item) => { const i = NAV.findIndex(n => n[0] === key); NAV.splice(i >= 0 ? i + 1 : NAV.length, 0, item); };
  at('dashboard', ['today', 'Today & habits', 'Command']); at('today', ['weekly', 'Weekly review', 'Command']);
  const s = NAV.findIndex(n => n[0] === 'settings'); NAV.splice(s >= 0 ? s : NAV.length, 0, ['install', 'Install & offline', 'Data']);
})();
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action^="p7-"]'); if (!b) return; const d = b.dataset; const h = HB();
  if (b.type === 'checkbox') return; /* handled on change */
  e.preventDefault();
  if (d.action === 'p7-goal-type') { if (h.goal.type !== d.v) { h.goal = { type: d.v, value: d.v === 'minutes' ? 30 : 20, updated: Date.now() }; markDirty(); persistSoon(SAVE_QUICK); } render(); $(`[data-action="p7-goal-type"][data-v="${d.v}"]`)?.focus(); }
  else if (d.action === 'p7-ics') { downloadText('cloudwalker-study-plan.ics', buildIcs(), 'text/calendar'); showStatus('Calendar file downloaded. Open it to add the events to your calendar.'); }
  else if (d.action === 'p7-wk') { S.p7.week = Math.max(0, S.p7.week + +d.v); render(); $(`[data-action="p7-wk"][data-v="${d.v}"]`)?.focus(); }
  else if (d.action === 'p7-wk-md') { const r = weekRange(S.p7.week); downloadText(`cloudwalker-weekly-review-${isoDate(r.s)}.md`, weekMarkdown(S.p7.week)); showStatus('Weekly review downloaded as Markdown.'); }
  else if (d.action === 'p7-sw-dl') { downloadText(SW_FILE, SW_SOURCE, 'text/javascript'); showStatus(`${SW_FILE} downloaded. Upload it next to the app's HTML file.`); }
  else if (d.action === 'p7-install' && S.p7.inst) { S.p7.inst.prompt(); S.p7.inst.userChoice.finally(() => { S.p7.inst = null; render(); }); }
});
document.addEventListener('change', e => {
  const el = e.target; const h = S.ws && HB(); if (!h) return;
  if (el.id === 'p7-goal') { const g = h.goal; const max = g.type === 'minutes' ? 240 : 300; const v = Math.round(+el.value); if (!(v >= 1 && v <= max)) { showStatus(`Enter a number from 1 to ${max}.`); el.value = g.value; return; } g.value = v; g.updated = Date.now(); markDirty(); persistSoon(SAVE_QUICK); render(); $('#p7-goal')?.focus(); }
  else if (el.id === 'p7-time') { if (/^\d{2}:\d{2}$/.test(el.value)) { h.remind.time = el.value; h.remind.lastNotified = ''; h.remind.updated = Date.now(); markDirty(); } }
  else if (el.dataset.action === 'p7-remind') {
    if (!el.checked) { h.remind.on = false; h.remind.updated = Date.now(); markDirty(); showStatus('Reminders off.'); return; }
    Notification.requestPermission().then(p => { h.remind.on = p === 'granted'; h.remind.updated = Date.now(); markDirty(); render(); showStatus(p === 'granted' ? `Reminders on for ${h.remind.time} while the app is open.` : 'Notifications were not allowed. You can use the calendar file instead.'); });
  }
});
document.addEventListener('input', e => { const el = e.target; if (el.dataset && el.dataset.p7wk && S.ws) { HB().weekNotes[el.dataset.p7wk] = { text: el.value.slice(0, 1000), updated: Date.now() }; markDirty(); } });
setTimeout(() => { p7Manifest(); p7RegisterSW(); }, 0);


