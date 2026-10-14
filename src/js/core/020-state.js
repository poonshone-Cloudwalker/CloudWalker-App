/* ------------------------------------------------------------------ State */
const S = {
  meta: null, sections: [], bank: new Map(), order: [], exams: [],
  progress: { answers: {}, flags: new Set(), confidence: {}, sessions: [] },
  session: { started: Date.now(), answered: 0, correct: 0, streak: 0, best: 0 },
  runner: null, lastResult: null,
  ui: {
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    lib: { q: '', exam: '', domain: '', subdomain: '', service: '', difficulty: '', type: '', tag: '', status: '', page: 0 },
    review: { source: 'missed', exam: '', domain: '', subdomain: '', service: '', sort: 'recent' },
    analyticsExam: '', settingsMsg: null
  }
};

