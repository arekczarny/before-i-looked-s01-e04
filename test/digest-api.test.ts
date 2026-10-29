import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: 'runs',
};

describe('GET /api/digest/:night', () => {
  it('returns the same jobs in the same order as the digest page for 2026-10-28', async () => {
    const app = createApp(config);
    const expected = readNight('runs', '2026-10-28');
    expect(expected).not.toBeNull();

    const apiRes = await app.request('/api/digest/2026-10-28');
    expect(apiRes.status).toBe(200);
    expect(await apiRes.json()).toEqual(expected);

    const pageRes = await app.request('/digest/2026-10-28');
    expect(pageRes.status).toBe(200);
    const html = await pageRes.text();

    let lastIndex = -1;
    for (const row of expected!.rows) {
      const idx = html.indexOf(`<td>${row.job}</td>`, lastIndex + 1);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it('returns 404 when the night file is missing', async () => {
    const res = await createApp(config).request('/api/digest/2099-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not found');
  });
});
