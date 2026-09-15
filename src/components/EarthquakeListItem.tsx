import { Text, View } from 'react-native';

import type { Earthquake } from '../hooks/useEarthquakes';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function magnitudeClassName(magnitude: number): string {
  if (magnitude >= 5) return 'bg-accent';
  if (magnitude >= 3) return 'bg-foreground';
  return 'bg-muted';
}

export function EarthquakeListItem({ earthquake }: { earthquake: Earthquake }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-foreground/10 px-4 py-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${magnitudeClassName(earthquake.magnitude)}`}>
        <Text className="text-xs font-bold text-background">{earthquake.magnitude.toFixed(1)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">{earthquake.place}</Text>
        <Text className="text-xs text-muted">
          {formatTime(earthquake.time)} · {earthquake.depthKm.toFixed(0)} km deep
        </Text>
      </View>
    </View>
  );
}
