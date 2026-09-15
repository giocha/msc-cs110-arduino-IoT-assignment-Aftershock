import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

export const DEFAULT_THRESHOLD_G = 2.5;

type ImpactState = {
  status: 'idle' | 'detected';
  peakG: number;
};

export function useImpactDetector(thresholdG: number) {
  const [state, setState] = useState<ImpactState>({ status: 'idle', peakG: 0 });
  const armedRef = useRef(true);
  const thresholdRef = useRef(thresholdG);

  useEffect(() => {
    thresholdRef.current = thresholdG;
  }, [thresholdG]);

  useEffect(() => {
    const subscription = Accelerometer.addListener((measurement) => {
      if (!armedRef.current) return;
      const magnitude = Math.hypot(measurement.x, measurement.y, measurement.z);
      if (magnitude >= thresholdRef.current) {
        armedRef.current = false;
        setState({ status: 'detected', peakG: magnitude });
      }
    });
    return () => subscription.remove();
  }, []);

  function reset() {
    armedRef.current = true;
    setState({ status: 'idle', peakG: 0 });
  }

  function simulate() {
    armedRef.current = false;
    setState({ status: 'detected', peakG: thresholdRef.current + 0.5 });
  }

  return { ...state, reset, simulate };
}
