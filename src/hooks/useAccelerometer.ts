import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useState } from 'react';

const UPDATE_INTERVAL_MS = 100;

export function useAccelerometer(): AccelerometerMeasurement {
  const [measurement, setMeasurement] = useState<AccelerometerMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });

  useEffect(() => {
    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(setMeasurement);
    return () => subscription.remove();
  }, []);

  return measurement;
}
