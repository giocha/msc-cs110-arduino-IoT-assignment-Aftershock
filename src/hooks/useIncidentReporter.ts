import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { NODE_RED_BASE_URL } from '../config';

export type Incident = {
  id: string;
  timestamp: string;
  peakG: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  sent: boolean;
};

type ReportParams = {
  peakG: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

const STORAGE_KEY = 'aftershock.incidents';
const RETRY_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 8000;

async function loadIncidents(): Promise<Incident[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveIncidents(incidents: Incident[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
}

async function postIncident(incident: Incident): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${NODE_RED_BASE_URL}/aftershock/felt-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'phone',
        latitude: incident.latitude,
        longitude: incident.longitude,
        accuracy: incident.accuracy,
        peakG: incident.peakG,
        timestamp: incident.timestamp,
      }),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function useIncidentReporter() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function retry() {
      const current = await loadIncidents();
      if (cancelled) return;
      setIncidents(current);

      const pending = current.filter((incident) => !incident.sent);
      if (pending.length === 0) return;

      let changed = false;
      for (const incident of pending) {
        if (await postIncident(incident)) {
          incident.sent = true;
          changed = true;
        }
      }
      if (cancelled || !changed) return;

      await saveIncidents(current);
      setIncidents([...current]);
    }

    retry();
    const interval = setInterval(retry, RETRY_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const reportIncident = useCallback(async (params: ReportParams) => {
    const incident: Incident = {
      id: `${Date.now()}`,
      timestamp: new Date().toISOString(),
      sent: false,
      ...params,
    };

    const current = await loadIncidents();
    current.unshift(incident);
    await saveIncidents(current);
    setIncidents([...current]);

    if (await postIncident(incident)) {
      incident.sent = true;
      await saveIncidents(current);
      setIncidents([...current]);
    }
  }, []);

  return { incidents, reportIncident };
}
