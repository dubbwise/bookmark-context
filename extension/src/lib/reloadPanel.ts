/** Reload the entire extension so Chrome re-reads updated files from disk (unpacked dev). */
export function reloadSidePanel(): void {
  chrome.runtime.reload();
}
