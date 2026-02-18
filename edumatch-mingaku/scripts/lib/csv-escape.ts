/**
 * CSV フィールドのエスケープ（RFC 4180 風）
 */
export function escapeCsvField(value: string): string {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(',')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
