export function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
  try {
    return window.localStorage.getItem('astra_debug_ui') === '1';
  } catch {
    return false;
  }
}
