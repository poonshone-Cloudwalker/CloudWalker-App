# BluePrint CloudWalker: source (V10.1)

The app still ships as one offline HTML file. You don't edit that file any more. You edit the small files in `src/`, and `build.js` stitches them back together.

```
node build.js            # writes dist/BluePrint_CloudWalker.html and dist/cloudwalker-sw.js
node tests/run.js        # builds, then runs the browser test suite
```

You need Node.js 18 or newer. The tests also need Playwright with Chromium (`npm i -D playwright` and `npx playwright install chromium`).

## Layout

| Path | What it holds |
|---|---|
| `src/manifest.json` | The build order. Every CSS and JS file must be listed here, or the build refuses to run. |
| `src/shell/head.html` | The `<head>`, the in-file README comment and the opening `<style>` tag. |
| `src/shell/body.html` | The page markup: sidebar, main area, dialog, hidden file inputs. |
| `src/css/` | Styles, one file per section, in manifest order. |
| `src/js/core/` | State, saving helpers, the router, rendering, the original views and events. |
| `src/js/features/` | Everything added since: one file or a few per phase, and new features from now on. |
| `src/js/boot.js` | Starts the app. It is always last. |
| `src/content/bank/` | The built-in question bank: `bank-head.json` (exams, fields) and 16 chunks of 100 rows. |
| `src/content/glossary-seed.json` | The glossary that ships with the app. |
| `src/content/bootcamp/` | The Cloud Architect Operator Bootcamp as JSON: levels, 9 lab files, exemplars, rubric, framework and the certification mapping. Generated; see below. |
| `content-src/bootcamp/` | The bootcamp source: the curriculum markdown, the editorial classification and the certification mapping. |
| `src/static/` | Files copied next to the app (the service worker). |
| `tests/` | The browser test suite, its fixtures and the expected outputs. |
| `tools/split.js` | The one-time tool that split V09.1 into `src/`. |
| `tools/bootcamp-extract.js` | Turns `content-src/bootcamp/` into `src/content/bootcamp/`. |

**Important:** the JS files are not separate modules. They are consecutive pieces of one script that runs inside a single function, so a constant in `core/070-routing-chrome.js` is visible in every later file. Order matters, which is why the manifest exists. The files are numbered in steps of 10 so a new file can go between two others without renaming anything.

## Adding a feature

1. Create `src/js/features/400-my-feature.js` (any number above 390).
2. Add it to `src/manifest.json` in the `js` list, before `js/boot.js`.
3. Register it:

```js
registerFeature({
  id: 'flashcards',
  css: '.fc-card{padding:16px}',
  views: { flashcards: arg => `<div class="page-head"><div><h1>Flashcards</h1></div></div>…` },
  nav: [{ route: 'flashcards', label: 'Flashcards', group: 'Certify', after: 'study', icon: '<path d="…"/>' }],
  actions: { 'flashcards-flip': (data, button) => { S.ws.flashcards.flipped = data.id; markDirty(); persistSoon(SAVE_QUICK); render(); } },
  onBoot() { S.ws.flashcards ||= { cards: {}, updated: 0 }; },
  mergeImport(w) { /* merge w.flashcards into S.ws.flashcards by id, newer wins */ },
});
```

- **Pages:** `views` adds pages. `#/flashcards/abc` calls your view with `'abc'`, and the view returns an HTML string. Escape anything the user typed with `esc()`.
- **Buttons:** `actions` handles buttons with `data-action="flashcards-flip"`. Action names must start with the feature id and a hyphen, so they can't collide with built-in buttons. Other `data-*` attributes on the button arrive in the first argument.
- **Saving:** keep the feature's saved data under one key of `S.ws`. It is then saved on the device and in exported workspace files automatically. After you change it, call `markDirty()` and `persistSoon()`.
- **Fields:** `inputs` handles form fields with `data-input="flashcards-note"` (same prefix rule). Text fields and textareas call the handler on every keystroke; checkboxes, radios, selects and file pickers call it once per change. Read the value from the element, save it, and don't call `render()` from a text field's handler, or the field loses focus.
- **Imports:** `mergeImport` is how imported workspace files reach your data. Merge by permanent id, and let the newer copy win.
- **Errors:** route names must be unique. If a route already exists or an action name lacks the prefix, that one feature doesn't load and the browser console says why. An error inside a feature's hooks is logged too. Neither takes the app down.

The features up to V09.1 still use the older pattern of wrapping an earlier function (`const _x = fn; fn = …`). That still works, but new code should use `registerFeature`.

## Example feature: flashcards

`src/js/features/400-flashcards.js` is the first feature built only on `registerFeature`. Copy its shape for a new feature:

