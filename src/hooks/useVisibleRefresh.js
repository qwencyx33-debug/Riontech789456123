import { useEffect, useRef } from 'react';

export function useVisibleRefresh(refresh, intervalMs = 60000) {
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        Promise.resolve(refreshRef.current()).catch((error) => {
          console.error('Background data refresh failed:', error);
        });
      }
    };

    const interval = window.setInterval(refreshIfVisible, intervalMs);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [intervalMs]);
}
