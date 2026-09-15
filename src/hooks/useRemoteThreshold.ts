import { useEffect, useState } from 'react';

import { NODE_RED_BASE_URL } from '../config';
import { DEFAULT_THRESHOLD_G } from './useImpactDetector';

const POLL_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 8000;

export function useRemoteThreshold(): number {
  const [thresholdG, setThresholdG] = useState(DEFAULT_THRESHOLD_G);

  useEffect(() => {
    let cancelled = false;

    async function fetchThreshold() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${NODE_RED_BASE_URL}/aftershock/config`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && typeof data.thresholdG === 'number') {
          setThresholdG(data.thresholdG);
        }
      } catch {
        // Keep the last known threshold if Node-RED is unreachable.
      } finally {
        clearTimeout(timeout);
      }
    }

    fetchThreshold();
    const interval = setInterval(fetchThreshold, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return thresholdG;
}
