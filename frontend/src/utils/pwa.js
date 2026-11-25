import { useState, useEffect } from 'react';

const STANDALONE_DISPLAY_MODES = [
  '(display-mode: standalone)',
  '(display-mode: minimal-ui)',
  '(display-mode: window-controls-overlay)',
];

/**
 * Returns true when running inside the installed PWA / standalone app window
 * rather than inside a regular browser tab.
 */
export const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;

  const matchesDisplayMode =
    typeof window.matchMedia === 'function' &&
    STANDALONE_DISPLAY_MODES.some((query) => window.matchMedia(query).matches);

  const isIosStandalone = window.navigator?.standalone === true;
  const isAndroidTwa =
    typeof document !== 'undefined' && document.referrer.startsWith('android-app://');

  return Boolean(matchesDisplayMode || isIosStandalone || isAndroidTwa);
};

/**
 * React hook that reactively tracks whether the app is running in standalone mode,
 * updating immediately if a browser tab transitions into an installed app window.
 */
export const useIsStandaloneApp = () => {
  const [isStandalone, setIsStandalone] = useState(isStandaloneApp);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const updateStandalone = () => setIsStandalone(isStandaloneApp());
    updateStandalone();

    const mediaQueries = STANDALONE_DISPLAY_MODES.map((query) => window.matchMedia(query));
    mediaQueries.forEach((mq) => {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', updateStandalone);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(updateStandalone);
      }
    });

    return () => {
      mediaQueries.forEach((mq) => {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', updateStandalone);
        } else if (typeof mq.removeListener === 'function') {
          mq.removeListener(updateStandalone);
        }
      });
    };
  }, []);

  return isStandalone;
};
