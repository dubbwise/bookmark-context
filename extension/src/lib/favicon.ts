export function getFaviconCandidates(url: string, stored = ""): string[] {
  const candidates: string[] = [];
  if (stored.trim()) candidates.push(stored.trim());
  try {
    const { origin } = new URL(url);
    candidates.push(`${origin}/favicon.ico`);
  } catch {
    // invalid url
  }
  return [...new Set(candidates)];
}
