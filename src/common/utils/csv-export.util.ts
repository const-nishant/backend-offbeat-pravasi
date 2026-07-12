export function toCsv(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  if (rows.length === 0) return '';

  const headers = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines: string[] = [];
  lines.push(headers.join(','));

  for (const row of rows) {
    const vals = headers.map((h) => escape(row[h]));
    lines.push(vals.join(','));
  }

  return lines.join('\n');
}