```js
const FC_SESSION_MAX = 20;                       // feature constants: prefix them, the scope is shared
let FC = { session: null };                      // screen state that isn't saved
function fcData() { return (S.ws.flashcards ||= { exam: '', cards: {}, updated: 0 }); }   // saved state, created on demand

registerFeature({
  id: 'flashcards',
  css: `.fc-card{min-height:260px} @media (prefers-reduced-motion:no-preference){ … }`,
  views: { flashcards: arg => arg === 'study' ? fcStudyView() : fcDeckView() },   // #/flashcards and #/flashcards/study
  nav: [{ route: 'flashcards', label: 'Flashcards', group: 'Certify', after: 'study', icon: '<rect …/>' }],
  actions: {
    'flashcards-flip': () => { FC.session.flipped = true; render(); $('#fc-back')?.focus(); },   // move focus yourself after render()
    'flashcards-grade': data => { fcGrade(data.grade); render(); $('#fc-flip')?.focus(); },      // data-grade="good" arrives as data.grade
  },
  mergeImport(w) { /* per card id: take w.flashcards.cards[id] only when its updated is newer */ },
});
```

Points worth copying:
- **Read existing data; don't copy it.** Terms come from `glTerms()`, the glossary's merged view, so imported glossary terms show up automatically. Intervals reuse the retention engine's `LADDER`.
- **Create saved data on demand.** `fcData()` creates the data the first time it's needed. The feature still works after a workspace restore replaces `S.ws`, and people who never open it keep an unchanged workspace. Because of that, flashcards needs no `onBoot`.
- **Use buttons for choices.** The API routes clicks, so the certification picker is a row of `aria-pressed` buttons rather than a `<select>`.
- **Test against the real build.** `tests/suite/flashcards.js` is the matching test. It uses the real build, covers keyboard use, and checks saving across a restart and import merge.

## Bootcamp (V10.1)

The Bootcamp pages (`#/bootcamp`, in the Build group) track the hands-on labs of the Cloud Architect Operator Bootcamp: dashboard, library with filters, a page per lab, tracker, portfolio readiness, recommendations from weak quiz domains, and the operating guide. Code is in `src/js/features/410-` to `490-bootcamp-*.js`, registered only through `registerFeature`.

- **Content.** Edit `content-src/bootcamp/`, then run `node tools/bootcamp-extract.js` and rebuild. Don't edit the generated JSON by hand. The extractor copies text word for word and stops if the document's shape changes. Fields the curriculum does not give stay null or empty. Where a brief relies on the common operating contract, the lab page shows the contract text and labels it as such.
- **Ids.** `1.01`–`9.08` for the 72 briefs and `E1`–`E9` for the exemplars. They are permanent.
- **Classification and mapping.** Vendors, domains, cloud mode and portfolio categories (`classification.json`), and the weak-area mapping (`cert-mapping.json`), are editorial and labelled as such in the app. Related certifications are worked out at run time from the exam domains already in the app, so no exam fact is stored in the bootcamp files.
- **Saved data.** `S.ws.bootcamp` holds one record per lab (the curriculum's tracker.csv columns plus notes, evidence checklist, portfolio flag, confidence and dates), focus topics and a short activity log. It is created on first change. It travels in workspace files, in the Bootcamp's own progress file (`cloudwalker-bootcamp-progress`, version 1), and the tracker exports the curriculum's 16-column `tracker.csv`. Imports merge per lab id, newer record wins, unknown fields and lab ids are kept, and malformed files or records are refused with a reason.
- **If the content is broken.** Invalid JSON stops the build and names the file. Valid JSON with the wrong structure builds, but the Bootcamp pages show the list of problems instead, and the rest of the app works.

## Adding content without touching code

The content-pack system (Content updates page) carries questions, lessons, labs and exam profiles, merged by id. For new exams and question fixes, ship a pack rather than editing `src/content/bank/`. Packs need no rebuild and users can see what changed before it merges.

## Rules the build enforces

- Every CSS and JS file in `src/css`, `src/js/core` and `src/js/features` is listed in the manifest, and none is listed twice.
- The bank chunks and the glossary are valid JSON.
- The whole app script compiles.
- The source contains no `\uXXXX` escapes. Write the real character instead.

The project rules still apply: never invent certification facts; new practice content is `generated-practice` and `draft` until a person approves it; never renumber ids; keep WCAG 2.2 AA, keyboard paths, reduced motion and the tablet-first layout.

## Tests

`node tests/run.js` builds the app and opens it in Chromium. **Exact tests** must print the same lines as `tests/expected/<name>.txt`. **Smoke tests** depend on today's date, timers or random option order, so they only have to finish without page errors. After an intended change, review the new output in `tests/.work/<name>.out.txt` and accept it with `node tests/run.js <name> --update`. You can pass part of a test name to run only matching tests, for example `node tests/run.js packs`.
