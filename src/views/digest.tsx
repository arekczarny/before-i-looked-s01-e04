import type { DigestRow, NightDigest } from '../digest/types.js';

function cell(value: string | null | undefined): string {
  return value == null || value === '' ? '—' : value;
}

function rowClass(row: DigestRow): string | undefined {
  if (row.lastStatus === 'fail' || row.retries >= 3) return 'warn';
  return undefined;
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {digest.night}</h1>
        <p class="mute">nothing ran</p>
        {digest.badLines > 0 ? <p class="mute">bad lines: {digest.badLines}</p> : null}
      </>
    );
  }

  return (
    <>
      <h1>digest · {digest.night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr class={rowClass(row)}>
              <td>{row.job}</td>
              <td>{cell(row.owner)}</td>
              <td>{row.runs}</td>
              <td>{row.retries}</td>
              <td>{row.lastStatus}</td>
              <td>{cell(row.lastError)}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {digest.badLines > 0 ? <p class="mute">bad lines: {digest.badLines}</p> : null}
    </>
  );
}
