/*
 * BluePrint CloudWalker Trainer — developer notes
 * -----------------------------------------------------------------------------
 * Architecture
 *  - Single static file. No build step, no server, no framework.
 *  - Content: the starter bank is parsed offline from ALL_EXAMS_1000_Questions.md
 *    and embedded above as compact rows (#bank-data). normalizeRow() expands each
 *    row into the full question schema at boot. Nothing is generated at runtime;
 *    malformed items are dropped by validateQuestion(), never patched with filler.
 *  - Identity: every question keeps a permanent canonical id (e.g. "gcp-pca-001").
 *    Shuffling, filtering, and sessions only ever hold arrays of ids; ids are never
 *    reassigned. Imports merge by id.
 *  - State: all runtime state lives in the in-memory object S. Since V09 Phase 1,
 *    S.ws, quiz progress, drafts, an open session and imported questions autosave
 *    to IndexedDB (see "V09 Phase 1: never lose work"). Phase 6 keeps a single
 *    localStorage key for per-device preferences (focus,
 *    theme, last study area), wrapped in try/catch and switchable off. Persistence is
 *    manual: Settings > Export progress downloads JSON; Import restores it.
 *  - Rendering: hash routes (#/dashboard, #/library, ...) map to view functions
 *    that return HTML strings; event handling is delegated from <main> via
 *    data-action attributes, so re-rendering never leaks listeners.
 *  - Sessions: one Runner model powers Learn, Focus drill, Mastery review, Review
 *    queues, and Simulated exams. The difference is only in queue construction,
 *    reveal policy ("immediate" | "end"), and whether a timer runs.
 *  - Difficulty: where the reserve tags difficulty (e.g. `[CDL · 1.1 · Scenario · Medium]`)
 *    it is kept as difficulty_source "provided". Untagged tracks fall back to a
 *    value inferred from exam tier and question type (difficulty_source "inferred").
 *  - Phase 2 (career command center): six systems layered on the certification
 *    core, all in-memory under S.ws and saved via the single workspace file:
 *    Retention engine (SM-2 style scheduler fed by every answer; recall mode hides
 *    options for true retrieval practice), Architecture Lab (timed design drills
 *    scored on a weighted judgment rubric against reference designs), ADR Studio,
 *    Portfolio Builder (Markdown and standalone HTML site export), Interview Arena
 *    (mock questions, STAR bank, timed whiteboard prompts), and Career Command
 *    (weekly plan, milestones, target roles with skill gaps, application pipeline).
 *    Editors bind inputs directly to records (data-bind) and refresh only preview
 *    regions, so typing never re-renders the page. Five readiness scores are
 *    computed on demand; formulas are explained on each tile and in allScores().
 *  - Phase 3–4 state model (career-conversion layer). Runtime state is one in-memory
 *    object S, autosaved to IndexedDB since V09. Durable user data lives in S.ws and
 *    travels in the workspace JSON (format "cloudwalker-workspace", version 4; v1–3 files are
 *    upgraded by migrateWorkspace on import):
 *      adrs, portfolio, labs, labDrafts, interview{answers,stories,boards,exec},
 *      career{profile,roles,weeks,milestones,apps}, srs (review schedule),
 *      recallLog, trail (breadcrumbs), outputs (generated career assets),
 *      reflections, exportLog, panels (last open tab per record).
 *    The file also carries quiz progress, open drafts, and a queue snapshot.
 *    Session-only state: S.meta2 (in-memory backups, touched ids, savedAt) and
 *    S.p3/S.p4 (view settings). These are rebuilt each session by design.
 *  - Storage tiers shown to the user: (1) in this tab only, where updated > savedAt;
 *    (2) saved in a workspace file, written by Save workspace or loaded by Restore;
 *    (3) exported artifact, where the record's exportedAt >= updated.
 *  - Import (smartImport) detects the format (workspace, artifacts, or progress),
 *    takes a backup, validates every record (id pattern, required fields, types,
 *    duplicates within the file), merges by permanent id keeping the newer copy,
 *    and reports added/updated/unchanged/kept/rejected with reasons. IDs are
 *    never reassigned.
 *  - Exports go through downloadText()/download() with timestamped names
 *    (cloudwalker-<type>-YYYY-MM-DD-HH-MM.ext). Each export calls markExported(),
 *    which stamps exportedAt on the records and appends to exportLog.
 *  - Glossary (Phase 5): GLOSSARY_SEED is generated from the Certification Glossary
 *    doc by build_glossary.py into the user's schema ({terms[], cross_cloud[]}) and
 *    embedded at build time. Imported terms live in S.ws.glossary and override seed
 *    entries by id (cross rows by function); import validates ids, required fields,
 *    list types, cloud values, and duplicates, and warns on unknown exam codes.
 *  - Explanations: the reserve's explanation is split into a "why correct"
 *    sentence and a "why not the others" remainder. Per-option distractor
 *    rationales are left empty rather than fabricated.
 */
'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = a => [...new Set(a)];
const fmtTime = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`; };
const ago = t => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return new Date(t).toLocaleDateString(); };
const LETTERS = 'ABCDEF';
const DIFFS = ['easy', 'medium', 'hard'];

