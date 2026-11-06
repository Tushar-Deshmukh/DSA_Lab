'use client';
// The exercise code runner (D-007): learner code runs in /runner/worker.js, which is served with its own
// policy — the page can never eval. The probe (2.5 s, as in the legacy app) decides worker or fallback; a run
// is stopped after 3 s, which reports an infinite loop instead of hanging the page.

const WORKER_URL = '/runner/worker.js';
const PROBE_MS = 2500;
const RUN_MS = 3000;

export interface RunJob {
  code: string;
  fn: string;
  tests: Array<{
    args?: unknown[];
    expect?: unknown;
    hidden?: boolean;
    ops?: unknown[][];
  }>;
  compare?: 'unordered' | 'sorted' | 'float';
  adapt?: { args?: (string | null)[]; ret?: string };
  checker?: string;
}

export interface TestResult {
  ok: boolean;
  got?: string;
  error?: string;
  log?: string[];
  ms?: number;
}

export interface RunOutcome {
  results?: TestResult[];
  error?: 'compile' | 'timeout' | 'missing';
  message?: string;
}

type WorkerGlobal = {
  onmessage: ((e: { data: unknown }) => void) | null;
  postMessage: (data: unknown) => void;
};

let workerOK: boolean | null = null;
let mainRun: ((job: RunJob & { type: 'run' }) => RunOutcome) | null = null;

function probeWorker(): Promise<boolean> {
  if (workerOK !== null) return Promise.resolve(workerOK);
  return new Promise((resolve) => {
    try {
      const w = new Worker(WORKER_URL);
      const done = (ok: boolean) => {
        clearTimeout(t);
        w.terminate();
        workerOK = ok;
        resolve(ok);
      };
      const t = setTimeout(() => done(false), PROBE_MS);
      w.onmessage = () => done(true);
      w.onerror = () => done(false);
      w.postMessage('ping');
    } catch {
      workerOK = false;
      resolve(false);
    }
  });
}

/** The main-thread fallback: the same worker source evaluated in a sandbox object. Needs eval, which the page
 * CSP blocks; the caller handles the error the same way as a compile error. */
async function runOnMain(job: RunJob): Promise<RunOutcome> {
  if (!mainRun) {
    const source = await fetch(WORKER_URL).then((r) => r.text());
    const sandbox: WorkerGlobal & { last: unknown } = {
      onmessage: null,
      postMessage: (data) => {
        sandbox.last = data;
      },
      last: null,
    };
    new Function('self', source)(sandbox);
    mainRun = (j) => {
      sandbox.onmessage?.({ data: j });
      return sandbox.last as RunOutcome;
    };
  }
  return mainRun({ ...job, type: 'run' });
}

export async function runCode(job: RunJob, limitMs = RUN_MS): Promise<RunOutcome> {
  if (await probeWorker()) {
    return new Promise((resolve) => {
      const w = new Worker(WORKER_URL);
      const t = setTimeout(() => {
        w.terminate();
        resolve({
          error: 'timeout',
          message: `Stopped after ${limitMs / 1000} s: probably an infinite loop (check the loop condition and that pointers move).`,
        });
      }, limitMs);
      w.onmessage = (e) => {
        clearTimeout(t);
        w.terminate();
        resolve(e.data as RunOutcome);
      };
      w.onerror = (e) => {
        clearTimeout(t);
        w.terminate();
        resolve({ error: 'compile', message: e.message });
      };
      w.postMessage({ ...job, type: 'run' });
    });
  }
  try {
    return await runOnMain(job);
  } catch (e) {
    return { error: 'compile', message: String((e as Error).message || e) };
  }
}
