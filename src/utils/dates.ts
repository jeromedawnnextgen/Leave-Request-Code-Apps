/** Converts "2026-03-17" → "3/17/2026" */
export function fmtDate(iso: string): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

/** "2026-03-17" – "2026-03-20" → "3/17/2026 - 3/20/2026" */
export function fmtRange(start: string, end: string): string {
  return `${fmtDate(start)} - ${fmtDate(end)}`;
}
