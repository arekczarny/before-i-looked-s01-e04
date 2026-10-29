import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const OK_NIGHT = '2026-10-28';
const EMPTY_NIGHT = '2026-10-27';
const BAD_NIGHT = '2026-10-26';
const MISSING_NIGHT = '2099-01-01';

const GOOD_LINES = [
  '{"at":"2026-10-28T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-28T02:00:00+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"timeout"}',
  '{"at":"2026-10-28T03:00:00+01:00","job":"notes/backup","status":"fail","owner":null,"error":"quota exceeded"}',
];

let runsDir: string;
let config: { adapter: string; installed: string; beatEverySeconds: number; runsDir: string };

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, `${OK_NIGHT}.jsonl`), GOOD_LINES.join('\n') + '\n');
  writeFileSync(join(runsDir, `${EMPTY_NIGHT}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD_NIGHT}.jsonl`),
    [GOOD_LINES[0], 'this is not json', GOOD_LINES[2]].join('\n') + '\n',
  );
  config = {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders one row per job for a night with events', async () => {
    const res = await createApp(config).request(`/digest/${OK_NIGHT}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<td>lane/sync</td>');
    expect(html).toContain('<td>notes/backup</td>');
    expect(html).toContain('<td>—</td>');
    expect(html).not.toContain('bad lines');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request(`/digest/${MISSING_NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not found');
  });

  it('says "nothing ran" for an empty night file', async () => {
    const res = await createApp(config).request(`/digest/${EMPTY_NIGHT}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('<table>');
  });

  it('counts unparseable lines and still renders the good rows', async () => {
    const res = await createApp(config).request(`/digest/${BAD_NIGHT}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<td>lane/sync</td>');
    expect(html).toContain('<td>notes/backup</td>');
    expect(html).toContain('bad lines: 1');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON with its rows', async () => {
    const res = await createApp(config).request(`/api/digest/${OK_NIGHT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      night: OK_NIGHT,
      badLines: 0,
      counts: { ok: 1, retry: 1, fail: 1 },
    });
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request(`/api/digest/${MISSING_NIGHT}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not found');
  });

  it('returns empty rows for an empty night file', async () => {
    const res = await createApp(config).request(`/api/digest/${EMPTY_NIGHT}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      night: EMPTY_NIGHT,
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('counts unparseable lines without failing the request', async () => {
    const res = await createApp(config).request(`/api/digest/${BAD_NIGHT}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });
});
