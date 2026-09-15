import { Text, View } from 'react-native';

import type { Incident } from '../hooks/useIncidentReporter';

export function IncidentHistory({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) return null;

  return (
    <View className="gap-2 border-b border-foreground/10 px-4 py-3">
      <Text className="text-xs font-medium uppercase tracking-wide text-muted">
        Incident History
      </Text>
      {incidents.slice(0, 5).map((incident) => (
        <View key={incident.id} className="flex-row justify-between">
          <Text className="text-sm text-muted">
            {new Date(incident.timestamp).toLocaleTimeString()} · {incident.peakG.toFixed(2)}g
          </Text>
          <Text className="text-sm text-accent">{incident.sent ? 'Sent' : 'Pending'}</Text>
        </View>
      ))}
    </View>
  );
}
