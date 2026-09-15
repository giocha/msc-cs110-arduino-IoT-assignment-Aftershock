import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type UseLocationResult = {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  permissionBlocked: boolean;
  refresh: () => void;
};

export function useLocation(): UseLocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      setLoading(true);
      setError(null);
      setPermissionBlocked(false);

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setError('Location permission was denied.');
        setPermissionBlocked(!canAskAgain);
        setLoading(false);
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      } catch {
        if (cancelled) return;
        setError('Could not determine your location.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocation();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const refresh = useCallback(() => setRequestId((id) => id + 1), []);

  return { coordinates, loading, error, permissionBlocked, refresh };
}
