/**
 * perf-sampler.js - paste-into-console frame-time and long-task sampler.
 *
 * No imports, no dependencies, nothing left behind: the requestAnimationFrame loop,
 * the PerformanceObserver, the visibility listener and the safety timer are all removed
 * before the result is returned.
 *
 * Usage
 *   1. Open the page (measure the `vite preview` build, not `npm run dev`).
 *   2. Optionally set the duration before running (default 30000 ms):
 *        window.__PERF_SAMPLER_MS__ = 10000
 *   3. Paste this whole file into the DevTools console (or run it with Playwright's
 *      `page.evaluate(fileContents)` / a browser `javascript_tool`). It evaluates to a
 *      Promise that resolves with the result object after the duration has elapsed.
 *        const result = await <paste>;   // or just paste and expand the Promise
 *
 * Result (JSON-serialisable; `JSON.stringify(result)` works):
 *   frames        number of measured frame intervals (rAF callbacks after the first)
 *   durationMs    wall time covered by those frames (rAF timestamps, first to last)
 *   fpsAvg        frames / duration
 *   p50Ms/p95Ms/maxMs   frame interval percentiles (nearest rank) and maximum, in ms
 *   over33ms      { count, pct } frame intervals longer than 33 ms (dropped 60 Hz frames)
 *   longTasks     { supported, count, totalMs, maxMs } main-thread tasks over 50 ms
 *   visibility    document.visibilityState at the end of the run
 *   visibilityAtStart, hiddenDuringRun   a hidden tab throttles rAF: discard such runs
 *   requestedMs, endedBy ('complete' | 'timeout'), startedAt (ISO), userAgent
 *
 * Caveats: intervals are display-synchronised, so a 120 Hz display reports ~8.3 ms frames;
 * compare numbers only against runs from the same machine, browser, viewport and DPR.
 */
(() => {
  const requestedMs = Number(globalThis.__PERF_SAMPLER_MS__) > 0 ? Number(globalThis.__PERF_SAMPLER_MS__) : 30000;
  const SLOW_FRAME_MS = 33;
  const SAFETY_MS = requestedMs + 5000; // rAF stops entirely in a hidden tab; never hang

  const round = (n) => Math.round(n * 100) / 100;
  const percentile = (sorted, p) =>
    sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];

  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const visibilityAtStart = document.visibilityState;
    let hiddenDuringRun = visibilityAtStart === 'hidden';

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenDuringRun = true;
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Long tasks: count only those that start inside the sampling window.
    const longTasks = { supported: false, count: 0, totalMs: 0, maxMs: 0 };
    let observer = null;
    let windowStart = 0; // performance.now() of the first sampled frame
    try {
      if (
        typeof PerformanceObserver !== 'undefined' &&
        (PerformanceObserver.supportedEntryTypes || []).includes('longtask')
      ) {
        longTasks.supported = true;
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (windowStart === 0 || entry.startTime < windowStart) continue;
            longTasks.count += 1;
            longTasks.totalMs += entry.duration;
            longTasks.maxMs = Math.max(longTasks.maxMs, entry.duration);
          }
        });
        observer.observe({ type: 'longtask' });
      }
    } catch {
      longTasks.supported = false;
      observer = null;
    }

    const intervals = [];
    let firstTs = 0;
    let prevTs = 0;
    let rafId = 0;
    let safetyTimer = 0;
    let done = false;

    const finish = (endedBy) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(rafId);
      clearTimeout(safetyTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) {
        // Pick up entries queued but not yet delivered, then stop observing.
        try {
          for (const entry of observer.takeRecords()) {
            if (windowStart === 0 || entry.startTime < windowStart) continue;
            longTasks.count += 1;
            longTasks.totalMs += entry.duration;
            longTasks.maxMs = Math.max(longTasks.maxMs, entry.duration);
          }
        } catch {
          /* observer already gone */
        }
        observer.disconnect();
      }

      const sorted = intervals.slice().sort((a, b) => a - b);
      const durationMs = prevTs - firstTs;
      const slow = sorted.filter((v) => v > SLOW_FRAME_MS).length;
      resolve({
        frames: intervals.length,
        durationMs: round(durationMs),
        fpsAvg: durationMs > 0 ? round((intervals.length / durationMs) * 1000) : 0,
        p50Ms: round(percentile(sorted, 50)),
        p95Ms: round(percentile(sorted, 95)),
        maxMs: round(sorted.length ? sorted[sorted.length - 1] : 0),
        over33ms: {
          count: slow,
          pct: sorted.length ? round((slow / sorted.length) * 100) : 0,
        },
        longTasks: {
          supported: longTasks.supported,
          count: longTasks.count,
          totalMs: round(longTasks.totalMs),
          maxMs: round(longTasks.maxMs),
        },
        visibility: document.visibilityState,
        visibilityAtStart,
        hiddenDuringRun,
        requestedMs,
        endedBy,
        startedAt,
        userAgent: navigator.userAgent,
      });
    };

    const tick = (ts) => {
      if (done) return;
      if (firstTs === 0) {
        firstTs = ts;
        windowStart = performance.now();
      } else {
        intervals.push(ts - prevTs);
      }
      prevTs = ts;
      if (ts - firstTs >= requestedMs) {
        finish('complete');
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    safetyTimer = setTimeout(() => finish('timeout'), SAFETY_MS);
    rafId = requestAnimationFrame(tick);
  });
})();
