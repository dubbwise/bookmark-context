function isLoadableFaviconUrl(candidate: string): boolean {
  try {
    const { protocol } = new URL(candidate);
    return protocol === "http:" || protocol === "https:" || protocol === "data:";
  } catch {
    return false;
  }
}

export function getFaviconCandidates(url: string, stored = ""): string[] {
  const candidates: string[] = [];
  const trimmed = stored.trim();
  if (trimmed && isLoadableFaviconUrl(trimmed)) candidates.push(trimmed);
  try {
    const parsed = new URL(url);
    candidates.push(`${parsed.origin}/favicon.ico`);
    candidates.push(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`,
    );
  } catch {
    // invalid url
  }
  return [...new Set(candidates)];
}

/** Canonical key for deduplicating favicons (first loadable candidate). */
export function getFaviconKey(url: string, faviconUrl = ""): string {
  return getFaviconCandidates(url, faviconUrl)[0] ?? "";
}
