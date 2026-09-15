import { StatusBar } from 'expo-status-bar';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import './global.css';
import { EarthquakeListItem } from './src/components/EarthquakeListItem';
import { IncidentAlertModal } from './src/components/IncidentAlertModal';
import { IncidentHistory } from './src/components/IncidentHistory';
import { SensorPanel } from './src/components/SensorPanel';
import { useAccelerometer } from './src/hooks/useAccelerometer';
import { useEarthquakes } from './src/hooks/useEarthquakes';
import { useImpactDetector } from './src/hooks/useImpactDetector';
import { useIncidentReporter } from './src/hooks/useIncidentReporter';
import { useLocation } from './src/hooks/useLocation';
import { useRemoteThreshold } from './src/hooks/useRemoteThreshold';

export default function App() {
  const location = useLocation();
  const earthquakes = useEarthquakes(location.coordinates);
  const accelerometer = useAccelerometer();
  const thresholdG = useRemoteThreshold();
  const impact = useImpactDetector(thresholdG);
  const { incidents, reportIncident } = useIncidentReporter();

  const loading = location.loading || earthquakes.loading;
  const errorMessage = location.error ?? earthquakes.error;

  function handleRefresh() {
    if (location.permissionBlocked) {
      Linking.openSettings();
      return;
    }
    location.refresh();
    earthquakes.refresh();
  }

  function handleConfirmIncident() {
    reportIncident({
      peakG: impact.peakG,
      latitude: location.coordinates?.latitude ?? null,
      longitude: location.coordinates?.longitude ?? null,
      accuracy: location.coordinates?.accuracy ?? null,
    });
    impact.reset();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-xl font-bold text-foreground">Aftershock</Text>
        <Text className="text-xs text-muted">Personal Safety Companion with IoT Base Station</Text>
      </View>

      <View className="flex-row items-center justify-between border-b border-foreground/10 px-4 py-3">
        <Text className="text-xs text-muted">Impact sensitivity: {thresholdG.toFixed(2)}g</Text>
        <Pressable
          onPress={impact.simulate}
          className="rounded-full border border-accent px-4 py-2 active:opacity-70">
          <Text className="text-sm font-medium text-accent">Simulate Incident</Text>
        </Pressable>
      </View>

      <IncidentHistory incidents={incidents} />

      <SensorPanel accelerometer={accelerometer} />

      <IncidentAlertModal
        visible={impact.status === 'detected'}
        peakG={impact.peakG}
        onCancel={impact.reset}
        onConfirm={handleConfirmIncident}
      />

      <View className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-xs font-medium uppercase tracking-wide text-muted">
            Nearby Earthquakes
          </Text>
          {location.coordinates && (
            <Text className="pt-1 text-xs text-muted">
              {location.coordinates.latitude.toFixed(4)}, {location.coordinates.longitude.toFixed(4)}
              {location.coordinates.accuracy != null &&
                ` · accuracy ±${location.coordinates.accuracy.toFixed(0)}m`}
            </Text>
          )}
        </View>
        <Pressable
          onPress={handleRefresh}
          className="rounded-full bg-accent px-4 py-2 active:opacity-70">
          <Text className="text-sm font-medium text-background">Refresh</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-center text-muted">
            {errorMessage}
            {location.permissionBlocked && ' You can grant it from your device settings.'}
          </Text>
          <Pressable
            onPress={handleRefresh}
            className="rounded-full bg-accent px-4 py-2 active:opacity-70">
            <Text className="text-sm font-medium text-background">
              {location.permissionBlocked ? 'Open Settings' : 'Retry'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={earthquakes.earthquakes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EarthquakeListItem earthquake={item} />}
          refreshing={loading}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center px-6 py-12">
                <Text className="text-center text-muted">No nearby earthquakes found.</Text>
              </View>
            ) : null
          }
        />
      )}

      <StatusBar style="light" />
    </SafeAreaView>
  );
}
