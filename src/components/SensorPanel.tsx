import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../theme/colors';

const TILT_THRESHOLD = 0.3;
const FACE_THRESHOLD = 0.7;
const PANEL_HEIGHT = 160;
const LINE_COUNT = 18;
const LINE_STEPS = 28;
const BASE_RADIUS = 14;
const MAX_RADIUS = 34;

type Accelerometer = { x: number; y: number; z: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function describeOrientation({ x, z }: Accelerometer): string {
  if (z > FACE_THRESHOLD) return 'Face up';
  if (z < -FACE_THRESHOLD) return 'Face down';
  if (x < -TILT_THRESHOLD) return 'Tilted right';
  if (x > TILT_THRESHOLD) return 'Tilted left';
  return 'Level';
}

function buildLinePath(x0: number, coreX: number, coreY: number, radius: number): string {
  const points: [number, number][] = [];
  for (let step = 0; step <= LINE_STEPS; step++) {
    const y = (step / LINE_STEPS) * PANEL_HEIGHT;
    const dx = x0 - coreX;
    const dy = y - coreY;
    const bend = (radius * radius * dx) / (dx * dx + dy * dy + radius * radius);
    points.push([x0 + bend, y]);
  }
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

export function SensorPanel({ accelerometer }: { accelerometer: Accelerometer }) {
  const [width, setWidth] = useState(0);

  const state = describeOrientation(accelerometer);
  const isLevel = state === 'Level';

  const tiltMagnitude = clamp(Math.hypot(accelerometer.x, accelerometer.y), 0, 1);
  const radius = BASE_RADIUS + tiltMagnitude * (MAX_RADIUS - BASE_RADIUS);
  const coreX = width / 2 + clamp(-accelerometer.x, -1, 1) * (width / 4);
  const coreY = PANEL_HEIGHT / 2 + clamp(accelerometer.y, -1, 1) * (PANEL_HEIGHT / 4);

  const linePaths = useMemo(() => {
    if (width === 0) return [];
    return Array.from({ length: LINE_COUNT }, (_, i) => {
      const x0 = ((i + 0.5) / LINE_COUNT) * width;
      return buildLinePath(x0, coreX, coreY, radius);
    });
  }, [width, coreX, coreY, radius]);

  return (
    <View className="gap-3 border-b border-foreground/10 px-4 py-3">
      <Text className="text-xs font-medium uppercase tracking-wide text-muted">Sensor Panel</Text>

      <View style={{ height: PANEL_HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={PANEL_HEIGHT}>
            {linePaths.map((d, i) => (
              <Path
                key={i}
                d={d}
                stroke={colors.foreground}
                strokeOpacity={0.25}
                strokeWidth={1}
                fill="none"
              />
            ))}
            <Circle cx={coreX} cy={coreY} r={radius} fill={isLevel ? colors.foreground : colors.accent} />
          </Svg>
        )}
      </View>

      <View className="flex-row justify-between">
        <Text className="text-sm text-muted">x: {accelerometer.x.toFixed(2)}</Text>
        <Text className="text-sm text-muted">y: {accelerometer.y.toFixed(2)}</Text>
        <Text className="text-sm text-muted">z: {accelerometer.z.toFixed(2)}</Text>
      </View>
      <Text className="text-base font-semibold text-accent">{state}</Text>
    </View>
  );
}
