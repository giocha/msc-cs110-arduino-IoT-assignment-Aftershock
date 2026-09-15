import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

const COUNTDOWN_SECONDS = 10;

type Props = {
  visible: boolean;
  peakG: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function IncidentAlertModal({ visible, peakG, onCancel, onConfirm }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    if (!visible) return;

    let remaining = COUNTDOWN_SECONDS;
    const showInitial = setTimeout(() => setSecondsLeft(remaining), 0);

    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        onConfirmRef.current();
        return;
      }
      setSecondsLeft(remaining);
    }, 1000);

    return () => {
      clearTimeout(showInitial);
      clearInterval(interval);
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center gap-6 bg-background/95 px-8">
        <Text className="text-center text-2xl font-bold text-foreground">Are you OK?</Text>
        <Text className="text-center text-muted">
          A possible impact was detected ({peakG.toFixed(2)}g). Reporting in {secondsLeft}s unless
          you cancel.
        </Text>
        <Pressable onPress={onCancel} className="rounded-full bg-accent px-6 py-3 active:opacity-70">
          <Text className="text-base font-semibold text-background">Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
