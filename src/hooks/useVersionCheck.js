import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// The build the running bundle came from. Baked in at export time by the
// deploy workflow (EXPO_PUBLIC_APP_VERSION = commit SHA). Empty in local dev.
const CURRENT_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || null;

// Where the deploy writes the live version marker. Matches the GitHub Pages
// subpath (baseUrl "/gymmate"); the query string defeats any CDN/browser cache.
const VERSION_URL = '/gymmate/version.json';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 min while open

// Returns true once the deployed version differs from this running build.
// Web-only and self-disabling: no-op on native, or when there's no baked
// version (local dev) so it never nags during development.
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !CURRENT_VERSION) return;

    let cancelled = false;

    async function check() {
      if (cancelled || updateAvailable) return;
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!cancelled && version && version !== CURRENT_VERSION) {
          setUpdateAvailable(true);
        }
      } catch {
        // Offline or marker missing — ignore; we'll try again next tick.
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [updateAvailable]);

  return updateAvailable;
}

// Hard reload to pull the new index.html + freshly-hashed bundle.
export function reloadForUpdate() {
  if (Platform.OS === 'web') window.location.reload();
}
