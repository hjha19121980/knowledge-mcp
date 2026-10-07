export function chunkText(text: string, chunkSize = 1_000, overlap = 200): string[] {
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || !Number.isInteger(overlap) || overlap < 0 || overlap >= chunkSize) {
    throw new Error("Chunk size must be positive and overlap must be non-negative and smaller than chunk size");
  }
  const normalized = text.trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let start = 0; start < normalized.length; start += chunkSize - overlap) {
    const chunk = normalized.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}
