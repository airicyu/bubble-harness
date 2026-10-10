const TRUNCATION_SUFFIX = '\n...[truncated]';

export function truncateUtf8(text: string, maxBytes: number): string {
  const suffixBytes = new TextEncoder().encode(TRUNCATION_SUFFIX).length;
  const limit = Math.max(0, maxBytes - suffixBytes);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) {
    return text;
  }
  let end = limit;
  while (end > 0) {
    const slice = bytes.slice(0, end);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(slice) + TRUNCATION_SUFFIX;
    } catch {
      end -= 1;
    }
  }
  return TRUNCATION_SUFFIX.trimStart();
}

export function stringifyToolResult(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}
