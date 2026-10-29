/** One aggregated job from a night's JSONL run log. */
export type DigestRow = {
  job: string;
  /** May be null in the log; views render null as —. */
  owner: string | null;
  /** Total events for this job. */
  runs: number;
  /** Events whose status was `retry`. */
  retries: number;
  lastStatus: 'ok' | 'retry' | 'fail';
  /** Error from the last event, if any. */
  lastError: string | null;
  /** First event's `at`, kept with the log's offset. */
  firstAt: string;
  /** Last event's `at`, kept with the log's offset. */
  lastAt: string;
};

/**
 * One night's digest. `null` from `readNight` means the file is missing (404).
 * An empty file yields `rows: []` (page says "nothing ran").
 */
export type NightDigest = {
  night: string;
  /** One row per job, sorted by job. */
  rows: DigestRow[];
  /** Lines that did not parse; counted, never thrown. */
  badLines: number;
  /** Event counts across the night (for the board). */
  counts: { ok: number; retry: number; fail: number };
};
