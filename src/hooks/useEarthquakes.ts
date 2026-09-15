import { useCallback, useEffect, useState } from 'react';

import type { Coordinates } from './useLocation';

export type Earthquake = {
  id: string;
  place: string;
  magnitude: number;
  time: number;
  latitude: number;
  longitude: number;
  depthKm: number;
  url: string;
};

type UsgsFeatureCollection = {
  features: {
    id: string;
    properties: {
      place: string | null;
      mag: number | null;
      time: number;
      url: string;
    };
    geometry: {
      coordinates: [number, number, number];
    };
  }[];
};

const USGS_ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const RADIUS_KM = 300;
const RESULT_LIMIT = 20;

type UseEarthquakesResult = {
  earthquakes: Earthquake[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useEarthquakes(coordinates: Coordinates | null): UseEarthquakesResult {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (!coordinates) return;

    let cancelled = false;

    async function fetchEarthquakes() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        format: 'geojson',
        latitude: String(coordinates!.latitude),
        longitude: String(coordinates!.longitude),
        maxradiuskm: String(RADIUS_KM),
        limit: String(RESULT_LIMIT),
        orderby: 'time',
      });

      try {
        const response = await fetch(`${USGS_ENDPOINT}?${params.toString()}`);
        if (!response.ok) throw new Error(`USGS request failed with status ${response.status}`);

        const data: UsgsFeatureCollection = await response.json();
        if (cancelled) return;

        setEarthquakes(
          data.features.map((feature) => ({
            id: feature.id,
            place: feature.properties.place ?? 'Unknown location',
            magnitude: feature.properties.mag ?? 0,
            time: feature.properties.time,
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
            depthKm: feature.geometry.coordinates[2],
            url: feature.properties.url,
          }))
        );
      } catch {
        if (cancelled) return;
        setError('Could not load nearby earthquakes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEarthquakes();

    return () => {
      cancelled = true;
    };
  }, [coordinates, requestId]);

  const refresh = useCallback(() => setRequestId((id) => id + 1), []);

  return { earthquakes, loading, error, refresh };
}
