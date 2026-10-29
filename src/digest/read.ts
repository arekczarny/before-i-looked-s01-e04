import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest } from './types.js';

type JobStatus = DigestRow['lastStatus'];

type LogEvent = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

function isStatus(v: unknown): v is JobStatus {
  return v === 'ok' || v === 'retry' || v === 'fail';
}

function parseLine(line: string): LogEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || !isStatus(o.status)) {
    return null;
  }
  if (!(o.owner === null || typeof o.owner === 'string')) return null;
  if (o.error !== undefined && typeof o.error !== 'string') return null;
  const event: LogEvent = {
    at: o.at,
    job: o.job,
    status: o.status,
    owner: o.owner,
  };
  if (typeof o.error === 'string') event.error = o.error;
  return event;
}

/**
 * Read `runsDir/<night>.jsonl` into one row per job, sorted by job.
 * Returns `null` when the night's file does not exist.
 * Bad lines are counted, never thrown. Keep the log's time offsets.
 */
export function readNight(runsDir: string, night: string): NightDigest | null {
  const path = join(runsDir, `${night}.jsonl`);
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  const counts = { ok: 0, retry: 0, fail: 0 };

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const event = parseLine(line);
    if (!event) {
      badLines += 1;
      continue;
    }
    counts[event.status] += 1;
    const existing = byJob.get(event.job);
    if (!existing) {
      byJob.set(event.job, {
        job: event.job,
        owner: event.owner,
        runs: 1,
        retries: event.status === 'retry' ? 1 : 0,
        lastStatus: event.status,
        lastError: event.error ?? null,
        firstAt: event.at,
        lastAt: event.at,
      });
      continue;
    }
    existing.runs += 1;
    if (event.status === 'retry') existing.retries += 1;
    existing.owner = event.owner;
    existing.lastStatus = event.status;
    existing.lastError = event.error ?? null;
    existing.lastAt = event.at;
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines, counts };
}
